/**
 * Discogs API client with retry logic and rate limiting.
 * Mirrors the Windows app's api.py behavior.
 * Supports both PAT (token) and OAuth 1.0a authentication.
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import OAuth from 'oauth-1.0a';
import CryptoJS from 'crypto-js';
import {
  DISCOGS_CONSUMER_KEY,
  DISCOGS_CONSUMER_SECRET,
} from '@env';
import type { DiscogsCredentials } from './auth';
import {
  batchSetCachedPrices,
  getFreshPriceEntries,
} from './collectionCache';
import { DEFAULT_USER_AGENT } from '../constants/version';

const API_BASE = 'https://api.discogs.com';
const USER_AGENT = DEFAULT_USER_AGENT;

function hmacSha1Base64(message: string, key: string): string {
  const hash = CryptoJS.HmacSHA1(message, key);
  return CryptoJS.enc.Base64.stringify(hash);
}

// ---------------------------------------------------------------------------
// Types (Discogs API responses)
// ---------------------------------------------------------------------------

export interface DiscogsIdentity {
  username: string;
  resource_url: string;
  consumer_name?: string;
}

export interface DiscogsPagination {
  page: number;
  pages: number;
  per_page: number;
  items: number;
  urls?: Record<string, string>;
}

export interface DiscogsCollectionRelease {
  id: number;
  instance_id: number;
  folder_id?: number;
  date_added: string;
  rating?: number;
  basic_information: {
    id: number;
    title: string;
    year?: number;
    thumb?: string;
    cover_image?: string;
    format?: string;
    formats?: Array<{ name: string; qty: string; descriptions?: string[] }>;
    labels?: Array<{ name: string; catno: string }>;
    artists?: Array<{ name: string; join?: string }>;
    artist?: string;
    country?: string;
    genres?: string[];
    styles?: string[];
    resource_url: string;
  };
  notes?: string | Array<{ field_id: number; value: string }>;
}

export interface DiscogsCollectionResponse {
  pagination: DiscogsPagination;
  releases: DiscogsCollectionRelease[];
}

/** Wantlist item – items you want to buy (different from collection folders). */
export interface DiscogsWant {
  id: number;
  resource_url: string;
  date_added: string;
  rating?: number;
  basic_information: DiscogsCollectionRelease['basic_information'];
  notes?: string;
}

export interface DiscogsWantlistResponse {
  pagination: DiscogsPagination;
  wants: DiscogsWant[];
}

export interface DiscogsMarketplaceStats {
  lowest_price?: { value: number; currency: string };
  num_for_sale: number;
  blocked_from_sale?: boolean;
}

// ---------------------------------------------------------------------------
// API client factory
// ---------------------------------------------------------------------------

/**
 * Create a Discogs API client. Accepts either credentials object (PAT or OAuth)
 * or a legacy token string (treated as PAT).
 */
export function createDiscogsClient(
  credentialsOrToken: DiscogsCredentials | string
): AxiosInstance {
  const cred: DiscogsCredentials =
    typeof credentialsOrToken === 'string'
      ? { type: 'pat', token: credentialsOrToken }
      : credentialsOrToken;

  if (cred.type === 'local') {
    throw new Error('Imported collections are not connected to Discogs.');
  }

  const client = axios.create({
    baseURL: API_BASE,
    timeout: 30000,
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
    },
  });

  if (cred.type === 'pat') {
    client.defaults.headers.common['Authorization'] = `Discogs token=${cred.token}`;
  } else if (cred.type === 'oauth') {
    // OAuth 1.0a: sign each request
    if (!DISCOGS_CONSUMER_KEY || !DISCOGS_CONSUMER_SECRET) {
      throw new Error(
        'OAuth requires DISCOGS_CONSUMER_KEY and DISCOGS_CONSUMER_SECRET in .env'
      );
    }
    const oauth = new OAuth({
      consumer: {
        key: DISCOGS_CONSUMER_KEY,
        secret: DISCOGS_CONSUMER_SECRET,
      },
      signature_method: 'HMAC-SHA1',
      hash_function(baseString: string, key: string) {
        return hmacSha1Base64(baseString, key);
      },
    });
    const token = { key: cred.token, secret: cred.secret };

    client.interceptors.request.use((config) => {
      const url = config.url ?? '';
      const base = config.baseURL ?? API_BASE;
      const fullUrl = base.replace(/\/$/, '') + (url.startsWith('/') ? url : '/' + url);
      const params = (config.params as Record<string, string> | undefined) ?? {};
      const method = (config.method ?? 'GET').toUpperCase();
      const requestData = {
        url: fullUrl,
        method,
        data: params,
      };
      const authHeader = oauth.toHeader(oauth.authorize(requestData, token));
      config.headers = config.headers ?? {};
      config.headers['Authorization'] = authHeader.Authorization;
      return config;
    });
  }

  // Response interceptor: rate limit pause
  client.interceptors.response.use(
    (response) => {
      const remaining = parseInt(
        response.headers['x-discogs-ratelimit-remaining'] ?? '5',
        10
      );
      if (remaining <= 1) {
        // Will be handled async – we can't block on React Native, so we just
        // let the next request potentially hit rate limit. The retry will handle it.
      }
      return response;
    },
    (error) => Promise.reject(error)
  );

  return client;
}

