/**
 * Push/pull genre edits through Discogs collection notes.
 */

import type { AxiosInstance } from 'axios';
import type { ReleaseRow } from '../types';
import { apiGet, apiPost } from './discogsApi';
import {
  extractSpindleGenreFromNotes,
  injectSpindleGenre,
  pickNotesFieldId,
  valueForField,
} from '../utils/collectionNotes';
import {
  loadGenreOverrides,
  mergeImportedOverrides,
  getGenreOverride,
} from './genreOverrides';
import {
  parseGenreList,
  primaryGenre,
  rowOverrideKey,
  UNKNOWN_GENRE,
} from '../domain/genre';

interface CollectionField {
  id?: number;
  name?: string;
  type?: string;
}

let fieldsCache: { username: string; fields: CollectionField[] } | null = null;

async function getCollectionFields(
  client: AxiosInstance,
  username: string
): Promise<CollectionField[]> {
  if (fieldsCache?.username === username) return fieldsCache.fields;
  const data = await apiGet<{ fields?: CollectionField[] }>(
    client,
    `/users/${username}/collection/fields`
  );
  const fields = data.fields || [];
  fieldsCache = { username, fields };
  return fields;
}

export async function pullGenreOverridesFromRows(rows: ReleaseRow[]): Promise<number> {
  const incoming: Record<string, { genre: string; genres: string[] }> = {};
  for (const row of rows) {
    const text = (row.spindle_genre_edit || '').trim();
    if (!text) continue;
    const key = rowOverrideKey(row);
    if (!key) continue;
    const parsed = parseGenreList(text);
    incoming[key] = {
      genre: parsed.length ? primaryGenre(parsed) : UNKNOWN_GENRE,
      genres: parsed,
    };
  }
  if (Object.keys(incoming).length === 0) return 0;
  return mergeImportedOverrides(incoming);
}

export async function pushGenreEdit(
  client: AxiosInstance,
  username: string,
  row: ReleaseRow,
  genresText: string | null
): Promise<boolean> {
  if (!row.release_id || !row.instance_id) return false;
  if (!(row.item_id || '').startsWith('discogs:')) return false;
  const fields = await getCollectionFields(client, username);
  const fieldId = pickNotesFieldId(fields, row.collection_notes);
  if (fieldId == null) return false;
  const current = valueForField(row.collection_notes, fieldId);
  const newVal = injectSpindleGenre(current, genresText);
  let folderId = row.folder_id || 1;
  if (folderId === 0) folderId = 1;
  await apiPost(
    client,
    `/users/${username}/collection/folders/${folderId}/releases/${row.release_id}/instances/${row.instance_id}/fields/${fieldId}`,
    { value: newVal }
  );
  row.spindle_genre_edit = (genresText || '').trim();
  return true;
}

export async function pushMissingGenreOverrides(
  client: AxiosInstance,
  username: string,
  rows: ReleaseRow[]
): Promise<number> {
  await loadGenreOverrides();
  let pushed = 0;
  for (const row of rows) {
    const entry = getGenreOverride(row);
    if (!entry) continue;
    if ((row.spindle_genre_edit || '').trim()) continue;
    const text = entry.genres?.length
      ? entry.genres.join('; ')
      : entry.genre || '';
    try {
      if (await pushGenreEdit(client, username, row, text)) pushed += 1;
    } catch {
      // best-effort; next refresh retries
    }
  }
  return pushed;
}

export async function syncGenreOverridesWithDiscogs(
  client: AxiosInstance,
  username: string,
  rows: ReleaseRow[]
): Promise<void> {
  await pullGenreOverridesFromRows(rows);
  await pushMissingGenreOverrides(client, username, rows);
}
