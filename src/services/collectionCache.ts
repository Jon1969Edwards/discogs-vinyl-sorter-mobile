/**
 * Collection + price cache (mirrors Windows .discogs_collection_cache.json).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ReleaseRow } from '../types';

const CACHE_KEY = 'discogs_collection_cache';
const ROWS_KEY = 'discogs_collection_rows_cache';
export const PRICE_CACHE_MAX_AGE_MS = 86400 * 7 * 1000;

interface PriceEntry {
  lowest_price: number | null;
  num_for_sale: number | null;
  fetched_at: number;
}

interface ReleaseCacheEntry {
  cached_at: number;
  prices?: Record<string, PriceEntry>;
}

interface CollectionCacheData {
  version: number;
  username: string | null;
  releases: Record<string, ReleaseCacheEntry>;
  last_full_fetch: number | null;
  collection_item_count: number | null;
}

const EMPTY: CollectionCacheData = {
  version: 1,
  username: null,
  releases: {},
  last_full_fetch: null,
  collection_item_count: null,
};

async function load(): Promise<CollectionCacheData> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as CollectionCacheData;
    if (parsed.version === 1) return parsed;
  } catch {
    // ignore
  }
  return { ...EMPTY };
}

async function save(data: CollectionCacheData): Promise<void> {
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
}

export async function setCacheUsername(username: string): Promise<void> {
  const data = await load();
  if (data.username !== username) {
    await save({ ...EMPTY, username });
  } else {
    data.username = username;
    await save(data);
  }
}

export async function getCachedPrice(
  releaseId: number,
  currency: string
): Promise<{ lowest: number | null; numForSale: number | null; stale: boolean }> {
  const data = await load();
  const release = data.releases[String(releaseId)];
  if (!release?.prices?.[currency]) {
    return { lowest: null, numForSale: null, stale: true };
  }
  const p = release.prices[currency];
  const stale = Date.now() - (p.fetched_at || 0) > PRICE_CACHE_MAX_AGE_MS;
  return {
    lowest: p.lowest_price ?? null,
    numForSale: p.num_for_sale ?? null,
    stale,
  };
}

export async function setCachedPrice(
  releaseId: number,
  currency: string,
  lowest: number | null,
  numForSale: number | null
): Promise<void> {
  const data = await load();
  const key = String(releaseId);
  if (!data.releases[key]) {
    data.releases[key] = { cached_at: Date.now() };
  }
  if (!data.releases[key].prices) data.releases[key].prices = {};
  data.releases[key].prices![currency] = {
    lowest_price: lowest,
    num_for_sale: numForSale,
    fetched_at: Date.now(),
  };
  await save(data);
}

export async function markFullFetch(username: string, itemCount: number): Promise<void> {
  const data = await load();
  data.username = username;
  data.last_full_fetch = Date.now();
  data.collection_item_count = itemCount;
  await save(data);
}

export async function getLastCollectionCount(): Promise<number | null> {
  const data = await load();
  return data.collection_item_count;
}

export async function getLastFullFetch(): Promise<number | null> {
  const data = await load();
  return data.last_full_fetch;
}

export async function clearCollectionCache(): Promise<void> {
  await save({ ...EMPTY });
  await AsyncStorage.removeItem(ROWS_KEY);
}

function serializeRow(r: ReleaseRow): Record<string, unknown> {
  return {
    ...r,
    format_categories: r.format_categories
      ? [...r.format_categories]
      : undefined,
  };
}

function deserializeRow(raw: Record<string, unknown>): ReleaseRow {
  const cats = raw.format_categories;
  return {
    ...(raw as ReleaseRow),
    format_categories: Array.isArray(cats)
      ? new Set(cats as string[])
      : undefined,
  };
}

export async function saveCachedRows(
  username: string,
  rows: ReleaseRow[]
): Promise<void> {
  await AsyncStorage.setItem(
    ROWS_KEY,
    JSON.stringify({
      username,
      rows: rows.map(serializeRow),
      saved_at: Date.now(),
    })
  );
}

export async function loadCachedRows(): Promise<{
  username: string;
  rows: ReleaseRow[];
  saved_at: number;
} | null> {
  try {
    const raw = await AsyncStorage.getItem(ROWS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      username: string;
      rows: Record<string, unknown>[];
      saved_at: number;
    };
    return {
      username: parsed.username,
      rows: parsed.rows.map(deserializeRow),
      saved_at: parsed.saved_at,
    };
  } catch {
    return null;
  }
}
