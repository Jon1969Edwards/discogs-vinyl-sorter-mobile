/**
 * Format filter – port of Windows core/format_filter.py
 */

import type { ReleaseRow } from '../types';

export const FORMAT_FILTERS: ReadonlyArray<readonly [string, string]> = [
  ['everything', 'Everything'],
  ['vinyl', 'All Vinyl'],
  ['lp', 'Vinyl LP'],
  ['vinyl45', 'Vinyl 45s'],
  ['cd', 'CD'],
  ['cassette', 'Cassette'],
  ['boxset', 'Box Set'],
] as const;

export const DEFAULT_FORMAT_SELECTION: string[] = ['lp'];

export const VALID_FORMAT_KEYS = new Set(FORMAT_FILTERS.map(([k]) => k));

export function parseSavedFormats(saved: unknown): string[] {
  if (!Array.isArray(saved) || saved.length === 0) {
    return [...DEFAULT_FORMAT_SELECTION];
  }
  const keys = saved.filter(
    (k): k is string => typeof k === 'string' && VALID_FORMAT_KEYS.has(k)
  );
  return keys.length > 0 ? keys : [...DEFAULT_FORMAT_SELECTION];
}

export function filterRowsByFormat(
  rows: ReleaseRow[],
  selected: Set<string>
): ReleaseRow[] {
  if (selected.size === 0 || selected.has('everything')) {
    return [...rows];
  }
  return rows.filter((r) => {
    const cats = r.format_categories ?? new Set<string>();
    for (const key of selected) {
      if (cats.has(key)) return true;
    }
    return false;
  });
}
