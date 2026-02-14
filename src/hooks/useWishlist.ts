/**
 * Hook to fetch Discogs wantlist (items you want to buy).
 * Uses /users/{username}/wants – not collection folder 1.
 */

import { useState, useCallback } from 'react';
import type { ReleaseRow } from '../types';
import {
  createDiscogsClient,
  getIdentity,
  iterateWantlist,
  type DiscogsCollectionRelease,
  type DiscogsWant,
} from '../services';
import { buildReleaseRow } from '../utils';

/** Adapt wantlist item to collection-release shape for buildReleaseRow. */
function wantToCollectionRelease(want: DiscogsWant): DiscogsCollectionRelease {
  return {
    id: want.id,
    instance_id: 0,
    date_added: want.date_added,
    rating: want.rating,
    basic_information: want.basic_information,
    notes: want.notes ?? '',
  };
}

export type WishlistState =
  | { status: 'idle' }
  | { status: 'loading'; message?: string }
  | { status: 'error'; error: string }
  | { status: 'success'; rows: ReleaseRow[]; username: string };

export function useWishlist() {
  const [state, setState] = useState<WishlistState>({ status: 'idle' });

  const fetchWishlist = useCallback(async (token: string) => {
    setState({ status: 'loading', message: 'Connecting to Discogs…' });

    try {
      const client = createDiscogsClient(token);
      const identity = await getIdentity(client);
      setState({
        status: 'loading',
        message: `Fetching ${identity.username}'s wantlist…`,
      });

      const rows: ReleaseRow[] = [];
      let count = 0;

      for await (const want of iterateWantlist(client, identity.username)) {
        const basic = want.basic_information;
        if (!basic) continue;

        rows.push(buildReleaseRow(wantToCollectionRelease(want)));
        count += 1;
        if (count % 50 === 0) {
          setState({
            status: 'loading',
            message: `Loaded ${count} items…`,
          });
        }
      }

      setState({
        status: 'success',
        rows,
        username: identity.username,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch wishlist';
      setState({ status: 'error', error: message });
    }
  }, []);

  const reset = useCallback(() => {
    setState({ status: 'idle' });
  }, []);

  return { state, fetchWishlist, reset };
}