// ---------------------------------------------------------------------------
// Retry helper
// ---------------------------------------------------------------------------

function shouldRetry(status: number): boolean {
  return status === 429 || (status >= 500 && status < 600);
}

function getRetryDelay(response: AxiosResponse | undefined, attempt: number): number {
  const backoff = 1.0;
  if (response?.headers['retry-after']) {
    const val = parseFloat(response.headers['retry-after']);
    if (!Number.isNaN(val)) return val * 1000; // convert to ms
  }
  return Math.min(backoff * Math.pow(2, attempt) * 1000, 10000);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Request wrapper with retries
// ---------------------------------------------------------------------------

export async function apiGet<T>(
  client: AxiosInstance,
  url: string,
  params?: Record<string, string>,
  retries = 3
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await client.get<T>(url, { params });
      return response.data;
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const axErr = err as { response?: AxiosResponse; isAxiosError?: boolean };

      if (axErr?.isAxiosError && axErr.response) {
        const status = axErr.response.status;
        if (shouldRetry(status) && attempt < retries - 1) {
          const delay = getRetryDelay(axErr.response, attempt);
          await sleep(delay);
          continue;
        }
      }

      // Network error (no response) – retry
      if (!axErr?.response && attempt < retries - 1) {
        const delay = getRetryDelay(undefined, attempt);
        await sleep(delay);
        continue;
      }

      throw lastError;
    }
  }

  throw lastError ?? new Error('API request failed after retries');
}

export async function apiPost(
  client: AxiosInstance,
  url: string,
  params?: Record<string, string>,
  retries = 3
): Promise<void> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      await client.post(url, undefined, { params });
      return;
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const axErr = err as { response?: AxiosResponse; isAxiosError?: boolean };

      if (axErr?.isAxiosError && axErr.response) {
        const status = axErr.response.status;
        if (shouldRetry(status) && attempt < retries - 1) {
          const delay = getRetryDelay(axErr.response, attempt);
          await sleep(delay);
          continue;
        }
      }

      if (!axErr?.response && attempt < retries - 1) {
        const delay = getRetryDelay(undefined, attempt);
        await sleep(delay);
        continue;
      }

      throw lastError;
    }
  }

  throw lastError ?? new Error('API request failed after retries');
}

// ---------------------------------------------------------------------------
// API methods
// ---------------------------------------------------------------------------

export async function getIdentity(client: AxiosInstance): Promise<DiscogsIdentity> {
  return apiGet<DiscogsIdentity>(client, '/oauth/identity');
}

export async function fetchCollectionPage(
  client: AxiosInstance,
  username: string,
  folderId: number,
  page: number,
  perPage: number
): Promise<DiscogsCollectionResponse> {
  return apiGet<DiscogsCollectionResponse>(
    client,
    `/users/${username}/collection/folders/${folderId}/releases`,
    {
      page: String(page),
      per_page: String(perPage),
      sort: 'artist',
      sort_order: 'asc',
    }
  );
}

export type CollectionPageProgress = {
  page: number;
  totalPages: number;
  loadedCount: number;
};

export async function* iterateCollection(
  client: AxiosInstance,
  username: string,
  folderId = 0,
  perPage = 100,
  maxPages?: number,
  onPageLoaded?: (info: CollectionPageProgress) => void
): AsyncGenerator<DiscogsCollectionRelease> {
  let page = 1;
  let totalPages: number | null = null;
  let loadedCount = 0;

  while (true) {
    const data = await fetchCollectionPage(
      client,
      username,
      folderId,
      page,
      perPage
    );

    if (totalPages === null) {
      totalPages = data.pagination.pages ?? 1;
    }

    for (const item of data.releases ?? []) {
      loadedCount += 1;
      yield item;
    }

    onPageLoaded?.({
      page,
      totalPages: totalPages ?? 1,
      loadedCount,
    });

    page += 1;
    if (maxPages !== undefined && page > maxPages) break;
    if (totalPages !== null && page > totalPages) break;
  }
}

// ---------------------------------------------------------------------------
// Wantlist API (items you want to buy – different from collection folders)
// ---------------------------------------------------------------------------

export async function fetchWantlistPage(
  client: AxiosInstance,
  username: string,
  page: number,
  perPage: number
): Promise<DiscogsWantlistResponse> {
  return apiGet<DiscogsWantlistResponse>(
    client,
    `/users/${username}/wants`,
    {
      page: String(page),
      per_page: String(perPage),
    }
  );
}

