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
  Image,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import DraggableFlatList, {
  ScaleDecorator,
  type RenderItemParams,
} from 'react-native-draggable-flatlist';
import type { ReleaseRow } from '../types';
import { useCollection } from '../hooks/useCollection';
import { useCollectionWatch } from '../hooks/useCollectionWatch';
import { useSettings } from '../context/SettingsContext';
import { sortRows, getSectionLetter } from '../utils';
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

function rowKey(item: ReleaseRow, index: number): string {
  if (item.release_id != null) return `r-${item.release_id}`;
  if (item.instance_id != null) return `i-${item.instance_id}`;
  return `row-${index}`;
}

function AlbumRow({
  item,
  onPress,
  drag,
  reorderMode,
}: {
  item: ReleaseRow;
  onPress: () => void;
  drag?: () => void;
  reorderMode?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.row, reorderMode && styles.rowReorder]}
      onPress={reorderMode ? undefined : onPress}
      onLongPress={reorderMode ? drag : undefined}
      delayLongPress={reorderMode ? 120 : undefined}
      activeOpacity={0.7}
    >
      {reorderMode ? (
        <Text style={styles.dragHandle} accessibilityLabel="Drag to reorder">
          ≡
        </Text>
      ) : null}
      {item.thumb_url ? (
        <Image source={{ uri: item.thumb_url }} style={styles.thumb} />
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
      </View>
    </TouchableOpacity>
  );
}

