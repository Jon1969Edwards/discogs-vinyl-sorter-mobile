/**
 * Hook to fetch and process Discogs collection (Windows GUI pipeline).
 */

import { useState, useCallback } from 'react';
import type { ReleaseRow, SortBy } from '../types';
import { GUI_BUILD_SORT } from '../types';
import {
  createDiscogsClient,
  getIdentity,
  getCollectionCount,
  iterateCollection,
  attachPricesToRows,
  type DiscogsCollectionRelease,
} from '../services/discogsApi';
import {
  getStoredCredentials,
  isLocalCredentials,
  localSessionName,
  type DiscogsCredentials,
} from '../services/auth';
import { loadLocalCollection } from '../services/localCollection';
import {
  collectAllRows,
  sortRows,
} from '../domain/sorting';
import { filterRowsByFormat } from '../domain/formatFilter';
import { formatsToSet, loadSettings } from '../services/settings';
import {
  applyManualOrder,
  setManualOrderUsername,
} from '../services/manualOrder';
import {
  applyGenreOverrides,
} from '../services/genreOverrides';
import {
  syncGenreOverridesWithDiscogs,
} from '../services/genreSync';
import {
  markFullFetch,
  setCacheUsername,
  saveCachedRows,
  loadCachedRows,
  getLastFullFetch,
} from '../services/collectionCache';
import { syncWishlistFromDiscogs } from '../services/wishlist';
import { refreshProStatus } from '../services/licensing';
import {
  applyRecordLimit,
  canFetchPrices,
} from '../services/featureGate';

export type CollectionState =
  | { status: 'idle' }
  | { status: 'loading'; message?: string; progress?: number }
  | { status: 'error'; error: string }
  | {
      status: 'success';
      rows: ReleaseRow[];
      username: string;
      stale?: boolean;
      /** Epoch ms of last successful full sync (from cache metadata when stale). */
      lastSyncedAt?: number | null;
      truncated?: boolean;
      itemCount?: number;
      /** Marketplace prices still loading in the background */
      pricesLoading?: boolean;
      priceProgress?: number;
    };

