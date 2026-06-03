import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import type { ReleaseRow } from '../types';
import type { WishlistEntry } from '../types';

interface AlbumDetailModalProps {
  visible: boolean;
  row: ReleaseRow | null;
  onClose: () => void;
  inWishlist: boolean;
  onToggleWishlist: () => void;
}

export function AlbumDetailModal({
  visible,
  row,
  onClose,
  inWishlist,
  onToggleWishlist,
}: AlbumDetailModalProps) {
  if (!row) return null;

  const priceText =
    row.lowest_price != null && row.num_for_sale != null && row.num_for_sale > 0
      ? `${Math.round(row.lowest_price)} ${row.price_currency || 'USD'}+ (${row.num_for_sale} for sale)`
      : row.num_for_sale === 0
        ? 'Not listed'
        : null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <ScrollView>
            {row.cover_image_url || row.thumb_url ? (
              <Image
                source={{ uri: row.cover_image_url || row.thumb_url }}
                style={styles.cover}
                contentFit="contain"
              />
            ) : null}
            <Text style={styles.artist}>{row.artist_display}</Text>
            <Text style={styles.title}>{row.title}</Text>
            {row.year ? (
              <Text style={styles.meta}>Year: {row.year}</Text>
            ) : null}
            {row.label ? (
              <Text style={styles.meta}>
                Label: {row.label} {row.catno}
              </Text>
            ) : null}
            {row.country ? (
              <Text style={styles.meta}>Country: {row.country}</Text>
            ) : null}
            {row.format_str ? (
              <Text style={styles.meta}>Format: {row.format_str}</Text>
            ) : null}
            {priceText ? (
              <Text style={styles.meta}>Price: {priceText}</Text>
            ) : null}
            {row.notes ? (
              <Text style={styles.notes}>Notes: {row.notes}</Text>
            ) : null}
          </ScrollView>

          <View style={styles.actions}>
            {row.discogs_url ? (
              <TouchableOpacity
                style={styles.btn}
                onPress={() => Linking.openURL(row.discogs_url)}
              >
                <Text style={styles.btnText}>Open on Discogs</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.btn} onPress={onToggleWishlist}>
              <Text style={styles.btnText}>
                {inWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.closeBtn]} onPress={onClose}>
              <Text style={styles.btnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function rowToWishlistEntry(row: ReleaseRow): WishlistEntry {
  return {
    artist: row.artist_display,
    title: row.title,
    year: row.year ?? undefined,
    discogs_url: row.discogs_url,
    thumb: row.thumb_url,
    cover_image_url: row.cover_image_url,
    release_id: row.release_id ?? undefined,
    label: row.label,
    catno: row.catno,
    country: row.country,
    format: row.format_str,
    notes: row.notes,
    lowest_price: row.lowest_price ?? undefined,
    num_for_sale: row.num_for_sale ?? undefined,
    price_currency: row.price_currency,
  };
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '85%',
    padding: 20,
  },
  cover: {
    width: '100%',
    height: 220,
    marginBottom: 16,
    borderRadius: 8,
  },
  artist: {
    fontSize: 20,
    fontWeight: '700',
    color: '#eee',
  },
  title: {
    fontSize: 17,
    color: '#bbb',
    marginBottom: 12,
  },
  meta: {
    fontSize: 14,
    color: '#888',
    marginBottom: 4,
  },
  notes: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
  },
  actions: {
    marginTop: 16,
    gap: 8,
  },
  btn: {
    backgroundColor: '#252542',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeBtn: {
    backgroundColor: '#e94560',
  },
  btnText: {
    color: '#fff',
    fontWeight: '600',
  },
});
