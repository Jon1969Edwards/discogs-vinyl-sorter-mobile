/**
 * Hook to fetch and process Discogs LP collection.
 */

import { useState, useCallback } from 'react';
import type { ReleaseRow } from '../types';
import {
  createDiscogsClient,
  getIdentity,
  iterateCollection,
  type DiscogsCollectionRelease,
} from '../services';
import { buildReleaseRow, isLp33, sortRows } from '../utils';

export type CollectionState =
  | { status: 'idle' }
  | { status: 'loading'; message?: string }
  | { status: 'error'; error: string }
  | { status: 'success'; rows: ReleaseRow[]; username: string };

export function useCollection() {
  const [state, setState] = useState<CollectionState>({ status: 'idle' });

  const fetchCollection = useCallback(async (token: string) => {
    setState({ status: 'loading', message: 'Connecting to Discogs…' });

    try {
      const client = createDiscogsClient(token);
      const identity = await getIdentity(client);
      setState({
        status: 'loading',
        message: `Fetching ${identity.username}'s collection…`,
      });

      const rows: ReleaseRow[] = [];
      let count = 0;

      for await (const item of iterateCollection(client, identity.username)) {
        const basic = (item as DiscogsCollectionRelease).basic_information;
        if (!basic || !isLp33(basic)) continue;

        rows.push(buildReleaseRow(item as DiscogsCollectionRelease));
        count += 1;
        if (count % 50 === 0) {
          setState({
            status: 'loading',
            message: `Loaded ${count} LPs…`,
          });
        }
      }

      const sorted = sortRows(rows, 'last', 'artist');

      setState({
        status: 'success',
        rows: sorted,
        username: identity.username,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch collection';
      setState({ status: 'error', error: message });
    }
  }, []);

  const reset = useCallback(() => {
    setState({ status: 'idle' });
  }, []);

  return { state, fetchCollection, reset };
}
