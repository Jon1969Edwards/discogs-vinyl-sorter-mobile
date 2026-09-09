/**
 * Persistent store for CSV/JSON imports (Windows core/local_collection.py).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ReleaseRow } from '../types';
import { SOURCE_LOCAL } from '../types';
import { formatCollectionNotes } from '../utils/collectionNotes';

const STORE_KEY = 'spindle_local_collection';

export interface LocalCollectionStore {
  version: number;
  source: string;
  imported_from?: string;
  saved_at: number;
  rows: Record<string, unknown>[];
}

function serializeRow(r: ReleaseRow): Record<string, unknown> {
  return {
    ...r,
    format_categories: r.format_categories ? [...r.format_categories] : undefined,
  };
}

function deserializeRow(raw: Record<string, unknown>): ReleaseRow {
  const cats = raw.format_categories;
  return {
    ...(raw as ReleaseRow),
    notes: formatCollectionNotes(raw.notes),
    format_categories: Array.isArray(cats) ? new Set(cats as string[]) : undefined,
    source: (raw.source as string) || SOURCE_LOCAL,
  };
}

const listeners = new Set<() => void>();

export function subscribeLocalCollection(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function notifyLocalCollectionChanged(): void {
  for (const cb of listeners) cb();
}

export async function saveLocalCollection(
  rows: ReleaseRow[],
  importedFrom = ''
): Promise<void> {
  const payload: LocalCollectionStore = {
    version: 1,
    source: SOURCE_LOCAL,
    imported_from: importedFrom || undefined,
    saved_at: Date.now(),
    rows: rows.map(serializeRow),
  };
  await AsyncStorage.setItem(STORE_KEY, JSON.stringify(payload));
  notifyLocalCollectionChanged();
}

export async function loadLocalCollection(): Promise<ReleaseRow[] | null> {
  try {
    const raw = await AsyncStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalCollectionStore;
    if (!parsed || !Array.isArray(parsed.rows)) return null;
    return parsed.rows.map(deserializeRow);
  } catch {
    return null;
  }
}

export async function clearLocalCollection(): Promise<void> {
  await AsyncStorage.removeItem(STORE_KEY);
  notifyLocalCollectionChanged();
}
