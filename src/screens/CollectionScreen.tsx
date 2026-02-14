/**
 * Collection screen – list of sorted LPs with thumbnails.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import type { ReleaseRow } from '../types';
import { useCollection } from '../hooks/useCollection';
import { getStoredToken, clearStoredToken } from '../services';

interface CollectionScreenProps {
  onSignOut: () => void;
}

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
        {(item.year || item.country) && (
          <Text style={styles.meta} numberOfLines={1}>
            {[item.year, item.country].filter(Boolean).join(' • ')}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export function CollectionScreen({ onSignOut }: CollectionScreenProps) {
  const { state, fetchCollection, reset } = useCollection();
  const [token, setToken] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getStoredToken().then(setToken);
  }, []);

  useEffect(() => {
    if (token && state.status === 'idle') {
      fetchCollection(token);
    }
  }, [token, state.status, fetchCollection]);

  const handleSignOut = useCallback(async () => {
    await clearStoredToken();
    reset();
    onSignOut();
  }, [onSignOut, reset]);

  const filteredRows =
    state.status === 'success' && search.trim()
      ? state.rows.filter((r) => {
          const q = search.toLowerCase();
          return (
            r.artist_display.toLowerCase().includes(q) ||
            r.title.toLowerCase().includes(q)
          );
        })
      : state.status === 'success'
        ? state.rows
        : [];

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
        <TouchableOpacity onPress={handleSignOut}>
          <Text style={styles.signOut}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.search}
        placeholder="Search artist or title..."
        placeholderTextColor="#666"
        value={search}
        onChangeText={setSearch}
      />

      <FlatList
        data={filteredRows}
        keyExtractor={(item) => `${item.release_id ?? item.artist_display}-${item.title}`}
        renderItem={({ item }) => (
          <AlbumRow
            item={item}
            onPress={() => item.discogs_url && Linking.openURL(item.discogs_url)}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {search ? 'No matches' : 'No LPs in collection'}
          </Text>
        }
      />
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
  signOut: {
    color: '#e94560',
    fontSize: 14,
  },
  search: {
    backgroundColor: '#252542',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
    color: '#fff',
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
});
