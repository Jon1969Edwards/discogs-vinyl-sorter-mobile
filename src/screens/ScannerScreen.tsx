/**
 * Album scanner – barcode, catalog number, and cover (OCR → Discogs search).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import {
  CameraView,
  useCameraPermissions,
  scanFromURLAsync,
  type BarcodeScanningResult,
} from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { ReleaseRow } from '../types';
import type { DiscogsSearchResult } from '../services/discogsApi';
import {
  createDiscogsClient,
  discogsUserError,
  getStoredCredentials,
  isDiscogsRateLimitError,
  searchDatabase,
} from '../services';
import { prepareCoverForOcr } from '../services/coverImage';
import { extractTextFromImages, isOcrAvailable } from '../services/coverOcr';
import {
  catnoSearchAttempts,
  coverSearchAttempts,
  dedupeSearchResults,
  extractCatnoFromOcr,
  extractCoverQuery,
  extractLikelyYear,
  normalizeBarcode,
  rankSearchResults,
  searchResultToReleaseRow,
  type CoverQuery,
  type CoverSearchParams,
} from '../utils/discogsSearch';
import { AppText } from '../components/ui/AppText';
import { Button } from '../components/ui/Button';
import { colors, radius, spacing } from '../theme';

type ScanMode = 'barcode' | 'catno' | 'cover';

const PHOTO_PICKER_OPTS: ImagePicker.ImagePickerOptions = {
  quality: 1,
  allowsEditing: true,
};

const CATNO_CAMERA_OPTS: ImagePicker.ImagePickerOptions = {
  quality: 1,
  allowsEditing: false,
};

function applyScanFailure(
  err: unknown,
  setError: (msg: string | null) => void,
  setHint: (msg: string | null) => void
) {
  if (isDiscogsRateLimitError(err)) {
    setError(null);
    setHint('Discogs was busy. Tap Search Discogs to try again.');
    return;
  }
  setHint(null);
  setError(discogsUserError(err));
}

type PickedPhoto = { uri: string; width?: number; height?: number };

type CameraPermission = {
  granted?: boolean;
};

async function pickScanPhoto(
  source: 'camera' | 'gallery',
  permission: CameraPermission | null,
  requestPermission: () => Promise<CameraPermission>,
  pickerOpts: ImagePicker.ImagePickerOptions = PHOTO_PICKER_OPTS
): Promise<PickedPhoto | null> {
  if (source === 'camera') {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert(
          'Camera permission needed',
          'Enable camera to photograph catalog numbers and covers.'
        );
        return null;
      }
    }
    const shot = await ImagePicker.launchCameraAsync(pickerOpts);
    if (shot.canceled || !shot.assets?.[0]?.uri) return null;
    const asset = shot.assets[0];
    return { uri: asset.uri, width: asset.width, height: asset.height };
  }
  const shot = await ImagePicker.launchImageLibraryAsync(pickerOpts);
  if (shot.canceled || !shot.assets?.[0]?.uri) return null;
  const asset = shot.assets[0];
  return { uri: asset.uri, width: asset.width, height: asset.height };
}

async function barcodeFromPhoto(uri: string): Promise<string | null> {
  try {
    const found = await scanFromURLAsync(uri, [
      'ean13',
      'ean8',
      'upc_a',
      'upc_e',
      'code128',
      'code39',
    ]);
    for (const hit of found || []) {
      const code = normalizeBarcode(hit.data);
      if (code.length >= 8) return code;
    }
  } catch {
    // iOS still-image scan is QR-only; Android wants a large code in frame.
  }
  return null;
}

type Props = {
  navigation: {
    navigate: (name: string, params?: object) => void;
  };
};

export function ScannerScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<ScanMode>('barcode');
  const [permission, requestPermission] = useCameraPermissions();
  const [catno, setCatno] = useState('');
  const [query, setQuery] = useState('');
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [catnoUri, setCatnoUri] = useState<string | null>(null);
  const [results, setResults] = useState<DiscogsSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const lastBarcode = useRef('');
  const scanLock = useRef(false);

  useEffect(() => {
    setResults([]);
    setError(null);
    setHint(null);
    lastBarcode.current = '';
    scanLock.current = false;
  }, [mode]);

  const runSearchAttempts = useCallback(
    async (
      attempts: CoverSearchParams[],
      cover: CoverQuery,
      extra?: { barcodeMatchedHint?: string }
    ) => {
      setError(null);
      const cred = await getStoredCredentials();
      if (!cred || cred.type === 'local') {
        setError('Discogs sign-in required to search the database.');
        setResults([]);
        return;
      }
      const client = createDiscogsClient(cred);
      let hits: DiscogsSearchResult[] = [];
      let used: CoverSearchParams | null = null;
      for (const attempt of attempts) {
        hits = await searchDatabase(client, attempt);
        if (hits.length) {
          used = attempt;
          break;
        }
      }
      const ranked = rankSearchResults(dedupeSearchResults(hits), cover);
      setResults(ranked);
      if (ranked.length === 0) {
        setHint('No Discogs matches. Try another scan or refine the text.');
      } else if (used?.barcode) {
        setHint(extra?.barcodeMatchedHint ?? 'Matched barcode.');
      } else if (used?.catno) {
        setHint(`Matched catalog number ${used.catno}.`);
      } else {
        setHint(null);
      }
    },
    []
  );

  const runSearch = useCallback(
    async (params: CoverSearchParams) => {
      setLoading(true);
      setError(null);
      setHint(null);
      try {
        await runSearchAttempts(
          [params],
          extractCoverQuery(params.query || params.catno || '')
        );
      } catch (err) {
        applyScanFailure(err, setError, setHint);
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [runSearchAttempts]
  );

  const onBarcodeScanned = useCallback(
    (scan: BarcodeScanningResult) => {
      if (mode !== 'barcode' || scanLock.current) return;
      const code = normalizeBarcode(scan.data);
      if (!code || code.length < 8) return;
      if (code === lastBarcode.current) return;
      lastBarcode.current = code;
      scanLock.current = true;
      void runSearch({ barcode: code }).finally(() => {
        setTimeout(() => {
          scanLock.current = false;
        }, 2500);
      });
    },
    [mode, runSearch]
  );

  const searchCatno = useCallback(() => {
    if (loading) return;
    const value = catno.trim();
    if (!value) {
      setError('Enter a catalog number');
      return;
    }
    setLoading(true);
    setHint('Searching Discogs…');
    void runSearchAttempts(catnoSearchAttempts({ catno: value }), {
      query: '',
      shortQuery: '',
      catno: value,
      year: null,
    })
      .catch((err: unknown) => {
        applyScanFailure(err, setError, setHint);
        setResults([]);
      })
      .finally(() => setLoading(false));
  }, [catno, loading, runSearchAttempts]);

  const searchCoverQuery = useCallback(() => {
    if (loading) return;
    const cover = extractCoverQuery(query);
    if (!cover.query && !cover.catno) {
      setError('Enter artist / title text from the cover');
      return;
    }
    setLoading(true);
    setHint('Searching Discogs…');
    void runSearchAttempts(coverSearchAttempts({ cover }), cover)
      .catch((err: unknown) => {
        applyScanFailure(err, setError, setHint);
        setResults([]);
      })
      .finally(() => setLoading(false));
  }, [query, loading, runSearchAttempts]);

  const processCoverUri = useCallback(
    async (uri: string, width?: number, height?: number) => {
      setCoverUri(uri);
      setLoading(true);
      setError(null);
      setResults([]);
      try {
        const barcode = await barcodeFromPhoto(uri);
        const ocrUris = await prepareCoverForOcr(uri, width, height);
        const ocr = await extractTextFromImages(ocrUris);
        const cover = extractCoverQuery(ocr);
        setQuery(cover.query);
        if (cover.catno && (!cover.query || cover.query.length < 8)) {
          setCatno(cover.catno);
        }

        if (!barcode && !cover.query && !cover.catno) {
          setHint(
            isOcrAvailable()
              ? 'No text found on image. Type artist / title, then search.'
              : 'On-device OCR not in this build yet. Type artist / title from the cover, then search. (Barcode mode still works live.)'
          );
          return;
        }

        const via = barcode
          ? 'barcode'
          : cover.catno
            ? `catno ${cover.catno}`
            : 'cover text';
        setHint(`Searching Discogs (${via})…`);
        await runSearchAttempts(
          coverSearchAttempts({ barcode, cover }),
          cover
        );
      } catch (err) {
        applyScanFailure(err, setError, setHint);
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [runSearchAttempts]
  );

  const processCatnoUri = useCallback(
    async (uri: string, width?: number, height?: number) => {
      setCatnoUri(uri);
      setLoading(true);
      setError(null);
      setResults([]);
      try {
        const barcode = await barcodeFromPhoto(uri);
        const ocrUris = await prepareCoverForOcr(uri, width, height);
        const ocr = await extractTextFromImages(ocrUris);
        const found = extractCatnoFromOcr(ocr);
        setCatno(found ?? '');

        if (!found && !barcode) {
          setHint(
            isOcrAvailable()
              ? 'No catalog number found. Hold closer to the number, or type it.'
              : 'On-device OCR not in this build yet. Type the catalog number, then search.'
          );
          return;
        }

        if (found) {
          setHint(`Searching Discogs (catno ${found})…`);
          await runSearchAttempts(catnoSearchAttempts({ catno: found }), {
            query: '',
            shortQuery: '',
            catno: found,
            year: extractLikelyYear(ocr.text),
          });
          return;
        }

        setHint('No catno found; searched barcode instead.');
        await runSearchAttempts(
          catnoSearchAttempts({ barcode }),
          { query: '', shortQuery: '', catno: null, year: null },
          { barcodeMatchedHint: 'No catno found; searched barcode instead.' }
        );
      } catch (err) {
        applyScanFailure(err, setError, setHint);
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [runSearchAttempts]
  );

  const takeScanPhoto = useCallback(
    async (target: 'catno' | 'cover') => {
      if (loading) return;
      const photo = await pickScanPhoto(
        'camera',
        permission,
        requestPermission,
        target === 'catno' ? CATNO_CAMERA_OPTS : PHOTO_PICKER_OPTS
      );
      if (!photo) return;
      if (target === 'catno') {
        await processCatnoUri(photo.uri, photo.width, photo.height);
      } else {
        await processCoverUri(photo.uri, photo.width, photo.height);
      }
    },
    [permission, requestPermission, processCatnoUri, processCoverUri, loading]
  );

  const pickScanGallery = useCallback(
    async (target: 'catno' | 'cover') => {
      if (loading) return;
      const photo = await pickScanPhoto('gallery', permission, requestPermission);
      if (!photo) return;
      if (target === 'catno') {
        await processCatnoUri(photo.uri, photo.width, photo.height);
      } else {
        await processCoverUri(photo.uri, photo.width, photo.height);
      }
    },
    [permission, requestPermission, processCatnoUri, processCoverUri, loading]
  );

  const openResult = useCallback(
    (hit: DiscogsSearchResult) => {
      const release: ReleaseRow = searchResultToReleaseRow(hit);
      navigation.navigate('AlbumDetail', { release });
    },
    [navigation]
  );

  const showCamera =
    mode === 'barcode' &&
    Platform.OS !== 'web' &&
    permission?.granted;

  const compactResults = results.length > 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AppText variant="title">Scan</AppText>
        <AppText variant="caption" style={styles.sub}>
          Find a release on Discogs
        </AppText>
      </View>

      <View style={styles.modeRow}>
        {(
          [
            { id: 'barcode', label: 'Barcode', icon: 'barcode-outline' },
            { id: 'catno', label: 'Cat No', icon: 'pricetag-outline' },
            { id: 'cover', label: 'Cover', icon: 'image-outline' },
          ] as const
        ).map((m) => (
          <TouchableOpacity
            key={m.id}
            style={[styles.modeChip, mode === m.id && styles.modeChipOn]}
            onPress={() => setMode(m.id)}
          >
            <Ionicons
              name={m.icon}
              size={18}
              color={mode === m.id ? colors.white : colors.textSecondary}
            />
            <AppText
              variant="bodySmall"
              style={[styles.modeLabel, mode === m.id && styles.modeLabelOn]}
            >
              {m.label}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>

      {mode === 'barcode' ? (
        <View style={styles.cameraWrap}>
          {!permission?.granted ? (
            <View style={styles.permBox}>
              <AppText variant="body" style={styles.centerText}>
                Camera access is needed to scan barcodes.
              </AppText>
              <Button title="Allow camera" onPress={() => void requestPermission()} />
            </View>
          ) : showCamera ? (
            <>
              <CameraView
                style={styles.camera}
                facing="back"
                barcodeScannerSettings={{
                  barcodeTypes: [
                    'ean13',
                    'ean8',
                    'upc_a',
                    'upc_e',
                    'code128',
                    'code39',
                    'qr',
                  ],
                }}
                onBarcodeScanned={onBarcodeScanned}
              />
              <View style={styles.cameraOverlay}>
                <AppText variant="caption" style={styles.overlayText}>
                  Point at the barcode on the sleeve or sticker
                </AppText>
              </View>
            </>
          ) : (
            <AppText variant="body" style={styles.centerText}>
              Camera unavailable on this platform.
            </AppText>
          )}
        </View>
      ) : null}

      {mode === 'catno' ? (
        <View style={styles.form}>
          {compactResults ? null : (
            <AppText variant="caption">
              Photograph the catalog number close-up on the label, spine, or
              sleeve.
            </AppText>
          )}
          <View style={styles.coverActions}>
            <Button
              title="Take photo"
              onPress={() => void takeScanPhoto('catno')}
              disabled={loading}
              style={styles.flexBtn}
            />
            <Button
              title="Gallery"
              variant="secondary"
              onPress={() => void pickScanGallery('catno')}
              disabled={loading}
              style={styles.flexBtn}
            />
          </View>
          {compactResults && catnoUri ? (
            <View style={styles.compactRow}>
              <Image
                source={{ uri: catnoUri }}
                style={styles.coverPreviewCompact}
                contentFit="cover"
              />
              <TextInput
                style={[styles.input, styles.inputFlex]}
                value={catno}
                onChangeText={setCatno}
                placeholder="Enter catno"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                autoCorrect={false}
                onSubmitEditing={searchCatno}
              />
            </View>
          ) : (
            <>
              {catnoUri ? (
                <Image
                  source={{ uri: catnoUri }}
                  style={styles.coverPreview}
                  contentFit="cover"
                />
              ) : null}
              <AppText variant="caption" style={styles.fieldLabel}>
                Catalog number (e.g. PCS 7088)
              </AppText>
              <TextInput
                style={styles.input}
                value={catno}
                onChangeText={setCatno}
                placeholder="Enter catno"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                autoCorrect={false}
                onSubmitEditing={searchCatno}
              />
            </>
          )}
          <Button title="Search Discogs" onPress={searchCatno} loading={loading} />
        </View>
      ) : null}

      {mode === 'cover' ? (
        <View style={styles.form}>
          {compactResults ? null : (
            <AppText variant="caption">
              Photograph the front with artist and title in frame. Back or spine
              works when the front has no text.
            </AppText>
          )}
          <View style={styles.coverActions}>
            <Button
              title="Take photo"
              onPress={() => void takeScanPhoto('cover')}
              disabled={loading}
              style={styles.flexBtn}
            />
            <Button
              title="Gallery"
              variant="secondary"
              onPress={() => void pickScanGallery('cover')}
              disabled={loading}
              style={styles.flexBtn}
            />
          </View>
          {compactResults && coverUri ? (
            <View style={styles.compactRow}>
              <Image
                source={{ uri: coverUri }}
                style={styles.coverPreviewCompact}
                contentFit="cover"
              />
              <TextInput
                style={[styles.input, styles.inputFlex]}
                value={query}
                onChangeText={setQuery}
                placeholder="Artist and album title"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          ) : (
            <>
              {coverUri ? (
                <Image
                  source={{ uri: coverUri }}
                  style={styles.coverPreview}
                  contentFit="cover"
                />
              ) : null}
              <AppText variant="caption" style={styles.fieldLabel}>
                Search text (from OCR or typed)
              </AppText>
              <TextInput
                style={[styles.input, styles.inputMulti]}
                value={query}
                onChangeText={setQuery}
                placeholder="Artist and album title"
                placeholderTextColor={colors.textMuted}
                multiline
              />
            </>
          )}
          <Button
            title="Search Discogs"
            onPress={searchCoverQuery}
            loading={loading}
          />
        </View>
      ) : null}

      {loading &&
      (mode === 'barcode' || mode === 'cover' || mode === 'catno') ? (
        <ActivityIndicator color={colors.accent} style={styles.inlineSpinner} />
      ) : null}

      {error ? (
        <AppText variant="bodySmall" style={styles.error}>
          {error}
        </AppText>
      ) : null}
      {hint && !error ? (
        <AppText variant="caption" style={styles.hint}>
          {hint}
        </AppText>
      ) : null}

      <FlatList
        data={results}
        style={styles.listFlex}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          results.length > 0 ? (
            <AppText variant="label" style={styles.resultsLabel}>
              Results ({results.length})
            </AppText>
          ) : null
        }
        renderItem={({ item }) => {
          const row = searchResultToReleaseRow(item);
          return (
            <TouchableOpacity
              style={styles.row}
              onPress={() => openResult(item)}
              activeOpacity={0.7}
            >
              {row.thumb_url ? (
                <Image
                  source={{ uri: row.thumb_url }}
                  style={styles.thumb}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.thumb, styles.thumbPh]} />
              )}
              <View style={styles.rowText}>
                <AppText variant="body" style={styles.artist} numberOfLines={1}>
                  {row.artist_display}
                </AppText>
                <AppText variant="bodySmall" numberOfLines={1}>
                  {row.title}
                </AppText>
                <AppText variant="caption" numberOfLines={1}>
                  {[row.year, row.catno, row.format_str].filter(Boolean).join(' · ')}
                </AppText>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  sub: { marginTop: 2 },
  modeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  modeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    minHeight: 44,
  },
  modeChipOn: { backgroundColor: colors.accent },
  modeLabel: { color: colors.textSecondary, fontWeight: '600' },
  modeLabelOn: { color: colors.white },
  cameraWrap: {
    height: 220,
    marginHorizontal: spacing.lg,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  camera: { flex: 1 },
  cameraOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  overlayText: { color: colors.textPrimary, textAlign: 'center' },
  permBox: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  centerText: { textAlign: 'center' },
  form: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: 16,
  },
  inputMulti: { minHeight: 72, textAlignVertical: 'top' },
  inputFlex: { flex: 1 },
  coverActions: { flexDirection: 'row', gap: spacing.sm },
  flexBtn: { flex: 1 },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  coverPreview: {
    width: '100%',
    height: 160,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  coverPreviewCompact: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  fieldLabel: { marginTop: spacing.xs },
  inlineSpinner: { marginVertical: spacing.sm },
  error: {
    color: colors.accent,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  hint: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  listFlex: { flex: 1 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, flexGrow: 1 },
  resultsLabel: { marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  thumb: { width: 48, height: 48, borderRadius: radius.sm },
  thumbPh: { backgroundColor: colors.surface },
  rowText: { flex: 1, marginLeft: spacing.md, justifyContent: 'center' },
  artist: { fontWeight: '600', color: colors.textPrimary },
});
