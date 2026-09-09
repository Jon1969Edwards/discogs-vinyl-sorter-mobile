/**
 * Genre helpers – port of Windows core/sorting.py parse_genre_list / models.genre_*.
 */

import type { ReleaseRow } from '../types';

export const UNKNOWN_GENRE = 'Unknown';

export function parseGenreList(values: unknown): string[] {
  if (values == null || values === '') return [];
  let parts: string[] = [];
  if (typeof values === 'string') {
    const text = values.trim();
    if (!text) return [];
    if (text.includes(';') || text.includes('|')) {
      parts = text
        .split(/[;|]/)
        .map((p) => p.trim())
        .filter(Boolean);
    } else {
      parts = [text];
    }
  } else if (Array.isArray(values)) {
    parts = values.map((v) => String(v).trim()).filter(Boolean);
  } else {
    return [];
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of parts) {
    const key = part.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(part);
  }
  return out;
}

export function genresFromBasic(basic: { genres?: unknown }): string[] {
  return parseGenreList(basic.genres);
}

export function stylesFromBasic(basic: { styles?: unknown }): string[] {
  return parseGenreList(basic.styles);
}

export function primaryGenre(genres: string[]): string {
  return genres[0] || UNKNOWN_GENRE;
}

export function genreLabel(row: Pick<ReleaseRow, 'genre'>): string {
  return (row.genre || '').trim() || UNKNOWN_GENRE;
}

export function genresDisplay(row: Pick<ReleaseRow, 'genre' | 'genres'>): string {
  if (row.genres && row.genres.length > 0) return row.genres.join(', ');
  return genreLabel(row);
}

export function stylesDisplay(row: Pick<ReleaseRow, 'styles'>): string {
  return (row.styles || []).join(', ');
}

export function captureSourceGenre(row: ReleaseRow): ReleaseRow {
  if (row.source_genre || (row.source_genres && row.source_genres.length > 0)) {
    return row;
  }
  return {
    ...row,
    source_genre: row.genre || '',
    source_genres: [...(row.genres || [])],
  };
}

export function restoreSourceGenre(row: ReleaseRow): ReleaseRow {
  const captured = captureSourceGenre(row);
  const genres = [...(captured.source_genres || [])];
  const genre = (captured.source_genre || '').trim() || (genres[0] ?? UNKNOWN_GENRE);
  return {
    ...captured,
    genre,
    genres,
  };
}

export function overrideLookupKeys(row: ReleaseRow): string[] {
  const keys: string[] = [];
  const itemId = (row.item_id || '').trim();
  if (itemId) keys.push(itemId);
  if (row.release_id != null) {
    keys.push(`discogs:${row.release_id}`);
    keys.push(String(row.release_id));
  }
  return keys;
}

export function rowOverrideKey(row: ReleaseRow): string {
  if ((row.item_id || '').trim()) return row.item_id!.trim();
  if (row.release_id != null) return `discogs:${row.release_id}`;
  return '';
}

export interface GenreOverrideEntry {
  genre: string;
  genres: string[];
}

export function applyOverrideEntry(
  row: ReleaseRow,
  entry: GenreOverrideEntry | undefined
): ReleaseRow {
  const captured = captureSourceGenre(row);
  if (!entry) return restoreSourceGenre(captured);
  const parsed = parseGenreList(entry.genres?.length ? entry.genres : entry.genre);
  return {
    ...captured,
    genre: parsed.length ? primaryGenre(parsed) : UNKNOWN_GENRE,
    genres: parsed,
  };
}

export function applyGenreOverrideMap(
  rows: ReleaseRow[],
  overrides: Record<string, GenreOverrideEntry>
): ReleaseRow[] {
  return rows.map((row) => {
    let entry: GenreOverrideEntry | undefined;
    for (const key of overrideLookupKeys(row)) {
      if (overrides[key]) {
        entry = overrides[key];
        break;
      }
    }
    return applyOverrideEntry(row, entry);
  });
}
