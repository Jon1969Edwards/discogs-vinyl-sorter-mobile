/**
 * Album detail screen – full release info, link to Discogs.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import type { ReleaseRow } from '../types';
import { openDiscogsUrl } from '../utils/discogsLinking';

type AlbumDetailScreenProps = {
  route: { params: { release: ReleaseRow } };
  navigation: { goBack: () => void };
};

function formatPrice(value: number | null | undefined): string {
  if (value == null || value === 0) return '—';
  return `$${value.toFixed(2)}`;
}

export function AlbumDetailScreen({ route, navigation }: AlbumDetailScreenProps) {
  const { release } = route.params;

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.coverRow}>
        {release.cover_image_url ? (
          <Image
            source={{ uri: release.cover_image_url }}
            style={styles.cover}
            resizeMode="cover"
          />
        ) : release.thumb_url ? (
          <Image
            source={{ uri: release.thumb_url }}
            style={styles.cover}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.cover, styles.coverPlaceholder]} />
        )}
      </View>

      <Text style={styles.artist}>{release.artist_display}</Text>
      <Text style={styles.title}>{release.title}</Text>
      {(release.year || release.country) && (
        <Text style={styles.meta}>
          {[release.year, release.country].filter(Boolean).join(' • ')}
        </Text>
      )}

      <View style={styles.section}>
        <InfoRow label="Format" value={release.format_str || '—'} />
        <InfoRow label="Label" value={release.label || '—'} />
        <InfoRow label="Catalog" value={release.catno || '—'} />
      </View>

      {(release.lowest_price != null || release.median_price != null) && (
        <View style={styles.section}>
          <InfoRow label="Lowest" value={formatPrice(release.lowest_price)} />
          <InfoRow label="Median" value={formatPrice(release.median_price)} />
        </View>
      )}

      {release.notes ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Notes</Text>
          <Text style={styles.notes}>{release.notes}</Text>
        </View>
      ) : null}

      {release.discogs_url ? (
        <TouchableOpacity
          style={styles.discogsButton}
          onPress={() => openDiscogsUrl(release.discogs_url)}
        >
          <Text style={styles.discogsButtonText}>Open on Discogs</Text>
        </TouchableOpacity>
      ) : null}
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  if (!value || value === '—') return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
  },
  backButton: {
    paddingVertical: 8,
    paddingRight: 16,
  },
  backButtonText: {
    color: '#e94560',
    fontSize: 16,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  coverRow: {
    alignItems: 'center',
    marginBottom: 20,
  },
  cover: {
    width: 200,
    height: 200,
    borderRadius: 8,
  },
  coverPlaceholder: {
    backgroundColor: '#252542',
  },
  artist: {
    fontSize: 22,
    fontWeight: '700',
    color: '#eee',
    textAlign: 'center',
  },
  title: {
    fontSize: 18,
    color: '#bbb',
    textAlign: 'center',
    marginTop: 4,
  },
  meta: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  section: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#252542',
  },
  sectionLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    color: '#eee',
  },
  notes: {
    fontSize: 14,
    color: '#bbb',
    lineHeight: 22,
  },
  discogsButton: {
    marginTop: 32,
    padding: 16,
    backgroundColor: '#e94560',
    borderRadius: 8,
    alignItems: 'center',
  },
  discogsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