export function useCollection() {
  const [state, setState] = useState<CollectionState>({ status: 'idle' });

  const fetchCollection = useCallback(
    async (credentialsOverride?: DiscogsCredentials) => {
      setState({ status: 'loading', message: 'Connecting to Discogs…' });

      try {
        const credentials =
          credentialsOverride ?? (await getStoredCredentials());
        if (!credentials) {
          setState({ status: 'error', error: 'Not signed in' });
          return;
        }

        const loadImportedCollection = async () => {
          setState({
            status: 'loading',
            message: 'Loading imported collection…',
          });
          const settings = await loadSettings();
          const pro = await refreshProStatus();
          const allRows = (await loadLocalCollection()) ?? [];
          const localName = localSessionName(credentials);
          await setCacheUsername(localName);
          await setManualOrderUsername(localName);
          const formatSet = formatsToSet(settings.formats);
          let processed = filterRowsByFormat(allRows, formatSet);
          processed = await applyGenreOverrides(processed);
          const { rows: limited, truncated } = applyRecordLimit(
            processed,
            pro
          );
          processed = limited;
          processed = sortRows(
            processed,
            GUI_BUILD_SORT.variousPolicy,
            settings.sort_by as SortBy
          );
          processed = await applyManualOrder(processed);
          await markFullFetch(localName, allRows.length);
          await saveCachedRows(localName, processed);
          setState({
            status: 'success',
            rows: processed,
            username: localName,
            itemCount: allRows.length,
            stale: false,
            lastSyncedAt: Date.now(),
            truncated,
          });
        };

        if (isLocalCredentials(credentials)) {
          await loadImportedCollection();
          return;
        }

        const settings = await loadSettings();
        const pro = await refreshProStatus();
        const client = createDiscogsClient(credentials);
        const identity = await getIdentity(client);

        setState({
          status: 'loading',
          message: `Fetching ${identity.username}'s collection…`,
        });

        await setCacheUsername(identity.username);
        await setManualOrderUsername(identity.username);

        const items: DiscogsCollectionRelease[] = [];
        for await (const item of iterateCollection(
          client,
          identity.username,
          0,
          settings.per_page,
          undefined,
          ({ page, totalPages, loadedCount }) => {
            setState({
              status: 'loading',
              message: `Fetching page ${page} of ${totalPages}… (${loadedCount} releases)`,
              progress: Math.min(1, page / totalPages),
            });
          }
        )) {
          items.push(item);
        }

        const allRows = collectAllRows(items, {
          lastNameFirst: GUI_BUILD_SORT.lastNameFirst,
          lnfAllow3: GUI_BUILD_SORT.lnfAllow3,
          lnfExclude: GUI_BUILD_SORT.lnfExclude,
          lnfSafeBands: GUI_BUILD_SORT.lnfSafeBands,
        });

        try {
          await syncGenreOverridesWithDiscogs(
            client,
            identity.username,
            allRows
          );
        } catch {
          // genre sync is best-effort
        }

        const formatSet = formatsToSet(settings.formats);
        let processed = filterRowsByFormat(allRows, formatSet);
        processed = await applyGenreOverrides(processed);

        const { rows: limited, truncated } = applyRecordLimit(processed, pro);
        processed = limited;

        const wantPrices =
          (settings.show_prices ||
            settings.sort_by === 'price_asc' ||
            settings.sort_by === 'price_desc') &&
          canFetchPrices(pro);
        const sortByPrice =
          settings.sort_by === 'price_asc' ||
          settings.sort_by === 'price_desc';
        const deferPrices = wantPrices && !sortByPrice;

        if (wantPrices && sortByPrice) {
          setState({
            status: 'loading',
            message: 'Fetching marketplace prices…',
            progress: undefined,
          });
          await attachPricesToRows(
            client,
            processed,
            settings.currency,
            (done, total) => {
              setState({
                status: 'loading',
                message: `Prices ${done}/${total}…`,
                progress: total > 0 ? done / total : undefined,
              });
            }
          );
        }

        processed = sortRows(
          processed,
          GUI_BUILD_SORT.variousPolicy,
          settings.sort_by as SortBy
        );

        processed = await applyManualOrder(processed);

        const itemCount = await getCollectionCount(client, identity.username);
        await markFullFetch(identity.username, itemCount);
        const lastSyncedAt = Date.now();

        try {
          await syncWishlistFromDiscogs(client, identity.username);
        } catch {
          // wishlist sync is best-effort
        }

        await saveCachedRows(identity.username, processed);

        if (deferPrices) {
          setState({
            status: 'success',
            rows: processed,
            username: identity.username,
            itemCount,
            stale: false,
            lastSyncedAt,
            truncated,
            pricesLoading: true,
            priceProgress: 0,
          });

          void attachPricesToRows(
            client,
            processed,
            settings.currency,
            (done, total) => {
              setState((prev) =>
                prev.status === 'success' &&
                prev.username === identity.username
                  ? {
                      ...prev,
                      priceProgress: total > 0 ? done / total : undefined,
                    }
                  : prev
              );
            }
          )
            .then(async () => {
              await saveCachedRows(identity.username, processed);
              setState((prev) =>
                prev.status === 'success' &&
                prev.username === identity.username
                  ? {
                      ...prev,
                      rows: processed,
                      pricesLoading: false,
                      priceProgress: undefined,
                    }
                  : prev
              );
            })
            .catch(() => {
              setState((prev) =>
                prev.status === 'success' &&
                prev.username === identity.username
                  ? { ...prev, pricesLoading: false, priceProgress: undefined }
                  : prev
              );
            });
          return;
        }

        setState({
          status: 'success',
          rows: processed,
          username: identity.username,
          itemCount,
          stale: false,
          lastSyncedAt,
          truncated,
        });
      } catch (err) {
        const cached = await loadCachedRows();
        if (cached) {
          const lastSyncedAt =
            cached.saved_at ?? (await getLastFullFetch());
          const pro = await refreshProStatus();
          const { rows: limited, truncated } = applyRecordLimit(
            cached.rows,
            pro
          );
          const withGenres = await applyGenreOverrides(limited);
          setState({
            status: 'success',
            rows: withGenres,
            username: cached.username,
            stale: true,
            lastSyncedAt,
            truncated,
          });
          return;
        }
        const message =
          err instanceof Error ? err.message : 'Failed to fetch collection';
        setState({ status: 'error', error: message });
      }
    },
    []
  );

  const reset = useCallback(() => {
    setState({ status: 'idle' });
  }, []);

  /** Re-fetch marketplace prices in the current settings currency (no full collection reload). */
  const repriceCollection = useCallback(
    async (credentials: DiscogsCredentials) => {
      const settings = await loadSettings();
      const pro = await refreshProStatus();
      const needPrices =
        credentials.type !== 'local' &&
        (settings.show_prices ||
          settings.sort_by === 'price_asc' ||
          settings.sort_by === 'price_desc') &&
        canFetchPrices(pro);

      setState((prev) => {
        if (prev.status !== 'success' || !needPrices) return prev;

        const { rows, username, itemCount, truncated, lastSyncedAt } = prev;

        void (async () => {
          try {
            const client = createDiscogsClient(credentials);
            await attachPricesToRows(
              client,
              rows,
              settings.currency,
              (done, total) => {
                setState((p) =>
                  p.status === 'success' && p.username === username
                    ? {
                        ...p,
                        pricesLoading: true,
                        priceProgress: total > 0 ? done / total : undefined,
                      }
                    : p
                );
              }
            );

            let processed = sortRows(
              rows,
              GUI_BUILD_SORT.variousPolicy,
              settings.sort_by as SortBy
            );
            processed = await applyManualOrder(processed);
            await saveCachedRows(username, processed);

            setState({
              status: 'success',
              rows: processed,
              username,
              itemCount,
              stale: false,
              lastSyncedAt,
              truncated,
              pricesLoading: false,
              priceProgress: undefined,
            });
          } catch {
            setState((p) =>
              p.status === 'success' && p.username === username
                ? { ...p, pricesLoading: false, priceProgress: undefined }
                : p
            );
          }
        })();

        return {
          ...prev,
          pricesLoading: true,
          priceProgress: 0,
        };
      });
    },
    []
  );

  const applyGenreEdits = useCallback(async () => {
    const settings = await loadSettings();
    setState((prev) => {
      if (prev.status !== 'success') return prev;
      const { rows, username } = prev;
      void (async () => {
        let processed = await applyGenreOverrides(rows);
        processed = sortRows(
          processed,
          GUI_BUILD_SORT.variousPolicy,
          settings.sort_by as SortBy
        );
        processed = await applyManualOrder(processed);
        await saveCachedRows(username, processed);
        setState((p) =>
          p.status === 'success' && p.username === username
            ? { ...p, rows: processed }
            : p
        );
      })();
      return prev;
    });
  }, []);

  const refreshCollection = useCallback(
    async (credentials: DiscogsCredentials) => {
      await fetchCollection(credentials);
    },
    [fetchCollection]
  );

  return {
    state,
    fetchCollection,
    refreshCollection,
    repriceCollection,
    applyGenreEdits,
    reset,
  };
}
