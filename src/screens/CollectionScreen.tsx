/**
 * Collection screen – sorted shelf with search, export, manual reorder.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import DraggableFlatList, {
  ScaleDecorator,
  type RenderItemParams,
} from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import type { ReleaseRow } from '../types';
import { useFocusEffect } from '@react-navigation/native';
import { useCollection } from '../hooks/useCollection';
import { useCollectionWatch } from '../hooks/useCollectionWatch';
import { useSettings } from '../hooks/useSettings';
import { FORMAT_FILTERS } from '../domain/formatFilter';
import { useWishlist } from '../hooks/useWishlist';
import {
  getAuthCredentials,
  exportAndShare,
  setManualOrder,
  setManualOrderEnabled,
  manualOrderIsEnabled,
  isInWishlist,
  type ExportFormat,
} from '../services';
import { useCachedThumb } from '../services/thumbnailCache';
import {
  AlbumDetailModal,
  rowToWishlistEntry,
} from '../components/AlbumDetailModal';

function AlbumRowContent({
  item,
  showPrices,
}: {
  item: ReleaseRow;
  showPrices: boolean;
}) {
  const thumbUri = useCachedThumb(item.thumb_url);
  const priceLabel =
    showPrices &&
    item.lowest_price != null &&
    item.num_for_sale != null &&
    item.num_for_sale > 0
      ? `${Math.round(item.lowest_price)} ${item.price_currency || 'USD'}+`
      : showPrices
        ? '—'
        : null;

  return (
    <>
      {thumbUri ? (
        <Image source={{ uri: thumbUri }} style={styles.thumb} contentFit="cover" />
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
        <View style={styles.metaRow}>
          {(item.year || item.country) && (
            <Text style={styles.meta} numberOfLines={1}>
              {[item.year, item.country].filter(Boolean).join(' • ')}
            </Text>
          )}
          {priceLabel ? (
            <Text style={styles.price}>{priceLabel}</Text>
          ) : null}
        </View>
      </View>
    </>
  );
}

interface CollectionScreenProps {
  settingsVersion?: number;
}

function formatFilterLabel(formats: string[]): string {
  if (formats.includes('everything')) return 'Everything';
  return formats
    .map((f) => FORMAT_FILTERS.find(([id]) => id === f)?.[1] ?? f)
    .join(', ');
}

export function CollectionScreen({ settingsVersion = 0 }: CollectionScreenProps) {
  const { state, fetchCollection, reset } = useCollection();
  const { settings, reload } = useSettings();
  const { entries: wishlistEntries, add: addWish, remove: removeWish } =
    useWishlist();
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [displayRows, setDisplayRows] = useState<ReleaseRow[]>([]);
  const [selected, setSelected] = useState<ReleaseRow | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    manualOrderIsEnabled().then(setManualMode);
  }, []);

  useEffect(() => {
    getAuthCredentials().then((auth) => {
      if (auth.mode !== 'none' && state.status === 'idle') {
        fetchCollection();
      }
    });
  }, [state.status, fetchCollection]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  useEffect(() => {
    if (settingsVersion > 0) {
      reload().then(() => {
        reset();
        fetchCollection();
      });
    }
  }, [settingsVersion, reload, reset, fetchCollection]);

  const onPollRefresh = useCallback(() => {
    reset();
    fetchCollection();
  }, [reset, fetchCollection]);

  useCollectionWatch(onPollRefresh, state.status === 'success');

  useEffect(() => {
    if (state.status === 'success') {
      setDisplayRows(state.rows);
    }
  }, [state]);

  const filteredRows = useMemo(() => {
    if (state.status !== 'success') return [];
    const q = search.trim().toLowerCase();
    if (!q) return displayRows;
    return displayRows.filter(
      (r) =>
        r.artist_display.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q)
    );
  }, [state, displayRows, search]);

  const handleRefresh = useCallback(() => {
    reset();
    fetchCollection();
  }, [reset, fetchCollection]);

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      if (state.status !== 'success' || displayRows.length === 0) return;
      setExporting(true);
      setExportError(null);
      try {
        await exportAndShare(displayRows, format);
      } catch (err) {
        setExportError(err instanceof Error ? err.message : 'Export failed');
      } finally {
        setExporting(false);
      }
    },
    [state, displayRows]
  );

  const toggleManualMode = useCallback(async () => {
    const next = !manualMode;
    setManualMode(next);
    await setManualOrderEnabled(next);
    if (next && displayRows.length) {
      const ids = displayRows
        .map((r) => r.release_id)
        .filter((id): id is number => id != null);
      await setManualOrder(ids);
    }
  }, [manualMode, displayRows]);

  const onDragEnd = useCallback(
    async ({ data }: { data: ReleaseRow[] }) => {
      setDisplayRows(data);
      const ids = data
        .map((r) => r.release_id)
        .filter((id): id is number => id != null);
      await setManualOrder(ids);
      await setManualOrderEnabled(true);
      setManualMode(true);
    },
    []
  );

  const openAlbum = useCallback((row: ReleaseRow) => {
    setSelected(row);
    setModalVisible(true);
  }, []);

  const handleToggleWishlist = useCallback(async () => {
    if (!selected) return;
    const entry = rowToWishlistEntry(selected);
    if (isInWishlist(wishlistEntries, entry.artist, entry.title)) {
      await removeWish(entry.artist, entry.title);
    } else {
      await addWish(entry);
    }
  }, [selected, wishlistEntries, addWish, removeWish]);

  const renderDraggableItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<ReleaseRow>) => (
      <ScaleDecorator>
        <TouchableOpacity
          style={[styles.row, isActive && styles.rowActive]}
          onPress={() => openAlbum(item)}
          onLongPress={manualMode ? drag : undefined}
          delayLongPress={150}
          activeOpacity={0.7}
        >
          <AlbumRowContent item={item} showPrices={settings.show_prices} />
        </TouchableOpacity>
      </ScaleDecorator>
    ),
    [manualMode, openAlbum, settings.show_prices]
  );

  if (state.status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#e94560" />
        <Text style={styles.loadingText}>
          {state.message || 'Loading collection…'}
        </Text>
      </View>
    );
  }

  if (state.status === 'error') {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{state.error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
          <Text style={styles.retryButtonText}>Try Again</Text>
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

  const formatLabel = formatFilterLabel(settings.formats);

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {state.username}'s {formatLabel} ({displayRows.length})
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={toggleManualMode}>
            <Text style={manualMode ? styles.manualOn : styles.refreshText}>
              {manualMode ? 'Manual ✓' : 'Manual'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleRefresh}>
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>

      {state.stale ? (
        <Text style={styles.staleBanner}>Showing cached data — refresh recommended</Text>
      ) : null}

      <TextInput
        style={styles.search}
        placeholder="Search artist or title..."
        placeholderTextColor="#666"
        value={search}
        onChangeText={setSearch}
      />

      <View style={styles.exportBar}>
        <Text style={styles.exportLabel}>Export:</Text>
        {(['txt', 'csv', 'json'] as ExportFormat[]).map((fmt) => (
          <TouchableOpacity
            key={fmt}
            style={[styles.exportBtn, exporting && styles.exportBtnDisabled]}
            onPress={() => handleExport(fmt)}
            disabled={exporting}
          >
            <Text style={styles.exportBtnText}>{fmt.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {exportError ? (
        <Text style={styles.exportError}>{exportError}</Text>
      ) : null}

      {manualMode ? (
        <Text style={styles.hint}>Long-press and drag to reorder shelf</Text>
      ) : null}

      <DraggableFlatList
        data={filteredRows}
        keyExtractor={(item) =>
          `${item.release_id ?? item.artist_display}-${item.title}`
        }
        renderItem={renderDraggableItem}
        onDragEnd={manualMode ? onDragEnd : undefined}
        activationDistance={manualMode ? 0 : 9999}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {search ? 'No matches' : 'No matching items in collection'}
          </Text>
        }
      />

      <AlbumDetailModal
        visible={modalVisible}
        row={selected}
        onClose={() => setModalVisible(false)}
        inWishlist={
          selected
            ? isInWishlist(
                wishlistEntries,
                selected.artist_display,
                selected.title
              )
            : false
        }
        onToggleWishlist={handleToggleWishlist}
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  center: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 8,
  },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#eee', flex: 1 },
  headerActions: { flexDirection: 'row', gap: 12 },
  refreshText: { color: '#aaa', fontSize: 14 },
  manualOn: { color: '#e94560', fontSize: 14, fontWeight: '600' },
  staleBanner: {
    color: '#e9c46a',
    fontSize: 12,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  search: {
    backgroundColor: '#252542',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    fontSize: 16,
    color: '#fff',
  },
  exportBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  exportLabel: { color: '#666', fontSize: 14 },
  exportBtn: {
    backgroundColor: '#252542',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  exportBtnDisabled: { opacity: 0.5 },
  exportBtnText: { color: '#e94560', fontSize: 14, fontWeight: '600' },
  exportError: {
    color: '#e94560',
    fontSize: 13,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  hint: {
    color: '#666',
    fontSize: 12,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  loadingText: { color: '#aaa', marginTop: 16 },
  errorText: {
    color: '#e94560',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  retryButton: {
    marginTop: 24,
    padding: 12,
    backgroundColor: '#e94560',
    borderRadius: 8,
  },
  retryButtonText: { color: '#fff', fontWeight: '600' },
  row: {
    flexDirection: 'row',
    padding: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#252542',
  },
  rowActive: { backgroundColor: '#252542' },
  thumb: { width: 48, height: 48, borderRadius: 4 },
  thumbPlaceholder: { backgroundColor: '#252542' },
  rowText: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  artist: { fontSize: 16, fontWeight: '600', color: '#eee' },
  title: { fontSize: 14, color: '#bbb' },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
  meta: { fontSize: 12, color: '#666' },
  price: { fontSize: 12, color: '#e94560' },
  empty: { color: '#666', textAlign: 'center', padding: 24 },
});
