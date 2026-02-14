/**
 * Hook to fetch Discogs wishlist (folder 1).
 * Returns all items (no LP filter) – vinyl, CD, etc.
 */

import { useState, useCallback } from 'react';
import type { ReleaseRow } from '../types';
import {
  createDiscogsClient,
  getIdentity,
  iterateCollection,
  type DiscogsCollectionRelease,
} from '../services';
import { buildReleaseRow } from '../utils';

export type WishlistState =
  | { status: 'idle' }
  | { status: 'loading'; message?: string }
  | { status: 'error'; error: string }
  | { status: 'success'; rows: ReleaseRow[]; username: string };

const WISHLIST_FOLDER_ID = 1;

export function useWishlist() {
  const [state, setState] = useState<WishlistState>({ status: 'idle' });

  const fetchWishlist = useCallback(async (token: string) => {
    setState({ status: 'loading', message: 'Connecting to Discogs…' });

    try {
      const client = createDiscogsClient(token);
      const identity = await getIdentity(client);
      setState({
        status: 'loading',
        message: `Fetching ${identity.username}'s wishlist…`,
      });

      const rows: ReleaseRow[] = [];
      let count = 0;

      for await (const item of iterateCollection(
        client,
        identity.username,
        WISHLIST_FOLDER_ID
      )) {
        const basic = (item as DiscogsCollectionRelease).basic_information;
        if (!basic) continue;

        rows.push(buildReleaseRow(item as DiscogsCollectionRelease));
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
