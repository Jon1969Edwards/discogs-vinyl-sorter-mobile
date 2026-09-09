/**
 * Load a vinyl collection from CSV or JSON – port of Windows core/collection_import.py.
 */

import CryptoJS from 'crypto-js';
import type { ReleaseRow } from '../types';
import { SOURCE_LOCAL } from '../types';
import { detectFormatCategories, makeSortKeys } from './sorting';
import { UNKNOWN_GENRE, parseGenreList, primaryGenre } from './genre';

const DISCOGS_RELEASE_RE =
  /(?:discogs\.com\/(?:[^/]+\/)?release\/|api\.discogs\.com\/releases\/)(\d+)/i;

const KNOWN_FORMAT_NAMES = new Set([
  'vinyl',
  'cd',
  'cdr',
  'cassette',
  'box set',
  'file',
  'flexi-disc',
  'flexi disc',
  'lathe cut',
  'shellac',
  'acetate',
  'dvd',
  'sacd',
  'minidisc',
  '8-track',
  'reel-to-reel',
  'dat',
]);

const HEADER_ALIASES: Record<string, string> = {
  artist: 'artist',
  artist_display: 'artist',
  title: 'title',
  year: 'year',
  label: 'label',
  catno: 'catno',
  cat_no: 'catno',
  catalog: 'catno',
  catalogue: 'catno',
  catalogno: 'catno',
  catalog_no: 'catno',
  country: 'country',
  format: 'format',
  format_str: 'format',
  discogsurl: 'url',
  discogs_url: 'url',
  url: 'url',
  sourceurl: 'url',
  source_url: 'url',
  notes: 'notes',
  coverurl: 'cover',
  cover_url: 'cover',
  cover: 'cover',
  cover_image_url: 'cover',
  coverimageurl: 'cover',
  thumburl: 'thumb',
  thumb_url: 'thumb',
  thumb: 'thumb',
  releaseid: 'release_id',
  release_id: 'release_id',
  id: 'release_id',
  source: 'source',
  item_id: 'item_id',
  itemid: 'item_id',
  sort_artist: 'sort_artist',
  sort_title: 'sort_title',
  format_categories: 'format_categories',
  genre: 'genre',
  genres: 'genres',
  style: 'styles',
  styles: 'styles',
};

const KNOWN_FIELDS = new Set(Object.values(HEADER_ALIASES));

export class CollectionImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CollectionImportError';
  }
}

export function parseDiscogsReleaseId(urlOrId: unknown): number | null {
  if (urlOrId == null) return null;
  if (typeof urlOrId === 'number') {
    return urlOrId > 0 ? urlOrId : null;
  }
  const text = String(urlOrId).trim();
  if (!text) return null;
  if (/^\d+$/.test(text)) return parseInt(text, 10);
  const match = DISCOGS_RELEASE_RE.exec(text);
  return match ? parseInt(match[1], 10) : null;
}

export function makeLocalItemId(
  artist: string,
  title: string,
  year: number | null,
  catno: string
): string {
  const raw = `${(artist || '').trim().toLowerCase()}|${(title || '').trim().toLowerCase()}|${year ?? ''}|${(catno || '').trim().toLowerCase()}`;
  return `local:${CryptoJS.SHA1(raw).toString(CryptoJS.enc.Hex).slice(0, 12)}`;
}

export function formatsFromFormatStr(
  formatStr: string
): Array<{ name: string; qty: string; descriptions: string[] }> {
  const text = (formatStr || '').trim();
  if (!text) return [];
  const pieces = text
    .split(/[;|]/)
    .map((p) => p.trim())
    .filter(Boolean);
  const parsed = (pieces.length ? pieces : []).map(pieceToFormat);
  return parsed.filter((f) => f.name || f.descriptions.length);
}

export function detectFormatCategoriesFromStr(formatStr: string): Set<string> {
  return detectFormatCategories({ formats: formatsFromFormatStr(formatStr) });
}

