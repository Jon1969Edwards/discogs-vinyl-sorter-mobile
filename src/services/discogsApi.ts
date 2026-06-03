/**
 * Discogs API client with retry logic and rate limiting.
 * Mirrors the Windows app's api.py behavior.
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import type { AuthCredentials } from './auth';
import { getConsumerCredentials, getOAuthAuthHeader } from './oauthDiscogs';
import type { ReleaseRow } from '../types';

const API_BASE = 'https://api.discogs.com';
const DEFAULT_USER_AGENT =
  'DiscogsVinylSorter/1.0 (https://github.com/discogs-vinyl-sorter-mobile)';

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

export function createDiscogsClient(
  token: string,
  userAgent = DEFAULT_USER_AGENT
): AxiosInstance {
  const client = axios.create({
    baseURL: API_BASE,
    timeout: 30000,
    headers: {
      Authorization: `Discogs token=${token}`,
      'User-Agent': userAgent,
      Accept: 'application/json',
    },
  });
  attachRetryInterceptor(client);
  return client;
}

export function createAuthenticatedClient(
  auth: AuthCredentials,
  userAgent = DEFAULT_USER_AGENT
): AxiosInstance {
  if (auth.mode === 'pat' && auth.pat) {
    return createDiscogsClient(auth.pat, userAgent);
  }

  if (auth.mode === 'oauth' && auth.oauthToken && auth.oauthSecret) {
    const creds = getConsumerCredentials();
    if (!creds) {
      throw new Error('OAuth consumer credentials not configured');
    }
    const client = axios.create({
      baseURL: API_BASE,
      timeout: 30000,
      headers: {
        'User-Agent': userAgent,
        Accept: 'application/json',
      },
    });

    client.interceptors.request.use((config) => {
      const url = `${config.baseURL || API_BASE}${config.url || ''}`;
      const method = (config.method?.toUpperCase() || 'GET') as 'GET' | 'POST';
      const oauthHeaders = getOAuthAuthHeader(
        url,
        method,
        creds.key,
        creds.secret,
        auth.oauthToken!,
        auth.oauthSecret!
      );
      config.headers = { ...config.headers, ...oauthHeaders };
      return config;
    });

    attachRetryInterceptor(client);
    return client;
  }

  throw new Error('No authentication credentials');
}

function attachRetryInterceptor(client: AxiosInstance): void {
  client.interceptors.response.use(
    (response) => response,
    (error) => Promise.reject(error)
  );
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
    if (!Number.isNaN(val)) return val * 1000;
  }
  return Math.min(backoff * Math.pow(2, attempt) * 1000, 10000);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

export async function attachPricesToRows(
  client: AxiosInstance,
  rows: ReleaseRow[],
  currency: string,
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  const withIds = rows.filter((r) => r.release_id != null);
  const total = withIds.length;
  let done = 0;

  for (const row of withIds) {
    const stats = await fetchMarketplaceStats(
      client,
      row.release_id!,
      currency
    );
    row.lowest_price = stats.lowestPrice;
    row.num_for_sale = stats.numForSale;
    row.price_currency = stats.currency;
    done += 1;
    onProgress?.(done, total);
  }
}
