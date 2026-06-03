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
  type DiscogsCredentials,
} from '../services/auth';
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
  markFullFetch,
  setCacheUsername,
  saveCachedRows,
  loadCachedRows,
} from '../services/collectionCache';
import { syncWishlistFromDiscogs } from '../services/wishlist';

export type CollectionState =
  | { status: 'idle' }
  | { status: 'loading'; message?: string }
  | { status: 'error'; error: string }
  | {
      status: 'success';
      rows: ReleaseRow[];
      username: string;
      stale?: boolean;
      itemCount?: number;
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

        const settings = await loadSettings();
        const client = createDiscogsClient(credentials);
        const identity = await getIdentity(client);

        setState({
          status: 'loading',
          message: `Fetching ${identity.username}'s collection…`,
        });

        await setCacheUsername(identity.username);
        await setManualOrderUsername(identity.username);

        const items: DiscogsCollectionRelease[] = [];
        let count = 0;
        for await (const item of iterateCollection(
          client,
          identity.username,
          0,
          settings.per_page
        )) {
          items.push(item);
          count += 1;
          if (count % 50 === 0) {
            setState({
              status: 'loading',
              message: `Loaded ${count} releases…`,
            });
          }
        }

        const allRows = collectAllRows(items, {
          lastNameFirst: GUI_BUILD_SORT.lastNameFirst,
          lnfAllow3: GUI_BUILD_SORT.lnfAllow3,
          lnfExclude: GUI_BUILD_SORT.lnfExclude,
          lnfSafeBands: GUI_BUILD_SORT.lnfSafeBands,
        });

        const formatSet = formatsToSet(settings.formats);
        let processed = filterRowsByFormat(allRows, formatSet);

        const needPrices =
          settings.show_prices ||
          settings.sort_by === 'price_asc' ||
          settings.sort_by === 'price_desc';

        if (needPrices) {
          setState({
            status: 'loading',
            message: 'Fetching marketplace prices…',
          });
          await attachPricesToRows(
            client,
            processed,
            settings.currency,
            (done, total) => {
              setState({
                status: 'loading',
                message: `Prices ${done}/${total}…`,
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

        try {
          await syncWishlistFromDiscogs(client, identity.username);
        } catch {
          // wishlist sync is best-effort
        }

        await saveCachedRows(identity.username, processed);

        setState({
          status: 'success',
          rows: processed,
          username: identity.username,
          itemCount,
          stale: false,
        });
      } catch (err) {
        const cached = await loadCachedRows();
        if (cached) {
          setState({
            status: 'success',
            rows: cached.rows,
            username: cached.username,
            stale: true,
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

  return { state, fetchCollection, reset };
}
