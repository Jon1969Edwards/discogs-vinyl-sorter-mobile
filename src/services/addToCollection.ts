/**
 * Add a scanned / identified release to the user's collection.
 * Local (offline) accounts persist to the import store.
 * Discogs-connected accounts POST to Uncategorized and update the cache.
 */

import type { ReleaseRow } from '../types';
import { SOURCE_DISCOGS, SOURCE_LOCAL } from '../types';
import {
  addReleaseToDiscogsCollection,
  createDiscogsClient,
  discogsUserError,
  getIdentity,
  isDiscogsRateLimitError,
} from './discogsApi';
import { getStoredCredentials } from './auth';
import {
  loadLocalCollection,
  notifyLocalCollectionChanged,
  saveLocalCollection,
} from './localCollection';
import { loadSettings, formatsToSet } from './settings';
import { filterRowsByFormat } from '../domain/formatFilter';

export function isSameRelease(a: ReleaseRow, b: ReleaseRow): boolean {
  if (a.release_id && b.release_id) return a.release_id === b.release_id;
  const artist =
    (a.sort_artist || a.artist_display || '').toLowerCase() ===
    (b.sort_artist || b.artist_display || '').toLowerCase();
  const title =
    (a.sort_title || a.title || '').toLowerCase() ===
    (b.sort_title || b.title || '').toLowerCase();
  const cat =
    (a.catno || '').replace(/\s+/g, '').toUpperCase() ===
    (b.catno || '').replace(/\s+/g, '').toUpperCase();
  return artist && title && cat;
}

export function looksLikeCollectionRow(row: ReleaseRow): boolean {
  return (
    row.source === SOURCE_DISCOGS ||
    row.source === SOURCE_LOCAL ||
    row.instance_id != null
  );
}

/** Infer format filter keys from Discogs search format text. */
export function categoriesFromFormatStr(formatStr: string): Set<string> {
  const s = (formatStr || '').toLowerCase();
  const cats = new Set<string>();
  if (/\bvinyl\b|\blp\b|\b12"?\b|\b7"?\b|\b10"?\b/.test(s)) {
    cats.add('vinyl');
    if (/\blp\b|\b12"?\b|\balbum\b/.test(s)) cats.add('lp');
    if (/\b45\b|\b7"?\b/.test(s)) cats.add('vinyl45');
  }
  if (/\bcd\b/.test(s)) cats.add('cd');
  if (/\bcassette\b|\bmc\b/.test(s)) cats.add('cassette');
  if (/\bbox\b/.test(s)) cats.add('boxset');
  return cats;
}

function prepareCollectionRow(row: ReleaseRow, source: string): ReleaseRow {
  return {
    ...row,
    source,
    format_categories:
      row.format_categories && row.format_categories.size > 0
        ? row.format_categories
        : categoriesFromFormatStr(row.format_str),
  };
}

export async function isInUserCollection(row: ReleaseRow): Promise<boolean> {
  if (looksLikeCollectionRow(row)) return true;
  const local = (await loadLocalCollection()) ?? [];
  if (local.some((r) => isSameRelease(r, row))) return true;
  const cached = await loadCachedRows();
  if (cached?.rows.some((r) => isSameRelease(r, row))) return true;
  return false;
}

function alreadyIn(rows: ReleaseRow[], row: ReleaseRow): boolean {
  return rows.some((r) => isSameRelease(r, row));
}

async function formatFilterWarning(row: ReleaseRow): Promise<string | undefined> {
  const settings = await loadSettings();
  const formatSet = formatsToSet(settings.formats);
  if (filterRowsByFormat([row], formatSet).length > 0) return undefined;
  return 'Added. It may be hidden by your format filter (for example Vinyl LP only). Change formats in Settings to see it.';
}

export type AddToCollectionResult = {
  already: boolean;
  discogsSynced: boolean;
  warning?: string;
};

export async function addReleaseToUserCollection(
  row: ReleaseRow
): Promise<AddToCollectionResult> {
  const cred = await getStoredCredentials();
  const localAccount = !cred || cred.type === 'local';
  const prepared = prepareCollectionRow(
    row,
    localAccount ? SOURCE_LOCAL : SOURCE_DISCOGS
  );

  if (localAccount) {
    const existing = (await loadLocalCollection()) ?? [];
    if (alreadyIn(existing, prepared)) {
      return { already: true, discogsSynced: false };
    }
    await saveLocalCollection([...existing, prepared]);
    return {
      already: false,
      discogsSynced: false,
      warning: await formatFilterWarning(prepared),
    };
  }

  let discogsSynced = false;
  let warning: string | undefined;
  if (prepared.release_id) {
    try {
      const client = createDiscogsClient(cred);
      const username =
        (await getCacheUsername()) || (await getIdentity(client)).username;
      await addReleaseToDiscogsCollection(client, username, prepared.release_id);
      discogsSynced = true;
    } catch (err) {
      const ax = err as { response?: { status?: number } };
      if (ax?.response?.status === 400) {
        discogsSynced = true;
      } else if (isDiscogsRateLimitError(err)) {
        warning = `${discogsUserError(err)} Saved in the app; Discogs will update on the next sync.`;
      } else {
        warning = `Saved in the app. Discogs add failed: ${discogsUserError(err)}`;
      }
    }
  }

  const cached = await loadCachedRows();
  const username = cached?.username || (await getCacheUsername()) || 'Discogs';
  const cachedRows = cached?.rows ?? [];
  const cacheHit = alreadyIn(cachedRows, prepared);
  if (!cacheHit) {
    await saveCachedRows(username, [...cachedRows, prepared]);
  }

  const existing = (await loadLocalCollection()) ?? [];
  const localHit = alreadyIn(existing, prepared);
  if (!localHit) {
    await saveLocalCollection([...existing, prepared]);
  } else if (!cacheHit) {
    notifyLocalCollectionChanged();
  }

  if (localHit && cacheHit) {
    return { already: true, discogsSynced };
  }
  const filterNote = await formatFilterWarning(prepared);
  if (filterNote) {
    warning = warning ? `${warning}\n\n${filterNote}` : filterNote;
  }

  return { already: false, discogsSynced, warning };
}
