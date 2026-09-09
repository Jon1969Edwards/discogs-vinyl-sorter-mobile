/**
 * Map Discogs database search hits → ReleaseRow for AlbumDetail / lists.
 */

import type { ReleaseRow } from '../types';
import type { DiscogsSearchResult } from '../services/discogsApi';

/** Split Discogs search "Artist - Title" (first " - " only). */
export function splitSearchTitle(title: string): {
  artist: string;
  album: string;
} {
  const raw = (title || '').trim();
  const idx = raw.indexOf(' - ');
  if (idx < 0) return { artist: raw || 'Unknown', album: raw || 'Unknown' };
  const artist = raw.slice(0, idx).trim() || 'Unknown';
  const album = raw.slice(idx + 3).trim() || raw;
  return { artist, album };
}

export function normalizeBarcode(raw: string): string {
  return (raw || '').replace(/\D/g, '');
}

/**
 * Build a Discogs query from OCR lines on a cover.
 * Prefers longer distinctive lines; drops very short / numeric-only noise.
 */
export function queryFromOcrText(text: string): string {
  const lines = (text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const scored = lines
    .map((line) => {
      const letters = (line.match(/[A-Za-z]/g) || []).length;
      const digits = (line.match(/\d/g) || []).length;
      if (line.length < 3) return { line, score: 0 };
      if (letters === 0 && digits > 0) return { line, score: 1 }; // possible catno
      return { line, score: letters * 2 + Math.min(line.length, 40) };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const top = scored.slice(0, 3).map((x) => x.line);
  return top.join(' ').replace(/\s+/g, ' ').trim().slice(0, 120);
}

/** Detect catalog-number-like tokens in free text (e.g. PCS-7088, 060255722084). */
export function extractLikelyCatno(text: string): string | null {
  const m = (text || '').match(
    /\b([A-Z]{1,6}[\s-]?\d{2,6}(?:[\s-]?\d{1,4})?|\d{6,14})\b/i
  );
  return m ? m[1].replace(/\s+/g, '').toUpperCase() : null;
}

export function searchResultToReleaseRow(hit: DiscogsSearchResult): ReleaseRow {
  const { artist, album } = splitSearchTitle(hit.title || '');
  const yearNum =
    hit.year != null && hit.year !== ''
      ? parseInt(String(hit.year), 10)
      : null;
  const year = yearNum != null && !Number.isNaN(yearNum) ? yearNum : null;
  const label = (hit.label && hit.label[0]) || '';
  const format_str = (hit.format || []).join(', ');
  const uri = hit.uri
    ? hit.uri.startsWith('http')
      ? hit.uri
      : `https://www.discogs.com${hit.uri}`
    : hit.resource_url ||
      (hit.id ? `https://www.discogs.com/release/${hit.id}` : '');

  return {
    artist_display: artist,
    title: album,
    year,
    label,
    catno: hit.catno || '',
    country: hit.country || '',
    format_str,
    discogs_url: uri,
    notes: '',
    release_id: hit.id,
    master_id: hit.master_id ?? null,
    sort_artist: artist.toLowerCase(),
    sort_title: album.toLowerCase(),
    thumb_url: hit.thumb || '',
    cover_image_url: hit.cover_image || hit.thumb || '',
    genres: hit.genre,
    styles: hit.style,
    source: 'discogs_search',
  };
}