export function parseCollectionText(text: string, filename = ''): ReleaseRow[] {
  const name = (filename || '').trim().toLowerCase();
  const trimmed = text.replace(/^\uFEFF/, '');
  const looksJson =
    trimmed.trim().startsWith('{') || trimmed.trim().startsWith('[');
  let records: Record<string, unknown>[];
  if (name.endsWith('.json')) {
    records = readJsonRecords(trimmed);
  } else if (name.endsWith('.csv')) {
    records = readCsvRecords(trimmed);
  } else if (name && name.includes('.') && !looksJson) {
    throw new CollectionImportError(
      'Unsupported file type. Import a .csv or .json collection.'
    );
  } else if (looksJson) {
    records = readJsonRecords(trimmed);
  } else {
    records = readCsvRecords(trimmed);
  }
  const rows = rowsFromRecords(records, SOURCE_LOCAL);
  if (!rows.length) {
    throw new CollectionImportError(
      'No albums found. Each row needs at least an Artist or Title.'
    );
  }
  return rows;
}

export function rowsFromRecords(
  records: Iterable<Record<string, unknown>>,
  source = SOURCE_LOCAL
): ReleaseRow[] {
  const rows: ReleaseRow[] = [];
  for (const raw of records) {
    const row = recordToRow(normalizeRecord(raw), source);
    if (row) rows.push(row);
  }
  return rows;
}

function normalizeHeader(name: string): string {
  const key = (name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return HEADER_ALIASES[key] ?? key;
}

function normalizeRecord(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    const mapped = normalizeHeader(String(key));
    if (!KNOWN_FIELDS.has(mapped)) continue;
    if (!(mapped in out) || out[mapped] == null || out[mapped] === '') {
      out[mapped] = value;
    }
  }
  return out;
}

function asStr(value: unknown): string {
  if (value == null) return '';
  return String(value).trim();
}

function parseYear(value: unknown): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return value > 0 ? value : null;
  const text = String(value).trim();
  if (/^\d+$/.test(text)) return parseInt(text, 10);
  const match = /(18|19|20)\d{2}/.exec(text);
  return match ? parseInt(match[0], 10) : null;
}

function parseCategories(value: unknown): Set<string> {
  if (Array.isArray(value) || value instanceof Set) {
    return new Set([...value].map((x) => String(x)).filter(Boolean));
  }
  if (typeof value === 'string' && value.trim()) {
    return new Set(value.trim().split(/[\s,;|]+/).filter(Boolean));
  }
  return new Set();
}

function recordToRow(
  mapped: Record<string, unknown>,
  defaultSource: string
): ReleaseRow | null {
  const artist = asStr(mapped.artist);
  const title = asStr(mapped.title);
  if (!artist && !title) return null;
  const formatStr = asStr(mapped.format);
  let url = asStr(mapped.url || mapped.discogs_url);
  const releaseId =
    parseDiscogsReleaseId(mapped.release_id) || parseDiscogsReleaseId(url);
  const year = parseYear(mapped.year);
  const catno = asStr(mapped.catno);
  let categories = parseCategories(mapped.format_categories);
  if (categories.size === 0) {
    categories = detectFormatCategoriesFromStr(formatStr);
  }
  let itemId = asStr(mapped.item_id);
  if (!itemId) {
    itemId = releaseId
      ? `discogs:${releaseId}`
      : makeLocalItemId(artist, title, year, catno);
  }
  if (url && releaseId && !url.toLowerCase().includes('discogs.com') && !url.startsWith('http')) {
    url = `https://www.discogs.com/release/${releaseId}`;
  } else if (!url && releaseId) {
    url = `https://www.discogs.com/release/${releaseId}`;
  }
  let sortArtist = asStr(mapped.sort_artist);
  let sortTitle = asStr(mapped.sort_title);
  if (!sortArtist || !sortTitle) {
    [sortArtist, sortTitle] = makeSortKeys(artist, title, {
      extraArticles: [],
      lastNameFirst: true,
      lnfAllow3: false,
      lnfExclude: new Set(),
      lnfSafeBands: true,
    });
  }
  const genres = parseGenreList(mapped.genres || mapped.genre);
  const styles = parseGenreList(mapped.styles);
  const genre = genres.length ? primaryGenre(genres) : UNKNOWN_GENRE;
  return {
    artist_display: artist,
    title,
    year,
    label: asStr(mapped.label),
    catno,
    country: asStr(mapped.country),
    format_str: formatStr,
    discogs_url: url,
    notes: asStr(mapped.notes),
    release_id: releaseId,
    sort_artist: sortArtist,
    sort_title: sortTitle,
    thumb_url: asStr(mapped.thumb),
    cover_image_url: asStr(mapped.cover),
    format_categories: categories,
    source: asStr(mapped.source) || defaultSource,
    item_id: itemId,
    genre,
    genres,
    styles,
    source_genre: genre,
    source_genres: genres,
  };
}