export async function* iterateWantlist(
  client: AxiosInstance,
  username: string,
  perPage = 100,
  maxPages?: number
): AsyncGenerator<DiscogsWant> {
  let page = 1;
  let totalPages: number | null = null;

  while (true) {
    const data = await fetchWantlistPage(client, username, page, perPage);

    if (totalPages === null) {
      totalPages = data.pagination.pages ?? 1;
    }

    for (const item of data.wants ?? []) {
      yield item;
    }

    page += 1;
    if (maxPages !== undefined && page > maxPages) break;
    if (totalPages !== null && page > totalPages) break;
  }
}

export async function getCollectionCount(
  client: AxiosInstance,
  username: string
): Promise<number> {
  const data = await apiGet<DiscogsCollectionResponse>(
    client,
    `/users/${username}/collection/folders/0/releases`,
    { page: '1', per_page: '1' }
  );
  return data.pagination?.items ?? 0;
}

const PRICE_FETCH_CONCURRENCY = 6;

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  if (items.length === 0) return;
  let next = 0;
  const poolSize = Math.min(concurrency, items.length);
  await Promise.all(
    Array.from({ length: poolSize }, async () => {
      while (true) {
        const i = next++;
        if (i >= items.length) break;
        await worker(items[i]);
      }
    })
  );
}

export async function attachPricesToRows(
  client: AxiosInstance,
  rows: import('../types').ReleaseRow[],
  currency: string,
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  const withIds = rows.filter((r) => r.release_id != null);
  const total = withIds.length;
  let done = 0;
  const bump = () => {
    done += 1;
    onProgress?.(done, total);
  };

  const freshCache = await getFreshPriceEntries(currency);
  const toFetch: typeof withIds = [];

  for (const row of withIds) {
    const cached = freshCache.get(row.release_id!);
    if (cached) {
      row.lowest_price = cached.lowest;
      row.num_for_sale = cached.numForSale;
      row.price_currency = currency;
      bump();
    } else {
      toFetch.push(row);
    }
  }

  const pendingUpdates: Array<{
    releaseId: number;
    lowest: number | null;
    numForSale: number | null;
  }> = [];

  await runWithConcurrency(toFetch, PRICE_FETCH_CONCURRENCY, async (row) => {
    const stats = await fetchMarketplaceStats(
      client,
      row.release_id!,
      currency
    );
    row.lowest_price = stats.lowestPrice;
    row.num_for_sale = stats.numForSale;
    row.price_currency = stats.currency;
    pendingUpdates.push({
      releaseId: row.release_id!,
      lowest: stats.lowestPrice,
      numForSale: stats.numForSale,
    });
    bump();
  });

  await batchSetCachedPrices(pendingUpdates, currency);
}

/** Discogs `/database/search` hit (release-oriented fields). */
export interface DiscogsSearchResult {
  id: number;
  type?: string;
  title: string;
  year?: string | number;
  thumb?: string;
  cover_image?: string;
  resource_url?: string;
  master_id?: number;
  country?: string;
  format?: string[];
  label?: string[];
  genre?: string[];
  style?: string[];
  barcode?: string[];
  catno?: string;
  uri?: string;
}

export interface DiscogsSearchResponse {
  pagination: DiscogsPagination;
  results: DiscogsSearchResult[];
}

export type DiscogsSearchParams = {
  barcode?: string;
  catno?: string;
  query?: string;
  type?: 'release' | 'master' | 'artist' | 'label';
  perPage?: number;
  page?: number;
};

export async function searchDatabase(
  client: AxiosInstance,
  params: DiscogsSearchParams
): Promise<DiscogsSearchResult[]> {
  const q: Record<string, string> = {
    type: params.type ?? 'release',
    per_page: String(params.perPage ?? 25),
    page: String(params.page ?? 1),
  };
  if (params.barcode?.trim()) q.barcode = params.barcode.trim();
  if (params.catno?.trim()) q.catno = params.catno.trim();
  if (params.query?.trim()) q.q = params.query.trim();

  if (!q.barcode && !q.catno && !q.q) {
    return [];
  }

  const data = await apiGet<DiscogsSearchResponse>(
    client,
    '/database/search',
    q
  );
  return (data.results ?? []).filter(
    (r) => r.type === 'release' || r.type == null || params.type === 'release'
  );
}

export async function fetchMarketplaceStats(
  client: AxiosInstance,
  releaseId: number,
  currency = 'USD'
): Promise<{ lowestPrice: number | null; numForSale: number; currency: string }> {
  try {
    const data = await apiGet<DiscogsMarketplaceStats>(
      client,
      `/marketplace/stats/${releaseId}`,
      { curr_abbr: currency }
    );

    if (data.blocked_from_sale) {
      return { lowestPrice: null, numForSale: 0, currency };
    }

    const numForSale = data.num_for_sale ?? 0;
    if (numForSale === 0) {
      return { lowestPrice: null, numForSale: 0, currency };
    }

    const lowest = data.lowest_price;
    const lowestPrice =
      lowest && typeof lowest.value === 'number' ? lowest.value : null;
    const actualCurrency = lowest?.currency ?? currency;

    return { lowestPrice, numForSale, currency: actualCurrency };
  } catch {
    return { lowestPrice: null, numForSale: 0, currency };
  }
}
