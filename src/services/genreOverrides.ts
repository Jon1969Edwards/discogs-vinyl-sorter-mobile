/**
 * Persistent genre corrections – port of Windows core/genre_overrides.py.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ReleaseRow } from '../types';
import {
  applyGenreOverrideMap,
  applyOverrideEntry,
  parseGenreList,
  primaryGenre,
  rowOverrideKey,
  UNKNOWN_GENRE,
  type GenreOverrideEntry,
} from '../domain/genre';
import { overrideLookupKeys } from '../domain/genre';

const STORAGE_KEY = 'spindle_genre_overrides';

interface StoreShape {
  version: number;
  overrides: Record<string, GenreOverrideEntry>;
}

let memory: StoreShape = { version: 1, overrides: {} };
let loaded = false;
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((fn) => fn());
}

export function subscribeGenreOverrides(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

async function persist(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
}

export async function loadGenreOverrides(): Promise<Record<string, GenreOverrideEntry>> {
  if (loaded) return memory.overrides;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoreShape;
      if (parsed?.version === 1 && parsed.overrides && typeof parsed.overrides === 'object') {
        memory = { version: 1, overrides: parsed.overrides };
      }
    }
  } catch {
    // keep empty
  }
  loaded = true;
  return memory.overrides;
}

export function hasGenreOverride(row: ReleaseRow): boolean {
  for (const key of overrideLookupKeys(row)) {
    if (memory.overrides[key]) return true;
  }
  return false;
}

export async function applyGenreOverrides(rows: ReleaseRow[]): Promise<ReleaseRow[]> {
  await loadGenreOverrides();
  return applyGenreOverrideMap(rows, memory.overrides);
}

export async function setGenreOverride(
  row: ReleaseRow,
  genresText: string
): Promise<ReleaseRow | null> {
  await loadGenreOverrides();
  const key = rowOverrideKey(row);
  if (!key) return null;
  const parsed = parseGenreList(genresText);
  const entry: GenreOverrideEntry = {
    genre: parsed.length ? primaryGenre(parsed) : UNKNOWN_GENRE,
    genres: parsed,
  };
  memory.overrides[key] = entry;
  await persist();
  const next = applyOverrideEntry(row, entry);
  notify();
  return next;
}

export async function clearGenreOverride(row: ReleaseRow): Promise<ReleaseRow> {
  await loadGenreOverrides();
  let removed = false;
  for (const key of overrideLookupKeys(row)) {
    if (memory.overrides[key]) {
      delete memory.overrides[key];
      removed = true;
    }
  }
  if (removed) await persist();
  const next = applyOverrideEntry(row, undefined);
  notify();
  return next;
}

/** Test helper: drop in-memory cache but keep AsyncStorage (simulates process restart). */
export function __unloadGenreOverridesForTests(): void {
  memory = { version: 1, overrides: {} };
  loaded = false;
}

/** Test helper */
export async function __resetGenreOverridesForTests(): Promise<void> {
  __unloadGenreOverridesForTests();
  await AsyncStorage.removeItem(STORAGE_KEY);
}
