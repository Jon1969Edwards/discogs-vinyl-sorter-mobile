/**
 * Discogs API client with retry logic and rate limiting.
 * Mirrors the Windows app's api.py behavior.
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';

const API_BASE = 'https://api.discogs.com';
const USER_AGENT = 'DiscogsVinylSorter/1.0 (https://github.com/discogs-vinyl-sorter-mobile)';

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
    resource_url: string;
  };
  notes?: string;
}

export interface DiscogsCollectionResponse {
  pagination: DiscogsPagination;
  releases: DiscogsCollectionRelease[];
}

export interface DiscogsMarketplaceStats {
  lowest_price?: { value: number; currency: string };
  num_for_sale: number;
  blocked_from_sale?: boolean;
}

// ---------------------------------------------------------------------------
// API client factory
// ---------------------------------------------------------------------------

export function createDiscogsClient(token: string): AxiosInstance {
  const client = axios.create({
    baseURL: API_BASE,
    timeout: 30000,
    headers: {
      Authorization: `Discogs token=${token}`,
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
    },
  });

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
        // For now, no synchronous sleep – axios-interceptors can't easily delay.
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

export async function* iterateCollection(
  client: AxiosInstance,
  username: string,
  folderId = 0,
  perPage = 100,
  maxPages?: number
): AsyncGenerator<DiscogsCollectionRelease> {
  let page = 1;
  let totalPages: number | null = null;

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
      yield item;
    }

    page += 1;
    if (maxPages !== undefined && page > maxPages) break;
    if (totalPages !== null && page > totalPages) break;
  }
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
