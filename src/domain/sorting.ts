/**
 * Sorting and filtering – port of Windows core/sorting.py
 */

import type { DiscogsCollectionRelease } from '../services/discogsApi';
import type { ReleaseRow, SortBy, VariousPolicy } from '../types';
import { GUI_BUILD_SORT } from '../types';
import { filterRowsByFormat } from './formatFilter';

export type { SortBy, VariousPolicy };

export interface DiscogsBasic {
  formats?: Array<{ name?: string; qty?: string; descriptions?: string[] }>;
  labels?: Array<{ name?: string; catno?: string }>;
  artists?: Array<{ name?: string; join?: string }>;
  artist?: string;
  title?: string;
  year?: number | string;
  id?: number;
  master_id?: number;
  country?: string;
  thumb?: string;
  cover_image?: string;
  [key: string]: unknown;
}

export interface MakeSortKeysOptions {
  extraArticles?: string[];
  lastNameFirst?: boolean;
  lnfAllow3?: boolean;
  lnfExclude?: Set<string>;
  lnfSafeBands?: boolean;
}

export interface BuildRowOptions extends MakeSortKeysOptions {}

// ---------------------------------------------------------------------------
// Format detection
// ---------------------------------------------------------------------------

function descSetHas33Rpm(descs: Set<string>): boolean {
  if (descs.size === 0) return false;
  const norm = new Set<string>();
  descs.forEach((t) => norm.add(t.replace(/\./g, '').replace(/ /g, '')));
  const normArr = [...norm];
  if (normArr.some((t) => t.includes('33') && t.includes('rpm'))) return true;
  const has33 = normArr.some((t) => t.includes('33'));
  const hasRpm = normArr.some((t) => t === 'rpm' || t.endsWith('rpm'));
  const hasLpHint = norm.has('lp') || norm.has('album');
  return has33 && (hasRpm || hasLpHint);
}

export function isLp33(basic: DiscogsBasic, strict = false, probable = false): boolean {
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

  if (probable) {
    const has45Or78 = (s: Set<string>) => {
      const norm = [...s].map((t) => t.replace(/\./g, '').replace(/ /g, ''));
      return norm.some((t) => t.includes('45')) || norm.some((t) => t.includes('78'));
    };
    return descSets.some(
      (s) => (s.has('lp') || s.has('album')) && !has45Or78(s)
    );
  }

  return descSets.some((s) => {
    const hasLpOrAlbum = s.has('lp') || s.has('album');
    const has12And33 = [...s].some((d) => sizeTokens.has(d) || d.includes('12'));
    return hasLpOrAlbum || (descSetHas33Rpm(s) && has12And33);
  });
}

export function isVinyl45(basic: DiscogsBasic): boolean {
  const vinylFormats = (basic.formats || []).filter(
    (f) => (f.name || '').trim().toLowerCase() === 'vinyl'
  );
  if (vinylFormats.length === 0) return false;
  const sizeTokens = new Set(['7"', '7in', '7-inch']);
  for (const f of vinylFormats) {
    const descs = new Set(
      (f.descriptions || [])
        .filter((d) => d)
        .map((d) => d.trim().toLowerCase())
    );
    if ([...descs].some((d) => sizeTokens.has(d))) {
      if ([...descs].some((d) => d.includes('45') && d.includes('rpm'))) return true;
    }
  }
  return false;
}

export function isCdFormat(basic: DiscogsBasic): boolean {
  for (const f of basic.formats || []) {
    const name = (f.name || '').trim().toLowerCase();
    if (name === 'cd' || name === 'cdr') return true;
  }
  return false;
}

export function isVinylAny(basic: DiscogsBasic): boolean {
  for (const f of basic.formats || []) {
    if ((f.name || '').trim().toLowerCase() === 'vinyl') return true;
  }
  return false;
}

export function isCassette(basic: DiscogsBasic): boolean {
  for (const f of basic.formats || []) {
    if ((f.name || '').trim().toLowerCase() === 'cassette') return true;
  }
  return false;
}

