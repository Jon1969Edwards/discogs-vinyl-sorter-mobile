/**
 * Sorting and filtering for Discogs collection.
 * Ported from Windows app core/sorting.py
 */

import type { ReleaseRow } from '../types';
import type { DiscogsCollectionRelease } from '../services/discogsApi';

// ---------------------------------------------------------------------------
// Format detection
// ---------------------------------------------------------------------------

interface DiscogsBasic {
  formats?: Array<{ name?: string; descriptions?: string[] }>;
  [key: string]: unknown;
}

function descSetHas33Rpm(descs: Set<string>): boolean {
  if (descs.size === 0) return false;
  const norm = new Set<string>();
  descs.forEach((t) => norm.add(t.replace('.', '').replace(' ', '')));
  const hasCombined = [...norm].some((t) => t.includes('33') && t.includes('rpm'));
  if (hasCombined) return true;
  const has33 = [...norm].some((t) => t.includes('33'));
  const hasRpm = [...norm].some((t) => t === 'rpm' || t.endsWith('rpm'));
  const hasLpHint = norm.has('lp') || norm.has('album');
  return has33 && (hasRpm || hasLpHint);
}

export function isLp33(basic: DiscogsBasic, strict = false): boolean {
  const vinylFormats = (basic.formats || []).filter(
    (f) => (f.name || '').trim().toLowerCase() === 'vinyl'
  );
  if (vinylFormats.length === 0) return false;

  const sizeTokens = new Set(['12"', '12in', '12-inch']);
  const descSets = vinylFormats.map((f) => {
    const descs = (f.descriptions || [])
      .filter((d) => d)
      .map((d) => d.trim().toLowerCase());
    return new Set(descs);
  });

  if (strict) {
    return descSets.some(
      (s) => (s.has('lp') || s.has('album')) && descSetHas33Rpm(s)
    );
  }

  return descSets.some((s) => {
    const hasLpOrAlbum = s.has('lp') || s.has('album');
    const has12And33 = [...s].some((d) => sizeTokens.has(d) || d.includes('12'));
    return hasLpOrAlbum || (descSetHas33Rpm(s) && has12And33);
  });
}

// ---------------------------------------------------------------------------
// String normalization
// ---------------------------------------------------------------------------

const TRAILING_NUMERIC_RE = /\s*\((\d+)\)$/;

export function stripDiscogsNumericSuffix(name: string): string {
  return (name || '').replace(TRAILING_NUMERIC_RE, '').trim();
}

