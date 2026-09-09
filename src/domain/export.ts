/**
 * Export TXT, CSV, JSON – port of Windows core/export.py
 */

import type { DividerMode, ReleaseRow, SortBy } from '../types';
import { genreLabel } from './genre';

export type { DividerMode };

const SHELF_DIVIDER_TITLES: Record<string, string> = {
  A: 'SHELF A (A–H)',
  B: 'SHELF B (I–P)',
  C: 'SHELF C (Q–Z)',
};

export function resolveDividerMode(
  dividers = false,
  dividerMode?: string | null,
  sortBy?: SortBy | string | null
): DividerMode {
  if ((sortBy || '') === 'genre') return 'genre';
  if (
    dividerMode === 'none' ||
    dividerMode === 'letter' ||
    dividerMode === 'abc' ||
    dividerMode === 'genre'
  ) {
    return dividerMode;
  }
  return dividers ? 'letter' : 'none';
}

export function sortLetterFromRow(r: ReleaseRow): string {
  const sa = r.sort_artist.trim();
  let first = sa ? sa[0].toUpperCase() : '#';
  if (!/[A-Z]/.test(first)) first = '#';
  return first;
}

export function sortLetterToShelf(letter: string): string {
  let ch = (letter || '#')[0].toUpperCase();
  if (!/[A-Z]/.test(ch)) ch = '#';
  if (ch === '#' || ch <= 'H') return 'A';
  if (ch <= 'P') return 'B';
  return 'C';
}

function getDividerLine(
  r: ReleaseRow,
  current: string | null,
  mode: DividerMode
): { next: string | null; line: string | null } {
  if (mode === 'none') return { next: current, line: null };
  if (mode === 'letter') {
    const first = sortLetterFromRow(r);
    if (current !== first) return { next: first, line: `=== ${first} ===` };
    return { next: current, line: null };
  }
  if (mode === 'genre') {
    const genre = genreLabel(r);
    if (current !== genre) return { next: genre, line: `=== ${genre} ===` };
    return { next: current, line: null };
  }
  const letter = sortLetterFromRow(r);
  const shelf = sortLetterToShelf(letter);
  if (current !== shelf) {
    return { next: shelf, line: `=== ${SHELF_DIVIDER_TITLES[shelf]} ===` };
  }
  return { next: current, line: null };
}

function getYearStr(r: ReleaseRow): string {
  return r.year ? ` (${r.year})` : '';
}

function getLabelPart(r: ReleaseRow): string {
  if (!r.label && !r.catno) return '';
  return ` [${r.label} ${r.catno}]`.trimEnd();
}

function getPricePart(r: ReleaseRow, showPrice: boolean): string {
  if (!showPrice) return '';
  if (
    r.lowest_price != null &&
    r.num_for_sale != null &&
    r.num_for_sale > 0
  ) {
    const cur = r.price_currency || 'USD';
    return ` - ${Math.round(r.lowest_price)} ${cur}+ (${r.num_for_sale} for sale)`;
  }
  return ' [Not listed]';
}

export function formatTxtLine(
  r: ReleaseRow,
  showPrice = false,
  showCountry = false
): string {
  const yearStr = getYearStr(r);
  const labelPart = getLabelPart(r);
  const countryPart = showCountry && r.country ? ` {${r.country}}` : '';
  const pricePart = getPricePart(r, showPrice);
  return `${r.artist_display} — ${r.title}${yearStr}${labelPart}${countryPart}${pricePart}`.trim();
}

export interface GenerateTxtOptions {
  dividers?: boolean;
  dividerMode?: string | null;
  showPrice?: boolean;
  showCountry?: boolean;
  sortBy?: SortBy | string | null;
}

export function generateTxtLines(
  rows: ReleaseRow[],
  options: GenerateTxtOptions = {}
): string[] {
  const mode = resolveDividerMode(options.dividers, options.dividerMode, options.sortBy);
  const lines: string[] = [];
  let currentDiv: string | null = null;

  for (const r of rows) {
    const { next, line } = getDividerLine(r, currentDiv, mode);
    currentDiv = next;
    if (line) lines.push(line);
    lines.push(formatTxtLine(r, options.showPrice, options.showCountry));
  }
  return lines;
}

export function generateTxt(rows: ReleaseRow[], options: GenerateTxtOptions = {}): string {
  return generateTxtLines(rows, options).join('\n');
}

export function generateCsv(rows: ReleaseRow[]): string {
  const cols = [
    'Artist',
    'Title',
    'Year',
    'Label',
    'CatNo',
    'Country',
    'Format',
    'Genre',
    'DiscogsURL',
    'Notes',
  ];

  const escape = (val: unknown): string => {
    const s = val === null || val === undefined ? '' : String(val);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const header = cols.join(',');
  const dataRows = rows.map((r) =>
    [
      r.artist_display,
      r.title,
      r.year ?? '',
      r.label,
      r.catno,
      r.country,
      r.format_str,
      (r.genres && r.genres.length > 0 ? r.genres.join('; ') : r.genre) || '',
      r.discogs_url,
      r.notes,
    ]
      .map(escape)
      .join(',')
  );

  return [header, ...dataRows].join('\n');
}

export function generateJson(rows: ReleaseRow[]): string {
  const data = rows.map((r) => ({
    artist: r.artist_display,
    title: r.title,
    year: r.year,
    label: r.label,
    catno: r.catno,
    country: r.country,
    format: r.format_str,
    discogs_url: r.discogs_url,
    notes: r.notes,
    sort_artist: r.sort_artist,
    sort_title: r.sort_title,
    release_id: r.release_id ?? null,
    item_id: r.item_id || '',
    genre: genreLabel(r),
    genres: r.genres || [],
    styles: r.styles || [],
  }));
  return JSON.stringify(data, null, 2);
}
