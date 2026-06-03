import { useState, useCallback, useEffect } from 'react';
import type { WishlistEntry } from '../types';
import {
  loadLocalWishlist,
  addToWishlist,
  removeFromWishlist,
} from '../services/wishlist';

export function useWishlist() {
  const [entries, setEntries] = useState<WishlistEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const list = await loadLocalWishlist();
    setEntries(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const add = useCallback(
    async (entry: WishlistEntry) => {
      const next = await addToWishlist(entry);
      setEntries(next);
    },
    []
  );

  const remove = useCallback(async (artist: string, title: string) => {
    const next = await removeFromWishlist(artist, title);
    setEntries(next);
  }, []);

  return { entries, loading, refresh, add, remove };
}
