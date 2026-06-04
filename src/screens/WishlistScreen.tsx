import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useWishlist } from '../hooks/useWishlist';
import type { WishlistEntry } from '../types';
import { AppText } from '../components/ui/AppText';
import { colors, radius, spacing } from '../theme';

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
        <Image
          source={{ uri: item.thumb }}
          style={[styles.thumb, styles.thumbImage]}
          contentFit="cover"
        />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]} />
      )}
      <View style={styles.rowText}>
        <AppText variant="body" style={styles.artist} numberOfLines={1}>
          {item.artist}
        </AppText>
        <AppText variant="bodySmall" numberOfLines={1}>
          {item.title}
        </AppText>
        {item.year ? (
          <AppText variant="caption" style={styles.meta}>
            {item.year}
          </AppText>
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
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AppText variant="title" style={styles.headerTitle}>
          Wishlist ({entries.length})
        </AppText>
        <TouchableOpacity onPress={refresh} style={styles.refreshBtn}>
          <AppText variant="accent" style={styles.refresh}>
            Refresh
          </AppText>
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
          <AppText variant="caption" style={styles.empty}>
            Wishlist is empty. Sync happens when you refresh your collection, or add items from the shelf view.
          </AppText>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    paddingTop: 48,
  },
  headerTitle: { fontSize: 18 },
  refreshBtn: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  refresh: { fontSize: 14 },
  row: {
    flexDirection: 'row',
    padding: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  thumb: { width: 48, height: 48, borderRadius: radius.sm },
  thumbImage: { backgroundColor: colors.surface },
  thumbPlaceholder: { backgroundColor: colors.surface },
  rowText: { flex: 1, marginLeft: spacing.md, justifyContent: 'center' },
  artist: { fontWeight: '600', color: colors.textPrimary },
  meta: { marginTop: 2 },
  empty: { textAlign: 'center', padding: spacing.xl },
});
