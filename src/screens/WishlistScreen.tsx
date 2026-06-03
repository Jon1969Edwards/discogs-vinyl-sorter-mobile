import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useWishlist } from '../hooks/useWishlist';
import type { WishlistEntry } from '../types';

function WishlistRow({
  item,
  onPress,
}: {
  item: WishlistEntry;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      {item.thumb ? (
        <Image source={{ uri: item.thumb }} style={styles.thumb} contentFit="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]} />
      )}
      <View style={styles.rowText}>
        <Text style={styles.artist} numberOfLines={1}>
          {item.artist}
        </Text>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
        {item.year ? (
          <Text style={styles.meta}>{item.year}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export function WishlistScreen() {
  const { entries, loading, refresh } = useWishlist();

  const openItem = useCallback((item: WishlistEntry) => {
    if (item.discogs_url) Linking.openURL(item.discogs_url);
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#e94560" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Wishlist ({entries.length})</Text>
        <TouchableOpacity onPress={refresh}>
          <Text style={styles.refresh}>Refresh</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={entries}
        keyExtractor={(item, i) =>
          `${item.artist}-${item.title}-${i}`
        }
        renderItem={({ item }) => (
          <WishlistRow item={item} onPress={() => openItem(item)} />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            Wishlist is empty. Sync happens when you refresh your collection, or add items from the shelf view.
          </Text>
        }
      />
    </View>
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
    paddingTop: 48,
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#eee' },
  refresh: { color: '#aaa', fontSize: 14 },
  row: {
    flexDirection: 'row',
    padding: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#252542',
  },
  thumb: { width: 48, height: 48, borderRadius: 4 },
  thumbPlaceholder: { backgroundColor: '#252542' },
  rowText: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  artist: { fontSize: 16, fontWeight: '600', color: '#eee' },
  title: { fontSize: 14, color: '#bbb' },
  meta: { fontSize: 12, color: '#666', marginTop: 2 },
  empty: { color: '#666', textAlign: 'center', padding: 24 },
});
