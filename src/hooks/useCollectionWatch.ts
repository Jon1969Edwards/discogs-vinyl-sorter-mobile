/**
 * Foreground poll: rebuild when Discogs collection item count changes.
 */

import { useEffect, useRef, useCallback } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import {
  createDiscogsClient,
  getCollectionCount,
  getIdentity,
} from '../services/discogsApi';
import { getStoredCredentials } from '../services/auth';
import {
  getLastCollectionCount,
  getLastFullFetch,
} from '../services/collectionCache';
import { loadSettings } from '../services/settings';

export function useCollectionWatch(
  onCountChanged: () => void,
  enabled: boolean
) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  const checkCount = useCallback(async () => {
    try {
      const credentials = await getStoredCredentials();
      if (!credentials || credentials.type === 'local') return;

      const client = createDiscogsClient(credentials);
      const identity = await getIdentity(client);
      const count = await getCollectionCount(client, identity.username);
      const cached = await getLastCollectionCount();

      if (cached !== null && count !== cached) {
        onCountChanged();
      }
    } catch {
      // ignore poll errors
    }
  }, [onCountChanged]);

  useEffect(() => {
    if (!enabled) return;

    const startPoll = async () => {
      const settings = await loadSettings();
      const ms = Math.max(60, settings.poll_seconds) * 1000;
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(checkCount, ms);
    };

    const sub = AppState.addEventListener('change', (next) => {
      if (
        appState.current.match(/inactive|background/) &&
        next === 'active'
      ) {
        checkCount();
        startPoll();
      }
      appState.current = next;
    });

    if (AppState.currentState === 'active') {
      checkCount();
      startPoll();
    }

    return () => {
      sub.remove();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, checkCount]);

  return { getLastFullFetch };
}