function stripArticles(text: string, extraArticles: string[] = []): string {
  if (!text) return '';
  const articles = ['the', 'a', 'an', ...extraArticles.map((a) => a.trim().toLowerCase()).filter(Boolean)];
  let t = text.trim();
  const low = t.toLowerCase();

  for (const art of articles) {
    const a = art.replace(/'$/, '');
    if (low.startsWith(a + ' ')) return t.slice(a.length + 1).trim();
    if (a && low.startsWith(a + "'")) return t.slice(a.length + 1).trim();
  }
  return t;
}

// ---------------------------------------------------------------------------
// Artist, label, format helpers
// ---------------------------------------------------------------------------

export function buildArtistDisplay(basic: DiscogsBasic): string {
  const artists = (basic as { artists?: Array<{ name?: string; join?: string }> }).artists || [];
  if (artists.length === 0) {
    return (basic as { artist?: string }).artist || (basic as { title?: string }).title || '';
  }
  const parts: string[] = [];
  for (const a of artists) {
    let nm = (a.name || '').replace(TRAILING_NUMERIC_RE, '').trim();
    parts.push(nm);
    const j = a.join || '';
    if (j) {
      parts.push(j, ' ');
    }
  }
  return parts
    .join('')
    .trim()
    .replace(/\s+([&,+.]|feat\.|with)\s+/gi, ' $1 ');
}

function formatString(basic: DiscogsBasic): string {
  const formats = (basic as { formats?: Array<{ name?: string; qty?: string; descriptions?: string[] }> }).formats || [];
  const pieces: string[] = [];

  for (const fmt of formats) {
    const name = (fmt.name || '').trim();
    const qty = (fmt.qty || '').trim();
    const descs = (fmt.descriptions || [])
      .filter((d) => d)
      .map((d) => d.trim())
      .join(', ');
    const qtyPrefix = qty && qty !== '1' ? `${qty}x` : '';
    const base = name ? `${qtyPrefix}${name}` : qtyPrefix.replace(/x$/, '');
    const piece = descs && base ? `${base}, ${descs}` : base || descs;
    if (piece) pieces.push(piece);
  }
  return pieces.join('; ');
}

function labelAndCatno(basic: DiscogsBasic): [string, string] {
  const labels = (basic as { labels?: Array<{ name?: string; catno?: string }> }).labels || [];
  if (labels.length === 0) return ['', ''];
  const first = labels[0];
  return [first.name || '', first.catno || ''];
}

// ---------------------------------------------------------------------------
// Sort keys (simplified – no last-name-first for MVP)
// ---------------------------------------------------------------------------

function makeSortKeys(artistDisplay: string, title: string, extraArticles: string[] = []): [string, string] {
  const artistFirst = artistDisplay.split('/')[0].split(',')[0].trim();
  const artistClean = stripDiscogsNumericSuffix(artistFirst).trim();
  const sortArtist = stripArticles(artistClean, extraArticles).toLowerCase();
  const sortTitle = stripArticles(title, extraArticles).toLowerCase();
  return [sortArtist, sortTitle];
}

// ---------------------------------------------------------------------------
// Build ReleaseRow from API item
// ---------------------------------------------------------------------------

export function buildReleaseRow(
  item: DiscogsCollectionRelease,
  extraArticles: string[] = []
): ReleaseRow {
  const basic = item.basic_information || {};
  const title = basic.title || '';
  const artistDisplay = buildArtistDisplay(basic);
  const yearRaw = basic.year;
  const year =
    yearRaw !== undefined && String(yearRaw).match(/^\d+$/)
      ? parseInt(String(yearRaw), 10)
      : null;
  const [label, catno] = labelAndCatno(basic);
  const fmtDesc = formatString(basic);
  const relId = basic.id;
  const url = relId ? `https://www.discogs.com/release/${relId}` : '';
  const [sortArtist, sortTitle] = makeSortKeys(artistDisplay, title, extraArticles);
  const thumbUrl = basic.thumb || '';
  const coverImageUrl = basic.cover_image || '';

  return {
    artist_display: artistDisplay,
    title,
    year,
    label,
    catno,
    country: basic.country || '',
    format_str: fmtDesc,
    discogs_url: url,
    notes: item.notes || '',
    release_id: relId ?? null,
    master_id: (basic as { master_id?: number }).master_id ?? null,
    sort_artist: sortArtist,
    sort_title: sortTitle,
    thumb_url: thumbUrl,
    cover_image_url: coverImageUrl,
  };
}

// ---------------------------------------------------------------------------
// Various Artists
// ---------------------------------------------------------------------------

export function isVariousArtist(artistDisplay: string): boolean {
  const a = (artistDisplay || '').trim().toLowerCase();
  return a === 'various' || a === 'various artists';
}

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

export type VariousPolicy = 'normal' | 'last' | 'title';
export type SortBy = 'artist' | 'title' | 'year' | 'price_asc' | 'price_desc';

export function sortRows(
  rows: ReleaseRow[],
  variousPolicy: VariousPolicy = 'normal',
  sortBy: SortBy = 'artist'
): ReleaseRow[] {
  if (sortBy === 'price_desc') {
    return [...rows].sort((a, b) => {
      const aVal = a.lowest_price ?? -Infinity;
      const bVal = b.lowest_price ?? -Infinity;
      return bVal - aVal;
    });
  }
  if (sortBy === 'price_asc') {
    return [...rows].sort((a, b) => {
      const aVal = a.lowest_price ?? Infinity;
      const bVal = b.lowest_price ?? Infinity;
      return aVal - bVal;
    });
  }
  if (sortBy === 'year') {
    return [...rows].sort((a, b) => {
      const aYear = a.year ?? 9999;
      const bYear = b.year ?? 9999;
      if (aYear !== bYear) return aYear - bYear;
      return (a.sort_artist + a.sort_title).localeCompare(b.sort_artist + b.sort_title);
    });
  }

  return [...rows].sort((a, b) => {
    const isVarA = isVariousArtist(a.artist_display);
    const isVarB = isVariousArtist(b.artist_display);
    const varFlagA = variousPolicy === 'last' && isVarA ? 1 : 0;
    const varFlagB = variousPolicy === 'last' && isVarB ? 1 : 0;
    if (varFlagA !== varFlagB) return varFlagA - varFlagB;

    let primaryA: string;
    let primaryB: string;
    let secondaryA: string;
    let secondaryB: string;
    const yearA = a.year ?? 9999;
    const yearB = b.year ?? 9999;

    if (variousPolicy === 'title' && isVarA && isVarB) {
      primaryA = a.sort_title;
      primaryB = b.sort_title;
      secondaryA = a.sort_title;
      secondaryB = b.sort_title;
    } else if (sortBy === 'title') {
      primaryA = a.sort_title;
      primaryB = b.sort_title;
      secondaryA = a.sort_artist;
      secondaryB = b.sort_artist;
    } else {
      primaryA = a.sort_artist;
      primaryB = b.sort_artist;
      secondaryA = a.sort_title;
      secondaryB = b.sort_title;
    }

    if (primaryA !== primaryB) return primaryA.localeCompare(primaryB);
    if (secondaryA !== secondaryB) return secondaryA.localeCompare(secondaryB);
    if (yearA !== yearB) return yearA - yearB;
    return (a.sort_artist + a.sort_title).localeCompare(b.sort_artist + b.sort_title);
  });
}
