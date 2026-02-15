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
import type { ReleaseRow } from '../types';
import { useCollection } from '../hooks/useCollection';
import { useSettingsContext } from '../contexts/SettingsContext';
import { sortRows, getSectionLetter } from '../utils';
import { DEFAULT_SETTINGS } from '../types/settings';
import {
  getStoredCredentials,
  clearStoredCredentials,
  exportAndShare,
  type ExportFormat,
} from '../services';

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

function AlbumRow({
  item,
  onPress,
}: {
  item: ReleaseRow;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
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
  const { settings } = useSettingsContext();
  const { state, fetchCollection, reset } = useCollection();
  const [credentials, setCredentials] = useState<import('../services').DiscogsCredentials | null>(null);
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const effectiveSettings = settings ?? DEFAULT_SETTINGS;

  useEffect(() => {
    getStoredCredentials().then(setCredentials);
  }, []);

  useEffect(() => {
    if (credentials && state.status === 'idle') {
      fetchCollection(credentials, { lpStrict: effectiveSettings.lpStrict });
    }
  }, [credentials, state.status, fetchCollection, effectiveSettings.lpStrict]);

  const prevLpStrict = useRef<boolean | null>(null);
  const hasFetched = useRef(false);
  useEffect(() => {
    if (state.status === 'success') hasFetched.current = true;
  }, [state.status]);
  useEffect(() => {
    if (
      hasFetched.current &&
      prevLpStrict.current !== null &&
      prevLpStrict.current !== effectiveSettings.lpStrict &&
      credentials
    ) {
      prevLpStrict.current = effectiveSettings.lpStrict;
      reset();
    }
    prevLpStrict.current = effectiveSettings.lpStrict;
  }, [effectiveSettings.lpStrict, credentials, reset]);

  const handleSignOut = useCallback(async () => {
    await clearStoredCredentials();
    reset();
    onSignOut();
  }, [onSignOut, reset]);

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      if (state.status !== 'success' || state.rows.length === 0) return;
      setExporting(true);
      setExportError(null);
      try {
        await exportAndShare(state.rows, format);
      } catch (err) {
        setExportError(err instanceof Error ? err.message : 'Export failed');
      } finally {
        setExporting(false);
      }
    },
    [state]
  );

  const sortedRows = useMemo(() => {
    if (state.status !== 'success') return [];
    return sortRows(
      state.rows,
      effectiveSettings.variousPolicy,
      effectiveSettings.sortBy
    );
  }, [
    state.status,
    state.status === 'success' ? state.rows : [],
    effectiveSettings.variousPolicy,
    effectiveSettings.sortBy,
  ]);

  const filteredRows =
    state.status === 'success' && search.trim()
      ? sortedRows.filter((r) => {
          const q = search.toLowerCase();
          return (
            r.artist_display.toLowerCase().includes(q) ||
            r.title.toLowerCase().includes(q)
          );
        })
      : state.status === 'success'
        ? sortedRows
        : [];

  const sections = useMemo(() => {
    if (!effectiveSettings.showDividers || filteredRows.length === 0) return [];
    const map = new Map<string, ReleaseRow[]>();
    for (const row of filteredRows) {
      const letter = getSectionLetter(row, effectiveSettings.sortBy);
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
  }, [filteredRows, effectiveSettings.showDividers, effectiveSettings.sortBy]);

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
        </Text>
        <View style={styles.headerActions}>
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
          <TouchableOpacity onPress={handleSignOut}>
            <Text style={styles.signOut}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TextInput
        style={styles.search}
        placeholder="Search artist or title..."
        placeholderTextColor="#666"
        value={search}
        onChangeText={setSearch}
      />

      <View style={styles.exportBar}>
        <Text style={styles.exportLabel}>Export:</Text>
        <TouchableOpacity
          style={[styles.exportBtn, exporting && styles.exportBtnDisabled]}
          onPress={() => handleExport('txt')}
          disabled={exporting}
        >
          <Text style={styles.exportBtnText}>TXT</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.exportBtn, exporting && styles.exportBtnDisabled]}
          onPress={() => handleExport('csv')}
          disabled={exporting}
        >
          <Text style={styles.exportBtnText}>CSV</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.exportBtn, exporting && styles.exportBtnDisabled]}
          onPress={() => handleExport('json')}
          disabled={exporting}
        >
          <Text style={styles.exportBtnText}>JSON</Text>
        </TouchableOpacity>
      </View>
      {exportError ? (
        <Text style={styles.exportError}>{exportError}</Text>
      ) : null}

      {effectiveSettings.showDividers && sections.length > 0 && Platform.OS !== 'web' ? (
        <SectionList
          sections={sections}
          keyExtractor={(_, index) => `lp-${index}`}
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
          keyExtractor={(_, index) => `lp-${index}`}
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
    fontSize: 18,
    fontWeight: '600',
    color: '#eee',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  refreshBtn: {},
  refreshText: {
    color: '#aaa',
    fontSize: 14,
  },
  signOut: {
    color: '#e94560',
    fontSize: 14,
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
