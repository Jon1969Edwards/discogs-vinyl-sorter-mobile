/**
 * Album detail screen – full release info, link to Discogs.
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect } from '@react-navigation/native';
import type { ReleaseRow } from '../types';
import { useSettings } from '../context/SettingsContext';
import {
  createDiscogsClient,
  fetchMarketplaceStats,
  getStoredCredentials,
} from '../services';
import { formatCollectionNotes } from '../utils/collectionNotes';
import { formatMarketplacePrice } from '../utils/formatPrice';
import { openDiscogsUrl } from '../utils/discogsLinking';
import { colors, radius, spacing } from '../theme';

type AlbumDetailScreenProps = {
  route: { params: { release: ReleaseRow } };
  navigation: { goBack: () => void };
};

export function AlbumDetailScreen({ route, navigation }: AlbumDetailScreenProps) {
  const { settings, loaded: settingsLoaded } = useSettings();
  const [release, setRelease] = useState(route.params.release);
  const [priceLoading, setPriceLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const releaseId = route.params.release.release_id;
      if (!releaseId || !settingsLoaded) return;

      let cancelled = false;
      setPriceLoading(true);

      void (async () => {
        try {
          const credentials = await getStoredCredentials();
          if (!credentials || cancelled) return;
          const client = createDiscogsClient(credentials);
          const stats = await fetchMarketplaceStats(
            client,
            releaseId,
            settings.currency
          );
          if (cancelled) return;
          setRelease((prev) => ({
            ...prev,
            lowest_price: stats.lowestPrice,
            num_for_sale: stats.numForSale,
            price_currency: stats.currency,
          }));
        } finally {
          if (!cancelled) setPriceLoading(false);
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [route.params.release.release_id, settings.currency, settingsLoaded])
  );

  const priceCurrency = release.price_currency || settings.currency;
  const notesText = formatCollectionNotes(release.notes);

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
            contentFit="cover"
          />
        ) : release.thumb_url ? (
          <Image
            source={{ uri: release.thumb_url }}
            style={styles.cover}
            contentFit="cover"
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

      {(release.lowest_price != null ||
        release.median_price != null ||
        priceLoading) && (
        <View style={styles.section}>
          {priceLoading ? (
            <View style={styles.priceLoadingRow}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={styles.priceLoadingText}>
                Loading {settings.currency} price…
              </Text>
            </View>
          ) : (
            <>
              <InfoRow
                label="Lowest"
                value={formatMarketplacePrice(
                  release.lowest_price,
                  priceCurrency
                )}
              />
              <InfoRow
                label="Median"
                value={formatMarketplacePrice(
                  release.median_price,
                  priceCurrency
                )}
              />
            </>
          )}
        </View>
      )}

      {notesText ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Notes</Text>
          <Text style={styles.notes}>{notesText}</Text>
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
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: 48,
    paddingBottom: spacing.md,
  },
  backButton: {
    paddingVertical: spacing.sm,
    paddingRight: spacing.lg,
  },
  backButtonText: {
    color: colors.accent,
    fontSize: 16,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  coverRow: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  cover: {
    width: 200,
    height: 200,
    borderRadius: radius.sm,
  },
  coverPlaceholder: {
    backgroundColor: colors.surface,
  },
  artist: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  title: {
    fontSize: 18,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  meta: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  section: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.surface,
  },
  sectionLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priceLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: spacing.sm,
  },
  priceLoadingText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textMuted,
  },
  infoValue: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  notes: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  discogsButton: {
    marginTop: spacing.xxl,
    padding: spacing.lg,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  discogsButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
