/**
 * Shared types for Discogs Vinyl Sorter (aligned with Windows core/models.py)
 */

export type FormatCategory =
  | 'vinyl'
  | 'lp'
  | 'vinyl45'
  | 'cd'
  | 'cassette'
  | 'boxset';

export interface ReleaseRow {
  artist_display: string;
  title: string;
  year: number | null;
  label: string;
  catno: string;
  country: string;
  format_str: string;
  discogs_url: string;
  notes: string;
  release_id?: number | null;
  master_id?: number | null;
  instance_id?: number | null;
  sort_artist: string;
  sort_title: string;
  format_categories?: Set<string>;
  median_price?: number | null;
  lowest_price?: number | null;
  num_for_sale?: number | null;
  price_currency?: string;
  thumb_url: string;
  cover_image_url: string;
}

export interface BuildResult {
  username: string;
  rows_sorted: ReleaseRow[];
  lines: string[];
}

export type DividerMode = 'none' | 'letter' | 'abc';

export type VariousPolicy = 'normal' | 'last' | 'title';
export type SortBy = 'artist' | 'title' | 'year' | 'price_asc' | 'price_desc';

/** Discogs marketplace `curr_abbr` values (API docs). */
export type DiscogsCurrency =
  | 'USD'
  | 'GBP'
  | 'EUR'
  | 'CAD'
  | 'AUD'
  | 'JPY'
  | 'CHF'
  | 'MXN'
  | 'BRL'
  | 'NZD'
  | 'SEK'
  | 'ZAR';

export const DISCOGS_CURRENCY_OPTIONS: { code: DiscogsCurrency; label: string }[] =
  [
    { code: 'USD', label: 'US Dollar' },
    { code: 'GBP', label: 'British Pound' },
    { code: 'EUR', label: 'Euro' },
    { code: 'CAD', label: 'Canadian Dollar' },
    { code: 'AUD', label: 'Australian Dollar' },
    { code: 'JPY', label: 'Japanese Yen' },
    { code: 'CHF', label: 'Swiss Franc' },
    { code: 'MXN', label: 'Mexican Peso' },
    { code: 'BRL', label: 'Brazilian Real' },
    { code: 'NZD', label: 'New Zealand Dollar' },
    { code: 'SEK', label: 'Swedish Krona' },
    { code: 'ZAR', label: 'South African Rand' },
  ];

/** Windows Auto-Sort GUI build_service._collect_rows defaults */
export const GUI_BUILD_SORT = {
  lastNameFirst: true,
  lnfAllow3: false,
  lnfExclude: new Set<string>(),
  lnfSafeBands: true,
  variousPolicy: 'normal' as VariousPolicy,
  sortBy: 'artist' as SortBy,
};

export interface AppSettings {
  user_agent: string;
  formats: string[];
  divider_mode: DividerMode;
  sort_by: SortBy;
  currency: DiscogsCurrency;
  write_json: boolean;
  poll_seconds: number;
  show_prices: boolean;
  per_page: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  user_agent: 'DiscogsVinylSorter/1.0 (+contact)',
  formats: ['lp'],
  divider_mode: 'none',
  sort_by: 'artist',
  currency: 'USD',
  write_json: false,
  poll_seconds: 300,
  show_prices: false,
  per_page: 100,
};

export interface WishlistEntry {
  artist: string;
  title: string;
  discogs_url?: string;
  year?: number | string;
  thumb?: string;
  cover_image_url?: string;
  release_id?: number;
  lowest_price?: number;
  num_for_sale?: number;
  price_currency?: string;
  label?: string;
  catno?: string;
  country?: string;
  format?: string;
  notes?: string;
  [key: string]: unknown;
}
