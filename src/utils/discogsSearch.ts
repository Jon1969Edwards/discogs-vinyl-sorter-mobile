/**
 * Map Discogs database search hits → ReleaseRow for AlbumDetail / lists.
 * Cover-scan helpers: OCR line scoring, catno/year extraction, search fallbacks, ranking.
 */

import type { ReleaseRow } from '../types';
import type { DiscogsSearchResult } from '../services/discogsApi';

export type OcrLineLike = {
  text: string;
  height?: number;
  confidence?: number | null;
};

export type CoverQuery = {
  query: string;
  shortQuery: string;
  catno: string | null;
  year: number | null;
};

export type CoverSearchParams = {
  barcode?: string;
  catno?: string;
  query?: string;
  format?: string;
};

const SLEEVE_NOISE =
  /^(?:lp|ep|cd|vinyl|record|stereo|mono|quadraphonic|side\s*[ab12]|side\s+(?:one|two)|33\s*1\/?3(?:\s*rpm)?|45\s*rpm|78\s*rpm|rpm|compact\s*disc|high\s*fidelity|hi-?fi|digital(?:\s+master(?:ing)?)?|made\s+in\b.*|all\s+rights\b.*|recorded\s+(?:in|at)\b.*|produced\s+by\b.*|copyright\b.*|\(p\).*|\(c\).*)$/i;

const QUERY_STOP = new Set(['the', 'and', 'of', 'a', 'an', 'in', 'on', 'for', 'to']);

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

function isSleeveNoise(line: string): boolean {
  const t = line.trim();
  if (!t || t.length < 2) return true;
  return SLEEVE_NOISE.test(t);
}

function isYearLine(line: string): boolean {
  return /^(?:19|20)\d{2}$/.test(line.trim());
}

function compactCatno(value: string): string {
  return value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
}

function isCatnoLikeLine(line: string, catno: string | null): boolean {
  if (!catno) return false;
  return compactCatno(line) === compactCatno(catno);
}

