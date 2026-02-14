/**
 * Shared types for Discogs Vinyl Sorter
 */

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
  sort_artist: string;
  sort_title: string;
  median_price?: number | null;
  lowest_price?: number | null;
  thumb_url: string;
  cover_image_url: string;
}

export interface BuildResult {
  username: string;
  rows_sorted: ReleaseRow[];
  lines: string[];
}