export function CollectionScreen({ navigation, onSignOut }: CollectionScreenProps) {
  const { settings, loaded } = useSettings();
  const { state, fetchCollection, reset } = useCollection();
  const [credentials, setCredentials] = useState<import('../services').DiscogsCredentials | null>(null);
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [manualOrderActive, setManualOrderActive] = useState(false);
  const [manualOverrideRows, setManualOverrideRows] = useState<ReleaseRow[] | null>(null);
  const [reorderMode, setReorderMode] = useState(false);
  const [reorderRows, setReorderRows] = useState<ReleaseRow[]>([]);

  const settingsKey = `${settings.formats.join(',')}|${settings.sort_by}|${settings.show_prices}`;
  const showDividers = settings.divider_mode !== 'none';

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
      hasFetched.current &&
      prevSettingsKey.current !== null &&
      prevSettingsKey.current !== settingsKey &&
      credentials
    ) {
      reset();
    }
    prevSettingsKey.current = settingsKey;
  }, [settingsKey, credentials, reset]);

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
      try {
        await exportAndShare(catalogRows, format);
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
    setReorderRows(catalogRows);
    setReorderMode(true);
  }, [catalogRows, search]);

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

  const renderDraggableItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<ReleaseRow>) => (
      <ScaleDecorator activeScale={1.02}>
        <AlbumRow
          item={item}
          onPress={() => navigation.navigate('AlbumDetail', { release: item })}
          drag={drag}
          reorderMode
        />
      </ScaleDecorator>
    ),
    [navigation]
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {state.username}'s LPs ({state.rows.length})
          {manualOrderActive ? ' · custom order' : ''}
        </Text>
        <View style={styles.headerActions}>
          {reorderMode ? (
            <>
              <TouchableOpacity onPress={() => void finishReorder()} style={styles.refreshBtn}>
                <Text style={styles.refreshText}>Done</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => void resetShelfOrder()} style={styles.refreshBtn}>
                <Text style={styles.refreshText}>Reset</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                onPress={enterReorderMode}
                style={styles.refreshBtn}
                disabled={!!search.trim()}
              >
                <Text
                  style={[
                    styles.refreshText,
                    !!search.trim() && styles.actionDisabled,
                  ]}
                >
                  Reorder
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('Settings')}
                style={styles.refreshBtn}
              >
                <Text style={styles.refreshText}>Settings</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => credentials && reset()}
                style={styles.refreshBtn}
              >
                <Text style={styles.refreshText}>Refresh</Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity onPress={handleSignOut}>
            <Text style={styles.signOut}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {state.stale ? (
        <Text style={styles.staleBanner}>
          Showing cached collection — tap Refresh to sync
        </Text>
      ) : null}

      {reorderMode ? (
        <Text style={styles.reorderHint}>Long-press a row, then drag to set shelf order</Text>
      ) : null}

      <TextInput
        style={styles.search}
        placeholder="Search artist or title..."
        placeholderTextColor="#666"
        value={search}
        onChangeText={setSearch}
        editable={!reorderMode}
      />

      <View style={styles.exportBar}>
        <Text style={styles.exportLabel}>Export:</Text>
        <TouchableOpacity
          style={[styles.exportBtn, exporting && styles.exportBtnDisabled]}
          onPress={() => handleExport('txt')}
          disabled={exporting || reorderMode}
        >
          <Text style={styles.exportBtnText}>TXT</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.exportBtn, exporting && styles.exportBtnDisabled]}
          onPress={() => handleExport('csv')}
          disabled={exporting || reorderMode}
        >
          <Text style={styles.exportBtnText}>CSV</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.exportBtn, exporting && styles.exportBtnDisabled]}
          onPress={() => handleExport('json')}
          disabled={exporting || reorderMode}
        >
          <Text style={styles.exportBtnText}>JSON</Text>
        </TouchableOpacity>
      </View>
      {exportError ? (
        <Text style={styles.exportError}>{exportError}</Text>
      ) : null}

      {reorderMode ? (
        <DraggableFlatList
          data={reorderRows}
          onDragEnd={({ data }) => setReorderRows(data)}
          keyExtractor={(item, index) => rowKey(item, index)}
          renderItem={renderDraggableItem}
          ListEmptyComponent={
            <Text style={styles.empty}>No LPs in collection</Text>
          }
        />
      ) : showDividers && sections.length > 0 && Platform.OS !== 'web' ? (
        <SectionList
          sections={sections}
          keyExtractor={(item, index) => rowKey(item, index)}
          renderItem={({ item }) => (
            <AlbumRow
              item={item}
              onPress={() => navigation.navigate('AlbumDetail', { release: item })}
            />
          )}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{section.title}</Text>
            </View>
          )}
          stickySectionHeadersEnabled
          ListEmptyComponent={
            <Text style={styles.empty}>
              {search ? 'No matches' : 'No LPs in collection'}
            </Text>
          }
        />
      ) : (
        <FlatList
          data={filteredRows}
          keyExtractor={(item, index) => rowKey(item, index)}
          renderItem={({ item }) => (
            <AlbumRow
              item={item}
              onPress={() => navigation.navigate('AlbumDetail', { release: item })}
            />
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {search ? 'No matches' : 'No LPs in collection'}
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
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
    paddingTop: 48,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#eee',
    marginRight: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 0,
  },
  refreshBtn: {},
  refreshText: {
    color: '#aaa',
    fontSize: 14,
  },
  actionDisabled: {
    opacity: 0.4,
  },
  signOut: {
    color: '#e94560',
    fontSize: 14,
  },
  staleBanner: {
    color: '#f0ad4e',
    fontSize: 13,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  reorderHint: {
    color: '#888',
    fontSize: 13,
    paddingHorizontal: 16,
    marginBottom: 8,
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
  exportLabel: {
    color: '#666',
    fontSize: 14,
  },
  exportBtn: {
    backgroundColor: '#252542',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  exportBtnDisabled: {
    opacity: 0.5,
  },
  exportBtnText: {
    color: '#e94560',
    fontSize: 14,
    fontWeight: '600',
  },
  exportError: {
    color: '#e94560',
    fontSize: 13,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  loadingText: {
    color: '#aaa',
    marginTop: 16,
  },
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
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  signOutButton: {
    backgroundColor: 'transparent',
    marginTop: 12,
  },
  row: {
    flexDirection: 'row',
    padding: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#252542',
  },
  rowReorder: {
    backgroundColor: '#222240',
  },
  dragHandle: {
    width: 28,
    fontSize: 22,
    color: '#888',
    textAlign: 'center',
    alignSelf: 'center',
    marginRight: 4,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 4,
  },
  thumbPlaceholder: {
    backgroundColor: '#252542',
  },
  rowText: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  artist: {
    fontSize: 16,
    fontWeight: '600',
    color: '#eee',
  },
  title: {
    fontSize: 14,
    color: '#bbb',
  },
  meta: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  empty: {
    color: '#666',
    textAlign: 'center',
    padding: 24,
  },
  sectionHeader: {
    backgroundColor: '#252542',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e94560',
  },
});
