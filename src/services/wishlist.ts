/**
 * Local wishlist + Discogs wantlist sync.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AxiosInstance } from 'axios';
import type { WishlistEntry } from '../types';
import { apiGet } from './discogsApi';

const WISHLIST_KEY = 'discogs_wishlist';

interface WishlistData {
  version: number;
  entries: WishlistEntry[];
}

const EMPTY: WishlistData = { version: 1, entries: [] };

export async function loadLocalWishlist(): Promise<WishlistEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(WISHLIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WishlistData;
    if (parsed.version === 1) return parsed.entries || [];
  } catch {
    // ignore
  }
  return [];
}

export async function saveLocalWishlist(entries: WishlistEntry[]): Promise<void> {
  await AsyncStorage.setItem(
    WISHLIST_KEY,
    JSON.stringify({ version: 1, entries })
  );
}

export async function addToWishlist(entry: WishlistEntry): Promise<WishlistEntry[]> {
  const list = await loadLocalWishlist();
  const key = `${entry.artist}|${entry.title}`;
  if (!list.some((e) => `${e.artist}|${e.title}` === key)) {
    list.push(entry);
    await saveLocalWishlist(list);
  }
  return list;
}

export async function removeFromWishlist(
  artist: string,
  title: string
): Promise<WishlistEntry[]> {
  const list = await loadLocalWishlist();
  const next = list.filter(
    (e) => !(e.artist === artist && e.title === title)
  );
  await saveLocalWishlist(next);
  return next;
}

export function isInWishlist(
  list: WishlistEntry[],
  artist: string,
  title: string
): boolean {
  return list.some((e) => e.artist === artist && e.title === title);
}

interface WantlistItem {
  basic_information?: {
    title?: string;
    year?: number;
    thumb?: string;
    cover_image?: string;
    resource_url?: string;
    artists?: Array<{ name: string }>;
  };
}

interface WantlistResponse {
  wants?: WantlistItem[];
  pagination?: { page?: number; pages?: number };
}

export async function fetchDiscogsWantlist(
  client: AxiosInstance,
  username: string,
  perPage = 100
): Promise<WishlistEntry[]> {
  const wantlist: WishlistEntry[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const data = await apiGet<WantlistResponse>(
      client,
      `/users/${username}/wants`,
      { page: String(page), per_page: String(perPage) }
    );
    totalPages = data.pagination?.pages ?? page;
    for (const item of data.wants ?? []) {
      const basic = item.basic_information || {};
      const artist = (basic.artists || []).map((a) => a.name).join(', ');
      wantlist.push({
        artist,
        title: basic.title || '',
        year: basic.year,
        discogs_url: basic.resource_url || '',
        thumb: basic.thumb || '',
        cover_image_url: basic.cover_image || '',
      });
    }
    page += 1;
  }
  return wantlist;
}

export async function syncWishlistFromDiscogs(
  client: AxiosInstance,
  username: string
): Promise<WishlistEntry[]> {
  const remote = await fetchDiscogsWantlist(client, username);
  await saveLocalWishlist(remote);
  return remote;
}
