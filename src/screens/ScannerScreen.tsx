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
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { ReleaseRow } from '../types';
import type { DiscogsSearchResult } from '../services/discogsApi';
import {
  createDiscogsClient,
  getStoredCredentials,
  searchDatabase,
} from '../services';
import { extractTextFromImage, isOcrAvailable } from '../services/coverOcr';
import {
  extractLikelyCatno,
  normalizeBarcode,
  queryFromOcrText,
  searchResultToReleaseRow,
} from '../utils/discogsSearch';
import { AppText } from '../components/ui/AppText';
import { Button } from '../components/ui/Button';
import { colors, radius, spacing } from '../theme';

type ScanMode = 'barcode' | 'catno' | 'cover';

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

  const runSearch = useCallback(
    async (params: { barcode?: string; catno?: string; query?: string }) => {
      setLoading(true);
      setError(null);
      setHint(null);
      try {
        const cred = await getStoredCredentials();
        if (!cred || cred.type === 'local') {
          setError('Discogs sign-in required to search the database.');
          setResults([]);
          return;
        }
        const client = createDiscogsClient(cred);
        const hits = await searchDatabase(client, params);
        setResults(hits);
        if (hits.length === 0) {
          setHint('No Discogs matches. Try another scan or refine the text.');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    []
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
    const value = catno.trim();
    if (!value) {
      setError('Enter a catalog number');
      return;
    }
    void runSearch({ catno: value });
  }, [catno, runSearch]);

  const searchCoverQuery = useCallback(() => {
    const q = query.trim();
    const maybeCat = extractLikelyCatno(q);
    if (maybeCat && q.length < 20) {
      void runSearch({ catno: maybeCat });
      return;
    }
    if (!q) {
      setError('Enter artist / title text from the cover');
      return;
    }
    void runSearch({ query: q });
  }, [query, runSearch]);

  const takeCoverPhoto = useCallback(async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert('Camera permission needed', 'Enable camera to photograph covers.');
        return;
      }
    }
    const shot = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (shot.canceled || !shot.assets?.[0]?.uri) return;
    const uri = shot.assets[0].uri;
    setCoverUri(uri);
    setLoading(true);
    setError(null);
    try {
      const text = await extractTextFromImage(uri);
      if (text) {
        const q = queryFromOcrText(text);
        const cat = extractLikelyCatno(text);
        setQuery(q);
        setHint(
          cat
            ? `OCR found text. Possible catno: ${cat}. Edit and search.`
            : 'OCR extracted cover text. Edit if needed, then search.'
        );
        if (cat && (!q || q.length < 8)) {
          setCatno(cat);
        }
      } else {
        setHint(
          isOcrAvailable()
            ? 'No text found on image. Type artist / title, then search.'
            : 'On-device OCR not in this build yet. Type artist / title from the cover, then search. (Barcode mode still works live.)'
        );
      }
    } finally {
      setLoading(false);
    }
  }, [permission?.granted, requestPermission]);

  const pickCoverPhoto = useCallback(async () => {
    const shot = await ImagePicker.launchImageLibraryAsync({
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (shot.canceled || !shot.assets?.[0]?.uri) return;
    const uri = shot.assets[0].uri;
    setCoverUri(uri);
    setLoading(true);
    setError(null);
    try {
      const text = await extractTextFromImage(uri);
      if (text) {
        setQuery(queryFromOcrText(text));
        setHint('OCR extracted cover text. Edit if needed, then search.');
      } else {
        setHint('Type artist / title from the cover, then search Discogs.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

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
          <AppText variant="caption">Catalog number (e.g. PCS 7088)</AppText>
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
          <Button title="Search Discogs" onPress={searchCatno} loading={loading} />
        </View>
      ) : null}

      {mode === 'cover' ? (
        <View style={styles.form}>
          <View style={styles.coverActions}>
            <Button
              title="Take photo"
              onPress={() => void takeCoverPhoto()}
              style={styles.flexBtn}
            />
            <Button
              title="Gallery"
              variant="secondary"
              onPress={() => void pickCoverPhoto()}
              style={styles.flexBtn}
            />
          </View>
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={styles.coverPreview} contentFit="cover" />
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
          <Button
            title="Search Discogs"
            onPress={searchCoverQuery}
            loading={loading}
          />
        </View>
      ) : null}

      {loading && mode === 'barcode' ? (
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
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
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
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: 16,
  },
  inputMulti: { minHeight: 72, textAlignVertical: 'top' },
  coverActions: { flexDirection: 'row', gap: spacing.sm },
  flexBtn: { flex: 1 },
  coverPreview: {
    width: '100%',
    height: 160,
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
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
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