function pieceToFormat(piece: string): {
  name: string;
  qty: string;
  descriptions: string[];
} {
  let qty = '';
  let rest = piece.trim();
  const qtyMatch = /^(\d+)\s*[x×]\s*(.+)$/i.exec(rest);
  if (qtyMatch) {
    qty = qtyMatch[1];
    rest = qtyMatch[2].trim();
  }
  const parts = rest
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (!parts.length) return { name: '', qty, descriptions: [] };
  const first = parts[0];
  const firstKey = first.toLowerCase().replace(/\s+/g, ' ');
  if (KNOWN_FORMAT_NAMES.has(firstKey)) {
    return { name: first, qty, descriptions: parts.slice(1) };
  }
  const blob = rest.toLowerCase();
  if (/\bcd\b/.test(blob) && !blob.includes('vinyl')) {
    return {
      name: 'CD',
      qty,
      descriptions: parts.filter((p) => p.toLowerCase() !== 'cd'),
    };
  }
  if (blob.includes('cassette') || blob.trim() === 'tape' || blob.trim() === 'mc') {
    return { name: 'Cassette', qty, descriptions: parts };
  }
  if (blob.includes('box set') || blob.trim() === 'box') {
    return { name: 'Box Set', qty, descriptions: parts };
  }
  if (
    blob.includes('vinyl') ||
    blob.includes('lp') ||
    blob.includes('7"') ||
    blob.includes('12"') ||
    blob.includes('45')
  ) {
    return {
      name: 'Vinyl',
      qty,
      descriptions: parts.filter((p) => p.toLowerCase() !== 'vinyl'),
    };
  }
  return { name: 'Vinyl', qty, descriptions: parts };
}

function sniffDelimiter(sample: string): string {
  try {
    const candidates = [',', ';', '\t'] as const;
    let best = ',';
    let bestScore = -1;
    const line = sample.split(/\r?\n/).find((l) => l.trim()) || sample;
    for (const d of candidates) {
      const score = line.split(d).length;
      if (score > bestScore) {
        bestScore = score;
        best = d;
      }
    }
    const commas = (sample.match(/,/g) || []).length;
    const semis = (sample.match(/;/g) || []).length;
    if (semis > commas && bestScore <= 2) return ';';
    return best;
  } catch {
    return ',';
  }
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function readCsvRecords(raw: string): Record<string, unknown>[] {
  if (!raw.trim()) {
    throw new CollectionImportError('The CSV file is empty.');
  }
  const delimiter = sniffDelimiter(raw.slice(0, 4096));
  const lines = raw.split(/\r?\n/).filter((l, idx, arr) => {
    if (l.trim()) return true;
    return idx < arr.length - 1 && arr.slice(idx + 1).some((x) => x.trim());
  });
  if (!lines.length) {
    throw new CollectionImportError('The CSV file is empty.');
  }
  const headers = parseCsvLine(lines[0], delimiter).map((h) =>
    normalizeHeader(h)
  );
  if (!headers.includes('artist') && !headers.includes('title')) {
    throw new CollectionImportError(
      'CSV must include Artist and/or Title columns (Spindle export columns work).'
    );
  }
  const records: Record<string, unknown>[] = [];
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const cells = parseCsvLine(line, delimiter);
    const row: Record<string, unknown> = {};
    let any = false;
    headers.forEach((h, i) => {
      const v = (cells[i] ?? '').trim();
      row[h] = v;
      if (v) any = true;
    });
    if (any) records.push(row);
  }
  return records;
}

function readJsonRecords(raw: string): Record<string, unknown>[] {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new CollectionImportError(`Invalid JSON: ${msg}`);
  }
  let records: unknown;
  if (Array.isArray(data)) {
    records = data;
  } else if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    records =
      obj.rows ?? obj.releases ?? obj.items ?? obj.collection ?? null;
    if (!Array.isArray(records)) {
      throw new CollectionImportError(
        'JSON must be a list of albums, or an object with a rows/releases array.'
      );
    }
  } else {
    throw new CollectionImportError('JSON must be a list of albums.');
  }
  if (!Array.isArray(records) || records.length === 0) {
    throw new CollectionImportError('The JSON file has no albums.');
  }
  if (!records[0] || typeof records[0] !== 'object' || Array.isArray(records[0])) {
    throw new CollectionImportError(
      'JSON albums must be objects with Artist/Title fields.'
    );
  }
  return records as Record<string, unknown>[];
}
