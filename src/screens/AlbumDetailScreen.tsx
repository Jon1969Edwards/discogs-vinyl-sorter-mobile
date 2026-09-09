/**
 * Album detail screen – full release info, Discogs / Spotify / wishlist.
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
import { useLicense } from '../context/LicenseContext';
import {
  createDiscogsClient,
  fetchMarketplaceStats,
  getStoredCredentials,
  addToWishlist,
  removeFromWishlist,
  loadLocalWishlist,
  isInWishlist,
} from '../services';
import { getCachedPrice } from '../services/collectionCache';
import { canFetchPrices } from '../services/featureGate';
import { formatCollectionNotes } from '../utils/collectionNotes';
import { formatMarketplacePrice } from '../utils/formatPrice';
import { openDiscogsUrl } from '../utils/discogsLinking';
import { openAlbumOnSpotify } from '../utils/spotify';
import { rowToWishlistEntry } from '../utils/wishlistEntry';
import { useCachedThumb } from '../services/thumbnailCache';
import { GenreEditModal } from '../components/GenreEditModal';
import { LicenseModal } from '../components/LicenseModal';
import { ProUpgradeModal } from '../components/ProUpgradeModal';
import { colors, radius, spacing } from '../theme';
import {
  genresDisplay,
  stylesDisplay,
} from '../domain/genre';
import {
  clearGenreOverride,
  hasGenreOverride,
  loadGenreOverrides,
  setGenreOverride,
} from '../services/genreOverrides';

type AlbumDetailScreenProps = {
  route: { params: { release: ReleaseRow } };
  navigation: { goBack: () => void };
};

export function AlbumDetailScreen({ route, navigation }: AlbumDetailScreenProps) {
  const { settings, loaded: settingsLoaded } = useSettings();
  const { isPro } = useLicense();
  const [release, setRelease] = useState(route.params.release);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceFromCache, setPriceFromCache] = useState(false);
  const [inWishlist, setInWishlist] = useState(false);
  const [licenseOpen, setLicenseOpen] = useState(false);
  const [upsellOpen, setUpsellOpen] = useState(false);
  const [genreEditOpen, setGenreEditOpen] = useState(false);
  const [genreOverride, setGenreOverrideFlag] = useState(false);

  const coverUri = useCachedThumb(
    release.cover_image_url || release.thumb_url || undefined
  );

  useFocusEffect(
    useCallback(() => {
      const releaseId = route.params.release.release_id;
      void loadGenreOverrides().then(() => {
        setGenreOverrideFlag(hasGenreOverride(route.params.release));
      });
      void loadLocalWishlist().then((list) => {
        setInWishlist(
          isInWishlist(
            list,
            route.params.release.artist_display,
            route.params.release.title
          )
        );
      });

      if (!releaseId || !settingsLoaded) return;

      let cancelled = false;

      void (async () => {
        if (!canFetchPrices(isPro)) {
          setPriceLoading(false);
          return;
        }

        setPriceLoading(true);
        setPriceFromCache(false);

        const cached = await getCachedPrice(releaseId, settings.currency);
        if (
          !cancelled &&
          !cached.stale &&
          (cached.lowest != null || cached.numForSale != null)
        ) {
          setRelease((prev) => ({
            ...prev,
            lowest_price: cached.lowest,
            num_for_sale: cached.numForSale,
            price_currency: settings.currency,
          }));
          setPriceFromCache(true);
        }

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
          setPriceFromCache(false);
        } catch {
          // keep cache if present
        } finally {
          if (!cancelled) setPriceLoading(false);
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [
      route.params.release.release_id,
      route.params.release.artist_display,
      route.params.release.title,
      settings.currency,
      settingsLoaded,
      isPro,
    ])
  );

  const priceCurrency = release.price_currency || settings.currency;
  const notesText = formatCollectionNotes(release.notes);

  const toggleWishlist = useCallback(async () => {
    if (inWishlist) {
      await removeFromWishlist(release.artist_display, release.title);
      setInWishlist(false);
    } else {
      await addToWishlist(rowToWishlistEntry(release));
      setInWishlist(true);
    }
  }, [inWishlist, release]);

  const saveGenre = useCallback(
    async (text: string) => {
      const next = await setGenreOverride(release, text);
      if (next) {
        setRelease(next);
        setGenreOverrideFlag(true);
      }
      setGenreEditOpen(false);
    },
    [release]
  );

  const resetGenre = useCallback(async () => {
    const next = await clearGenreOverride(release);
    setRelease(next);
    setGenreOverrideFlag(false);
    setGenreEditOpen(false);
  }, [release]);

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
          {coverUri ? (
            <Image
              source={{ uri: coverUri }}
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
          <InfoRow label="Genre" value={genresDisplay(release)} />
          <InfoRow label="Style" value={stylesDisplay(release) || '—'} />
          <InfoRow label="Format" value={release.format_str || '—'} />
          <InfoRow label="Label" value={release.label || '—'} />
          <InfoRow label="Catalog" value={release.catno || '—'} />
          <TouchableOpacity
            style={styles.editGenreBtn}
            onPress={() => setGenreEditOpen(true)}
          >
            <Text style={styles.editGenreText}>Edit genre</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Marketplace</Text>
          {!canFetchPrices(isPro) ? (
            <TouchableOpacity onPress={() => setUpsellOpen(true)}>
              <Text style={styles.upsellText}>
                Marketplace prices are included with Pro — tap to unlock
              </Text>
            </TouchableOpacity>
          ) : priceLoading && !priceFromCache ? (
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
              {release.num_for_sale != null ? (
                <InfoRow
                  label="For sale"
                  value={String(release.num_for_sale)}
                />
              ) : null}
              {priceFromCache && priceLoading ? (
                <Text style={styles.cacheHint}>Cached · refreshing…</Text>
              ) : priceFromCache ? (
                <Text style={styles.cacheHint}>From cache</Text>
              ) : null}
            </>
          )}
        </View>

        {notesText ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Notes</Text>
            <Text style={styles.notes}>{notesText}</Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          {release.discogs_url ? (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => openDiscogsUrl(release.discogs_url)}
            >
              <Text style={styles.actionBtnText}>Open on Discogs</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() =>
              void openAlbumOnSpotify(release.artist_display, release.title)
            }
          >
            <Text style={styles.actionBtnText}>Open on Spotify</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => void toggleWishlist()}>
            <Text style={styles.actionBtnText}>
              {inWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <GenreEditModal
        visible={genreEditOpen}
        albumLabel={`${release.artist_display} — ${release.title}`}
        current={
          release.genres && release.genres.length > 0
            ? release.genres.join('; ')
            : genresDisplay(release)
        }
        hasOverride={genreOverride}
        onSave={(text) => void saveGenre(text)}
        onReset={() => void resetGenre()}
        onClose={() => setGenreEditOpen(false)}
      />
      <ProUpgradeModal
        visible={upsellOpen}
        feature="Marketplace prices"
        onClose={() => setUpsellOpen(false)}
        onOpenLicense={() => setLicenseOpen(true)}
      />
      <LicenseModal visible={licenseOpen} onClose={() => setLicenseOpen(false)} />
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
  upsellText: {
    color: colors.accent,
    fontSize: 14,
  },
  cacheHint: {
    marginTop: spacing.xs,
    fontSize: 12,
    color: colors.textMuted,
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
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: spacing.md,
  },
  editGenreBtn: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
  },
  editGenreText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '600',
  },
  notes: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  actions: {
    marginTop: spacing.xxl,
    gap: spacing.sm,
  },
  actionBtn: {
    padding: spacing.lg,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  actionBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