export function isBoxSet(basic: DiscogsBasic): boolean {
  for (const f of basic.formats || []) {
    if ((f.name || '').trim().toLowerCase() === 'box set') return true;
    for (const d of f.descriptions || []) {
      if ((d || '').trim().toLowerCase() === 'box set') return true;
    }
  }
  return false;
}

export function detectFormatCategories(basic: DiscogsBasic): Set<string> {
  const cats = new Set<string>();
  if (isVinylAny(basic)) cats.add('vinyl');
  if (isLp33(basic)) cats.add('lp');
  if (isVinyl45(basic)) cats.add('vinyl45');
  if (isCdFormat(basic)) cats.add('cd');
  if (isCassette(basic)) cats.add('cassette');
  if (isBoxSet(basic)) cats.add('boxset');
  return cats;
}

// ---------------------------------------------------------------------------
// String normalization
// ---------------------------------------------------------------------------

const TRAILING_NUMERIC_RE = /\s*\((\d+)\)$/;
const LEAD_AND_THE_BAND_RE = /^(?<lead>.+?)\s+(?:and|&)\s+the\s+.+$/i;

export function stripDiscogsNumericSuffix(name: string): string {
  return (name || '').replace(TRAILING_NUMERIC_RE, '').trim();
}

function normalizeApostrophes(s: string): string {
  return (s || '').replace(/\u2019/g, "'");
}

