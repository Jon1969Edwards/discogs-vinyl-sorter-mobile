/**
 * Collection screen – list of sorted LPs with thumbnails.
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import type { ReleaseRow } from '../types';
import type { ManualReorderListProps } from '../components/ManualReorderList';
import { CollectionHeader } from '../components/CollectionHeader';
import { CollectionSearchBar } from '../components/CollectionSearchBar';
import { CollectionSkeleton } from '../components/ui/CollectionSkeleton';
import { colors, radius, spacing } from '../theme';
import { useCollection } from '../hooks/useCollection';
import { useCollectionWatch } from '../hooks/useCollectionWatch';
import { useSettings } from '../context/SettingsContext';
import { useLicense } from '../context/LicenseContext';
import { sortRows, getSectionLetter } from '../utils';
import { formatListPrice } from '../utils/formatPrice';
import { releaseRowKey } from '../utils/releaseRowKey';
import { GUI_BUILD_SORT } from '../types';
import {
  getStoredCredentials,
  clearStoredCredentials,
  exportAndShare,
  type ExportFormat,
} from '../services';
import {
  setManualOrder,
  clearManualOrder,
  manualOrderIsEnabled,
} from '../services/manualOrder';
import { canFetchPrices, canUseManualOrder, FREE_RECORD_LIMIT } from '../services/featureGate';
import { LicenseModal } from '../components/LicenseModal';
import { ProUpgradeModal } from '../components/ProUpgradeModal';

export type RootStackParamList = {
  MainTabs: undefined;
  AlbumDetail: { release: ReleaseRow };
  Settings: undefined;
};

type CollectionScreenProps = {
  navigation: {
    navigate: (name: 'AlbumDetail' | 'Settings', params?: { release: ReleaseRow }) => void;
  };
  onSignOut: () => void;
};


function ReorderListLoader(props: ManualReorderListProps) {
  const [List, setList] = useState<React.ComponentType<ManualReorderListProps> | null>(
    null
  );

  useEffect(() => {
    import('../components/ManualReorderList').then((m) => {
      setList(() => m.ManualReorderList);
    });
  }, []);

  if (!List) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return <List {...props} />;
}

function AlbumRow({
  item,
  onPress,
  showPrices,
  currency,
}: {
  item: ReleaseRow;
  onPress: () => void;
  showPrices: boolean;
  currency: string;
}) {
  const priceLine = formatListPrice(item, currency, showPrices);

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      {item.thumb_url ? (
        <Image
          source={{ uri: item.thumb_url }}
          style={[styles.thumb, styles.thumbImage]}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]} />
      )}
      <View style={styles.rowText}>
        <Text style={styles.artist} numberOfLines={1}>
          {item.artist_display}
        </Text>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
        {(item.year != null || item.country) ? (
          <Text style={styles.meta} numberOfLines={1}>
            {[item.year, item.country].filter((v) => v != null && v !== '').join(' • ')}
          </Text>
        ) : null}
        {priceLine ? (
          <Text style={styles.priceMeta} numberOfLines={1}>
            {priceLine}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export function CollectionScreen({ navigation, onSignOut }: CollectionScreenProps) {
  const { settings, loaded } = useSettings();
  const { isPro } = useLicense();
  const { state, fetchCollection, refreshCollection, repriceCollection, reset } =
    useCollection();
  const [credentials, setCredentials] = useState<import('../services').DiscogsCredentials | null>(null);
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportNote, setExportNote] = useState<string | null>(null);
  const [manualOrderActive, setManualOrderActive] = useState(false);
  const [manualOverrideRows, setManualOverrideRows] = useState<ReleaseRow[] | null>(null);
  const [reorderMode, setReorderMode] = useState(false);
  const [reorderRows, setReorderRows] = useState<ReleaseRow[]>([]);
  const [licenseOpen, setLicenseOpen] = useState(false);
  const [upsellFeature, setUpsellFeature] = useState<string | null>(null);

  const settingsKey = `${settings.formats.join(',')}|${settings.sort_by}|${settings.show_prices}|${settings.currency}|${isPro}`;
  const showDividers = settings.divider_mode !== 'none';
  const showListPrices = settings.show_prices && canFetchPrices(isPro);

  useEffect(() => {
    getStoredCredentials().then(setCredentials);
  }, []);

  useEffect(() => {
    if (credentials && loaded && state.status === 'idle') {
      fetchCollection(credentials);
    }
  }, [credentials, loaded, state.status, fetchCollection]);

  const prevSettingsKey = useRef<string | null>(null);
  const hasFetched = useRef(false);
  useEffect(() => {
    if (state.status === 'success') hasFetched.current = true;
  }, [state.status]);

  useEffect(() => {
    if (state.status === 'success') {
      setManualOverrideRows(null);
      void manualOrderIsEnabled().then(setManualOrderActive);
    }
  }, [state.status, state.status === 'success' ? state.rows : null]);

  useEffect(() => {
    if (
      !hasFetched.current ||
      prevSettingsKey.current === null ||
      prevSettingsKey.current === settingsKey ||
      !credentials
    ) {
      prevSettingsKey.current = settingsKey;
      return;
    }

    const prev = prevSettingsKey.current.split('|');
    const next = settingsKey.split('|');
    const onlyCurrencyChanged =
      prev.length >= 4 &&
      next.length >= 4 &&
      prev[0] === next[0] &&
      prev[1] === next[1] &&
      prev[2] === next[2] &&
      prev[3] !== next[3];

    if (onlyCurrencyChanged && state.status === 'success') {
      void repriceCollection(credentials);
    } else {
      reset();
    }
    prevSettingsKey.current = settingsKey;
  }, [settingsKey, credentials, reset, repriceCollection, state.status]);

  const onDiscogsCountChanged = useCallback(() => {
    reset();
  }, [reset]);

  useCollectionWatch(
    onDiscogsCountChanged,
    !!credentials && state.status === 'success' && !reorderMode
  );

  const handleSignOut = useCallback(async () => {
    await clearStoredCredentials();
    reset();
    onSignOut();
  }, [onSignOut, reset]);

  const catalogRows = useMemo(() => {
    if (state.status !== 'success') return [];
    if (manualOverrideRows) return manualOverrideRows;
    if (manualOrderActive) return state.rows;
    return sortRows(
      state.rows,
      GUI_BUILD_SORT.variousPolicy,
      settings.sort_by
    );
  }, [
    state.status,
    state.status === 'success' ? state.rows : [],
    manualOrderActive,
    manualOverrideRows,
    settings.sort_by,
  ]);

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      if (state.status !== 'success' || catalogRows.length === 0) return;
      setExporting(true);
      setExportError(null);
      setExportNote(null);
      try {
        const result = await exportAndShare(catalogRows, format);
        if (result.truncated) {
          setExportNote(
            `Free export limited to ${FREE_RECORD_LIMIT} records. Upgrade to Pro for the full list.`
          );
        } else if (result.savedPath) {
          setExportNote('Export shared and saved on this device.');
        }
      } catch (err) {
        setExportError(err instanceof Error ? err.message : 'Export failed');
      } finally {
        setExporting(false);
      }
    },
    [state.status, catalogRows]
  );

  const filteredRows = useMemo(() => {
    if (!search.trim()) return catalogRows;
    const q = search.toLowerCase();
    return catalogRows.filter((r) => {
      return (
        r.artist_display.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q)
      );
    });
  }, [catalogRows, search]);

  const sections = useMemo(() => {
    if (!showDividers || reorderMode || filteredRows.length === 0) return [];
    const map = new Map<string, ReleaseRow[]>();
    for (const row of filteredRows) {
      const letter = getSectionLetter(row, settings.sort_by);
      const list = map.get(letter) ?? [];
      list.push(row);
      map.set(letter, list);
    }
    const keys = [...map.keys()].sort((a, b) => {
      if (a === '#') return 1;
      if (b === '#') return -1;
      if (a === '?') return 1;
      if (b === '?') return -1;
      if (/^\d+$/.test(a) && /^\d+$/.test(b))
        return parseInt(a, 10) - parseInt(b, 10);
      return a.localeCompare(b);
    });
    return keys.map((title) => ({ title, data: map.get(title) ?? [] }));
  }, [filteredRows, showDividers, reorderMode, settings.sort_by]);

  const enterReorderMode = useCallback(() => {
    if (search.trim()) return;
    if (!canUseManualOrder(isPro)) {
      setUpsellFeature('Manual shelf order');
      return;
    }
    setReorderRows(catalogRows);
    setReorderMode(true);
  }, [catalogRows, search, isPro]);

  const finishReorder = useCallback(async () => {
    const ids = reorderRows
      .map((r) => r.release_id)
      .filter((id): id is number => id != null);
    await setManualOrder(ids);
    setManualOrderActive(true);
    setManualOverrideRows(reorderRows);
    setReorderMode(false);
  }, [reorderRows]);

  const resetShelfOrder = useCallback(async () => {
    await clearManualOrder();
    setManualOrderActive(false);
    setManualOverrideRows(null);
    setReorderMode(false);
    reset();
  }, [reset]);

  const handleRefresh = useCallback(() => {
    if (credentials) void refreshCollection(credentials);
  }, [credentials, refreshCollection]);

  const isRefreshing =
    state.status === 'loading' && hasFetched.current;

  const refreshControl = (
    <RefreshControl
      refreshing={isRefreshing}
      onRefresh={handleRefresh}
      tintColor={colors.accent}
      colors={[colors.accent]}
      enabled={!reorderMode && !!credentials}
    />
  );

  if (state.status === 'loading') {
    const progress =
      'progress' in state && state.progress != null ? state.progress : null;
    if (loaded && credentials) {
      return (
        <View style={styles.container}>
          <View style={styles.loadingHeader}>
            <Text style={styles.loadingText}>
              {state.message || 'Loading collection…'}
            </Text>
            {progress != null ? (
              <View style={styles.progressTrack}>
                <View
                  style={[styles.progressFill, { width: `${progress * 100}%` }]}
                />
              </View>
            ) : (
              <ActivityIndicator size="small" color={colors.accent} style={styles.loadingSpinner} />
            )}
          </View>
          <CollectionSkeleton />
        </View>
      );
    }
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>
          {state.message || 'Loading collection…'}
        </Text>
        {progress != null ? (
          <View style={styles.progressTrack}>
            <View
              style={[styles.progressFill, { width: `${progress * 100}%` }]}
            />
          </View>
        ) : null}
      </View>
    );
  }

  if (state.status === 'error') {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{state.error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => reset()}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.retryButton, styles.signOutButton]}
          onPress={handleSignOut}
        >
          <Text style={styles.retryButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (state.status !== 'success') {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Preparing…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CollectionHeader
        lpCount={state.rows.length}
        username={state.username}
        manualOrderActive={manualOrderActive}
        reorderMode={reorderMode}
        searchActive={!!search.trim()}
        onReorder={enterReorderMode}
        onSettings={() => navigation.navigate('Settings')}
        onRefresh={handleRefresh}
        onSignOut={() => void handleSignOut()}
        onFinishReorder={() => void finishReorder()}
        onResetShelfOrder={() => void resetShelfOrder()}
        onExportTxt={() => void handleExport('txt')}
        onExportCsv={() => void handleExport('csv')}
        onExportJson={() => void handleExport('json')}
        exportDisabled={exporting || reorderMode || catalogRows.length === 0}
      />

      {state.stale ? (
        <TouchableOpacity style={styles.staleBanner} onPress={handleRefresh}>
          <Text style={styles.staleBannerText}>
            Offline / cached
            {state.lastSyncedAt
              ? ` · last sync ${new Date(state.lastSyncedAt).toLocaleString()}`
              : ''}
            {' · '}
            <Text style={styles.staleBannerAction}>Sync now</Text>
          </Text>
        </TouchableOpacity>
      ) : null}
      {state.status === 'success' && state.truncated ? (
        <TouchableOpacity
          style={styles.limitBanner}
          onPress={() => setUpsellFeature('Unlimited collection')}
        >
          <Text style={styles.limitBannerText}>
            Free shows {FREE_RECORD_LIMIT} records — tap to unlock Pro
          </Text>
        </TouchableOpacity>
      ) : null}
      {exportNote ? (
        <TouchableOpacity style={styles.noteBanner} onPress={() => setExportNote(null)}>
          <Text style={styles.noteBannerText}>{exportNote}</Text>
        </TouchableOpacity>
      ) : null}

      {state.pricesLoading ? (
        <View style={styles.pricesBanner}>
          <Text style={styles.pricesBannerText}>
            Updating marketplace prices…
            {state.priceProgress != null
              ? ` ${Math.round(state.priceProgress * 100)}%`
              : ''}
          </Text>
          {state.priceProgress != null ? (
            <View style={styles.pricesProgressTrack}>
              <View
                style={[
                  styles.pricesProgressFill,
                  { width: `${state.priceProgress * 100}%` },
                ]}
              />
            </View>
          ) : null}
        </View>
      ) : null}

      {reorderMode ? (
        <Text style={styles.reorderHint}>Long-press a row, then drag to set shelf order</Text>
      ) : null}

      <CollectionSearchBar
        value={search}
        onChangeText={setSearch}
        filteredCount={filteredRows.length}
        totalCount={catalogRows.length}
        editable={!reorderMode}
      />

      {exportError ? (
        <Text style={styles.exportError}>{exportError}</Text>
      ) : null}

      {reorderMode ? (
        <ReorderListLoader rows={reorderRows} onRowsChange={setReorderRows} />
      ) : showDividers && sections.length > 0 && Platform.OS !== 'web' ? (
        <SectionList
          sections={sections}
          keyExtractor={(item, index) => releaseRowKey(item, index)}
          renderItem={({ item }) => (
            <AlbumRow
              item={item}
              showPrices={showListPrices}
              currency={settings.currency}
              onPress={() => navigation.navigate('AlbumDetail', { release: item })}
            />
          )}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{section.title}</Text>
            </View>
          )}
          stickySectionHeadersEnabled
          refreshControl={refreshControl}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {search ? 'No matches' : 'No LPs in collection'}
            </Text>
          }
        />
      ) : (
        <FlatList
          data={filteredRows}
          keyExtractor={(item, index) => releaseRowKey(item, index)}
          renderItem={({ item }) => (
            <AlbumRow
              item={item}
              showPrices={showListPrices}
              currency={settings.currency}
              onPress={() => navigation.navigate('AlbumDetail', { release: item })}
            />
          )}
          refreshControl={refreshControl}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {search ? 'No matches' : 'No LPs in collection'}
            </Text>
          }
        />
      )}

      <ProUpgradeModal
        visible={upsellFeature != null}
        feature={upsellFeature || 'This feature'}
        onClose={() => setUpsellFeature(null)}
        onOpenLicense={() => {
          setUpsellFeature(null);
          setLicenseOpen(true);
        }}
      />
      <LicenseModal visible={licenseOpen} onClose={() => setLicenseOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: 48,
    paddingBottom: spacing.md,
  },
  loadingSpinner: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
  },
  staleBanner: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    marginBottom: spacing.xs,
    backgroundColor: colors.warningMuted,
  },
  staleBannerText: {
    color: colors.warning,
    fontSize: 13,
  },
  staleBannerAction: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  limitBanner: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    marginBottom: spacing.xs,
    backgroundColor: colors.accentMuted,
  },
  limitBannerText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  noteBanner: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    marginBottom: spacing.xs,
    backgroundColor: colors.surface,
  },
  noteBannerText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  pricesBanner: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    marginBottom: spacing.xs,
    backgroundColor: colors.accentMuted,
  },
  pricesBannerText: {
    color: colors.accent,
    fontSize: 13,
    marginBottom: 6,
  },
  pricesProgressTrack: {
    height: 3,
    backgroundColor: colors.surface,
    borderRadius: 2,
    overflow: 'hidden',
  },
  pricesProgressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
  reorderHint: {
    color: colors.textMuted,
    fontSize: 13,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  progressTrack: {
    width: '80%',
    maxWidth: 280,
    height: 4,
    backgroundColor: colors.surface,
    borderRadius: 2,
    marginTop: spacing.lg,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
  exportError: {
    color: colors.accent,
    fontSize: 13,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  loadingText: {
    color: colors.textSecondary,
    marginTop: spacing.lg,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  errorText: {
    color: colors.accent,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  retryButton: {
    marginTop: spacing.xl,
    padding: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
  },
  retryButtonText: {
    color: colors.white,
    fontWeight: '600',
  },
  signOutButton: {
    backgroundColor: 'transparent',
    marginTop: spacing.md,
  },
  row: {
    flexDirection: 'row',
    padding: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
  },
  thumbImage: {
    backgroundColor: colors.surface,
  },
  thumbPlaceholder: {
    backgroundColor: colors.surface,
  },
  rowText: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  artist: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  title: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  meta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  priceMeta: {
    fontSize: 12,
    color: colors.accent,
    marginTop: 2,
  },
  empty: {
    color: colors.textMuted,
    textAlign: 'center',
    padding: spacing.xl,
  },
  sectionHeader: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.accent,
  },
});