function normalizeLineKey(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function extractLikelyYear(text: string): number | null {
  const matches = [...(text || '').matchAll(/\b((?:19|20)\d{2})\b/g)];
  for (const m of matches) {
    const y = parseInt(m[1], 10);
    if (y >= 1948 && y <= 2027) return y;
  }
  return null;
}

const CATNO_TOKEN_RE =
  /\b([A-Z]{1,6}[\s-]?\d{2,6}(?:[\s-]?\d{1,4})?|\d{6,14})\b/gi;

function normalizeCatnoToken(raw: string): string {
  return raw.replace(/\s+/g, '').toUpperCase();
}

function isYearToken(token: string): boolean {
  return /^(?:19|20)\d{2}$/.test(compactCatno(token));
}

/** Detect catalog-number-like tokens in free text (e.g. PCS-7088, 060255722084). */
export function extractLikelyCatno(text: string): string | null {
  CATNO_TOKEN_RE.lastIndex = 0;
  const m = CATNO_TOKEN_RE.exec(text || '');
  if (!m) return null;
  if (isYearToken(m[1])) return null;
  return normalizeCatnoToken(m[1]);
}

function ocrLinesFromInput(
  input: string | { text?: string; lines?: OcrLineLike[] }
): { text: string; lines: OcrLineLike[] } {
  const text = typeof input === 'string' ? input : input.text || '';
  const lines: OcrLineLike[] =
    typeof input !== 'string' && input.lines && input.lines.length
      ? input.lines
      : text.split(/\r?\n/).map((t) => ({ text: t.trim(), height: 0 }));
  return { text: text || lines.map((l) => l.text).join('\n'), lines };
}

function scoreCatnoToken(
  raw: string,
  line: { height: number; confidence: number | null; index: number },
  hasHeight: boolean
): number {
  const compact = compactCatno(raw);
  if (!compact || isYearToken(compact)) return 0;
  if (isSleeveNoise(raw) || isSleeveNoise(compact)) return 0;

  const letters = (compact.match(/[A-Z]/g) || []).length;
  const digits = (compact.match(/\d/g) || []).length;
  let score = 0;
  if (letters > 0 && digits > 0) {
    score += 80;
  } else if (digits >= 6) {
    score += 8;
  } else {
    return 0;
  }

  if (hasHeight) score += line.height * 4;
  else score += Math.max(0, 12 - line.index);

  if (line.confidence != null) {
    const c = Math.max(0, Math.min(1, line.confidence));
    score *= 0.55 + c * 0.45;
  }
  return score;
}

/**
 * Best catalog number from a label / spine / sleeve photo.
 * Prefers mixed letter+digit tokens (PCS-7088) over UPC-like digit strings.
 */
export function extractCatnoFromOcr(
  input: string | { text?: string; lines?: OcrLineLike[] }
): string | null {
  const { text, lines } = ocrLinesFromInput(input);
  const hasHeight = lines.some((l) => (l.height ?? 0) > 0);
  let best: { token: string; score: number } | null = null;

  lines.forEach((line, index) => {
    const lineText = (line.text || '').trim();
    if (!lineText || isSleeveNoise(lineText) || isYearLine(lineText)) return;
    CATNO_TOKEN_RE.lastIndex = 0;
    for (const m of lineText.matchAll(CATNO_TOKEN_RE)) {
      const raw = m[1];
      const score = scoreCatnoToken(
        raw,
        {
          height: line.height ?? 0,
          confidence: line.confidence ?? null,
          index,
        },
        hasHeight
      );
      if (score <= 0) continue;
      const token = normalizeCatnoToken(raw);
      if (!best || score > best.score) best = { token, score };
    }
  });

  return best?.token ?? extractLikelyCatno(text);
}

/**
 * Discogs catno search strings from OCR/typed input.
 * COOKCD302 → COOK CD 302 (Cooking Vinyl style) plus the compact form.
 */
export function catnoQueryVariants(raw: string): string[] {
  const trimmed = (raw || '').trim();
  if (!trimmed) return [];
  const variants: string[] = [];
  const push = (value: string) => {
    const t = value.replace(/\s+/g, ' ').trim();
    if (!t) return;
    if (!variants.some((x) => x.toUpperCase() === t.toUpperCase())) {
      variants.push(t);
    }
  };

  const compact = trimmed.replace(/[\s-]+/g, '').toUpperCase();
  const fmt = compact.match(/^([A-Z]+?)(CD|LP|EP|MC)(\d+[A-Z0-9]*)$/i);
  if (fmt) {
    push(`${fmt[1]} ${fmt[2]} ${fmt[3]}`);
    push(`${fmt[1]}${fmt[2]} ${fmt[3]}`);
  } else {
    const lettersDigits = compact.match(/^([A-Z]+)(\d+[A-Z0-9]*)$/i);
    if (lettersDigits) {
      push(`${lettersDigits[1]} ${lettersDigits[2]}`);
    }
  }
  push(trimmed);
  push(compact);
  return variants;
}

export function catnoSearchAttempts(opts: {
  catno?: string | null;
  barcode?: string | null;
}): CoverSearchParams[] {
  const attempts: CoverSearchParams[] = [];
  if (opts.catno?.trim()) {
    for (const value of catnoQueryVariants(opts.catno)) {
      attempts.push({ catno: value });
    }
    return attempts;
  }
  const code = opts.barcode ? normalizeBarcode(opts.barcode) : '';
  if (code.length >= 8) {
    attempts.push({ barcode: code });
  }
  return attempts;
}

function scoreCoverLine(
  line: {
    text: string;
    height: number;
    confidence: number | null;
    index: number;
  },
  hasHeight: boolean
): number {
  const letters = (line.text.match(/[A-Za-zÀ-ÿ]/g) || []).length;
  if (letters === 0) return 0;

  let score = letters * 2 + Math.min(line.text.length, 24);
  if (line.text.length >= 2 && line.text.length <= 40) score += 20;
  if (line.text.length > 48) score -= (line.text.length - 48) * 3;

  if (hasHeight) {
    score += line.height * 4;
  } else {
    score += Math.max(0, 18 - line.index * 2);
  }

  if (line.confidence != null) {
    const c = Math.max(0, Math.min(1, line.confidence));
    score *= 0.55 + c * 0.45;
  }
  return score;
}

/**
 * Pick artist + title from OCR (or pasted text). Drops sleeve slogans, years,
 * and catalog numbers. Prefers larger type when ML Kit frames are present.
 */
export function extractCoverQuery(
  input: string | { text?: string; lines?: OcrLineLike[] }
): CoverQuery {
  const { text, lines: rawLines } = ocrLinesFromInput(input);
  const catno = extractCatnoFromOcr({ text, lines: rawLines });
  const year = extractLikelyYear(text);

  const candidates = rawLines
    .map((l, index) => ({
      text: (l.text || '').trim(),
      height: l.height ?? 0,
      confidence: l.confidence ?? null,
      index,
    }))
    .filter((l) => l.text.length >= 2)
    .filter((l) => !isSleeveNoise(l.text))
    .filter((l) => !isYearLine(l.text))
    .filter((l) => !isCatnoLikeLine(l.text, catno));

  const hasHeight = candidates.some((l) => l.height > 0);
  const pool = hasHeight
    ? candidates
    : candidates.filter((l) => l.index < 12);

  const scored = pool
    .map((l) => ({ ...l, score: scoreCoverLine(l, hasHeight) }))
    .filter((l) => l.score > 0)
    .sort((a, b) => b.score - a.score);

  const top: string[] = [];
  for (const row of scored) {
    if (top.length >= 2) break;
    const key = normalizeLineKey(row.text);
    if (top.some((t) => normalizeLineKey(t) === key)) continue;
    if (top.length === 1 && row.score < scored[0].score * 0.35) break;
    top.push(row.text);
  }

  const query = top.join(' ').replace(/\s+/g, ' ').trim().slice(0, 80);
  const shortQuery = (top[0] || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  return { query, shortQuery, catno, year };
}

/**
 * Build a Discogs query from OCR lines on a cover.
 * Prefers distinctive artist/title lines; drops sleeve noise.
 */
export function queryFromOcrText(text: string): string {
  return extractCoverQuery(text).query;
}

export function coverSearchAttempts(opts: {
  barcode?: string | null;
  cover: CoverQuery;
}): CoverSearchParams[] {
  const attempts: CoverSearchParams[] = [];
  const code = opts.barcode ? normalizeBarcode(opts.barcode) : '';
  if (code.length >= 8) {
    attempts.push({ barcode: code });
  }
  if (opts.cover.catno) {
    attempts.push({ catno: opts.cover.catno, format: 'Vinyl' });
    attempts.push({ catno: opts.cover.catno });
  }
  if (opts.cover.query) {
    attempts.push({ query: opts.cover.query, format: 'Vinyl' });
    attempts.push({ query: opts.cover.query });
    if (opts.cover.shortQuery && opts.cover.shortQuery !== opts.cover.query) {
      attempts.push({ query: opts.cover.shortQuery, format: 'Vinyl' });
      attempts.push({ query: opts.cover.shortQuery });
    }
  }
  return attempts;
}

function tokenizeQuery(q: string): string[] {
  return (q || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2 && !QUERY_STOP.has(t));
}

export function dedupeSearchResults(
  hits: DiscogsSearchResult[]
): DiscogsSearchResult[] {
  const seen = new Set<number>();
  const out: DiscogsSearchResult[] = [];
  for (const h of hits) {
    if (seen.has(h.id)) continue;
    seen.add(h.id);
    out.push(h);
  }
  return out;
}

function isVinylFormat(formats: string[] | undefined): boolean {
  const blob = (formats || []).join(' ').toLowerCase();
  return /\b(vinyl|lp)\b/.test(blob) || /\b12"?\b/.test(blob);
}

export function rankSearchResults(
  hits: DiscogsSearchResult[],
  cover: CoverQuery
): DiscogsSearchResult[] {
  if (!cover.query && !cover.catno && cover.year == null) {
    return hits;
  }
  const tokens = tokenizeQuery(cover.query);
  const cat = cover.catno ? compactCatno(cover.catno) : '';

  return hits
    .map((hit, index) => {
      let score = 0;
      const title = (hit.title || '').toLowerCase();
      for (const t of tokens) {
        if (title.includes(t)) score += 10;
      }
      if (isVinylFormat(hit.format)) score += 8;
      if (cover.year != null && String(hit.year) === String(cover.year)) {
        score += 6;
      }
      const hitCat = compactCatno(hit.catno || '');
      if (cat && hitCat && hitCat === cat) score += 20;
      return { hit, score, index };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((row) => row.hit);
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