function normalizeExcludeName(s: string): string {
  return (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function consolidateLeadArtistForSort(artistClean: string): string {
  const s = (artistClean || '').trim();
  if (!s) return s;
  const m = s.match(LEAD_AND_THE_BAND_RE);
  if (m?.groups?.lead) return m.groups.lead.trim();
  return s;
}

const COMMON_FIRST_NAMES = new Set([
  'john', 'james', 'michael', 'robert', 'david', 'william', 'richard', 'thomas', 'charles', 'joseph',
  'christopher', 'daniel', 'paul', 'mark', 'donald', 'george', 'kenneth', 'steven', 'edward', 'brian',
  'ronald', 'anthony', 'kevin', 'jason', 'matthew', 'gary', 'timothy', 'jose', 'larry', 'jeffrey',
  'frank', 'scott', 'eric', 'stephen', 'andrew', 'raymond', 'gregory', 'joshua', 'jerry', 'dennis',
  'walter', 'patrick', 'peter', 'harold', 'douglas', 'henry', 'carl', 'arthur', 'ryan', 'roger',
  'joe', 'juan', 'jack', 'albert', 'jonathan', 'justin', 'terry', 'gerald', 'keith', 'samuel', 'willie',
  'ralph', 'lawrence', 'nicholas', 'roy', 'benjamin', 'bruce', 'brandon', 'adam', 'harry', 'fred', 'wayne',
  'billy', 'steve', 'louis', 'jeremy', 'aaron', 'randy', 'howard', 'eugene', 'carlos', 'russell', 'bobby',
  'victor', 'martin', 'ernest', 'phillip', 'todd', 'jesse', 'craig', 'alan', 'shawn', 'clarence', 'sean',
  'philip', 'chris', 'johnny', 'earl', 'jimmy', 'antonio', 'danny', 'bryan', 'tony', 'luis', 'miles',
  'neil', 'nick', 'lou', 'chuck', 'ian', 'alex', 'noel', 'leonard', 'elvis', 'thelonious', 'jean-michel',
]);

function isBandLike(first: string, last: string): boolean {
  const bandAdjectives = new Set([
    'big', 'small', 'little', 'bad', 'good', 'great', 'new', 'old', 'young',
    'black', 'white', 'blue', 'red', 'green', 'wild', 'sweet',
  ]);
  const bandTerms = new Set([
    'band', 'trio', 'quartet', 'quintet', 'sextet', 'septet', 'octet', 'nonet',
    'orchestra', 'ensemble', 'choir', 'chorale', 'collective', 'project', 'group',
    'crew', 'players', 'brothers', 'sisters', 'family', 'experience', 'front',
  ]);
  const firstLow = first.toLowerCase();
  const lastLow = last.toLowerCase();
  if (bandTerms.has(lastLow)) return true;
  if (lastLow.endsWith('s') && !COMMON_FIRST_NAMES.has(firstLow)) return true;
  if (bandAdjectives.has(firstLow) && !COMMON_FIRST_NAMES.has(lastLow)) return true;
  return false;
}

function looksLikePersonalNameTwoWord(first: string): boolean {
  return COMMON_FIRST_NAMES.has(first.toLowerCase());
}

function isValidTwoWord(tokens: string[]): boolean {
  if (!tokens.every((t) => /^[A-Za-z'\-]+$/.test(t))) return false;
  if (tokens.some((t) => ['the', 'and', '&'].includes(t.toLowerCase()))) return false;
  return true;
}

function flipThreeWord(tokens: string[]): string | null {
  const [first, middle, last] = tokens;
  if (['the', 'and', '&'].includes(first.toLowerCase())) return null;
  const middleNorm = middle.toLowerCase().replace(/\.$/, '');
  const particles = new Set(['de', 'del', 'van', 'von', 'da', 'di', 'la', 'le', 'du', 'do', 'dos', 'das', 'st']);
  if (middleNorm.length === 1 || middle.endsWith('.') || particles.has(middleNorm)) {
    return `${last}, ${first} ${middle}`.toLowerCase();
  }
  return null;
}

function lastNameFirstKey(
  artistClean: string,
  allow3: boolean,
  excludeSet: Set<string>,
  safeBands: boolean,
  excludeAlsoMatch?: string
): string | null {
  const norm = normalizeExcludeName(artistClean);
  if (excludeSet.has(norm)) return null;
  if (excludeAlsoMatch && excludeSet.has(normalizeExcludeName(excludeAlsoMatch))) return null;

  const firstArtist = artistClean.split(/[/,]/)[0].trim();
  const tokens = firstArtist.split(/\s+/).filter(Boolean);

  if (tokens.length === 2) {
    if (safeBands) {
      if (isBandLike(tokens[0], tokens[1])) return null;
      if (!looksLikePersonalNameTwoWord(tokens[0], tokens[1])) return null;
    }
    if (!isValidTwoWord(tokens)) return null;
    return `${tokens[1]}, ${tokens[0]}`.toLowerCase();
  }
  if (allow3 && tokens.length === 3) {
    return flipThreeWord(tokens);
  }
  return firstArtist.toLowerCase();
}

function stripArticles(text: string, extraArticles: string[] = []): string {
  if (!text) return '';
  let t = normalizeApostrophes(text).trim();
  const articles = ['the', 'a', 'an', ...extraArticles.map((a) => a.trim().toLowerCase()).filter(Boolean)];
  const low = t.toLowerCase();
  for (let art of articles) {
    art = art.replace(/'$/, '');
    if (low.startsWith(art + ' ')) {
      t = t.slice(art.length + 1).trim();
      break;
    }
    if (art && low.startsWith(art + "'")) {
      t = t.slice(art.length + 1).trim();
      break;
    }
  }
  return t;
}

export function makeSortKeys(
  artistDisplay: string,
  title: string,
  options: MakeSortKeysOptions = {}
): [string, string] {
  const {
    extraArticles = [],
    lastNameFirst = false,
    lnfAllow3 = false,
    lnfExclude = new Set<string>(),
    lnfSafeBands = false,
  } = options;

  const artistFirst = artistDisplay.split('/')[0].split(',')[0].trim();
  const artistClean = stripDiscogsNumericSuffix(artistFirst).trim();
  const artistForSort = consolidateLeadArtistForSort(artistClean);
  let sortArtistBase = stripArticles(artistForSort, extraArticles).toLowerCase();

  if (lastNameFirst) {
    const flipped = lastNameFirstKey(
      artistForSort,
      lnfAllow3,
      lnfExclude,
      lnfSafeBands,
      artistClean !== artistForSort ? artistClean : undefined
    );
    if (flipped) sortArtistBase = flipped;
  }

  return [sortArtistBase, stripArticles(title, extraArticles).toLowerCase()];
}

// ---------------------------------------------------------------------------
// Artist / label / format helpers
// ---------------------------------------------------------------------------

export function buildArtistDisplay(basic: DiscogsBasic): string {
  const artists = basic.artists || [];
  if (artists.length === 0) {
    return basic.artist || basic.title || '';
  }
  const parts: string[] = [];
  for (const a of artists) {
    let nm = stripDiscogsNumericSuffix(a.name || '');
    parts.push(nm);
    const j = a.join || '';
    if (j) parts.push(j, ' ');
  }
  return parts
    .join('')
    .trim()
    .replace(/\s+([&,+.]|feat\.|with)\s+/gi, ' $1 ');
}

function formatString(basic: DiscogsBasic): string {
  const pieces: string[] = [];
  for (const fmt of basic.formats || []) {
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
  const labels = basic.labels || [];
  if (labels.length === 0) return ['', ''];
  const first = labels[0];
  return [first.name || '', first.catno || ''];
}

export function buildReleaseRow(
  item: DiscogsCollectionRelease,
  options: BuildRowOptions = {}
): ReleaseRow {
  const basic = (item.basic_information || {}) as DiscogsBasic;
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

  const sortOpts: MakeSortKeysOptions = {
    extraArticles: options.extraArticles ?? [],
    lastNameFirst: options.lastNameFirst ?? GUI_BUILD_SORT.lastNameFirst,
    lnfAllow3: options.lnfAllow3 ?? GUI_BUILD_SORT.lnfAllow3,
    lnfExclude: options.lnfExclude ?? GUI_BUILD_SORT.lnfExclude,
    lnfSafeBands: options.lnfSafeBands ?? GUI_BUILD_SORT.lnfSafeBands,
  };
  const [sortArtist, sortTitle] = makeSortKeys(artistDisplay, title, sortOpts);

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
    master_id: basic.master_id ?? null,
    sort_artist: sortArtist,
    sort_title: sortTitle,
    format_categories: detectFormatCategories(basic),
    thumb_url: basic.thumb || '',
    cover_image_url: basic.cover_image || '',
  };
}

export function collectAllRows(
  items: Iterable<DiscogsCollectionRelease>,
  options: BuildRowOptions = {}
): ReleaseRow[] {
  const rows: ReleaseRow[] = [];
  for (const item of items) {
    const basic = item.basic_information;
    if (!basic) continue;
    rows.push(buildReleaseRow(item, options));
  }
  return rows;
}

export function isVariousArtist(artistDisplay: string): boolean {
  const a = (artistDisplay || '').trim().toLowerCase();
  return a === 'various' || a === 'various artists';
}

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

export function getSectionLetter(row: ReleaseRow, sortBy: SortBy): string {
  if (sortBy === 'artist' || sortBy === 'title') {
    const str = sortBy === 'artist' ? row.sort_artist : row.sort_title;
    const first = (str || '').charAt(0).toUpperCase();
    return /[A-Z0-9]/.test(first) ? first : '#';
  }
  if (sortBy === 'year') {
    const y = row.year;
    return y != null ? String(y) : '?';
  }
  return '—';
}

/** Apply GUI pipeline: filter formats then sort */
export function processCollectionRows(
  allRows: ReleaseRow[],
  selectedFormats: Set<string>,
  sortBy: SortBy = GUI_BUILD_SORT.sortBy
): ReleaseRow[] {
  const filtered = filterRowsByFormat(allRows, selectedFormats);
  return sortRows(filtered, GUI_BUILD_SORT.variousPolicy, sortBy);
}
