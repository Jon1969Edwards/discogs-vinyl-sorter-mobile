/**
 * App settings persisted in AsyncStorage (mirrors Windows .discogs_config.json keys).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppSettings, DividerMode, SortBy } from '../types';
import { DEFAULT_SETTINGS } from '../types';

const SETTINGS_KEY = 'discogs_app_settings';

export async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      formats: Array.isArray(parsed.formats) ? parsed.formats : DEFAULT_SETTINGS.formats,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export async function updateSettings(
  patch: Partial<AppSettings>
): Promise<AppSettings> {
  const current = await loadSettings();
  const next = { ...current, ...patch };
  await saveSettings(next);
  return next;
}

export function formatsToSet(formats: string[]): Set<string> {
  if (formats.includes('everything')) return new Set(['everything']);
  return new Set(formats);
}

export function isValidDividerMode(v: string): v is DividerMode {
  return v === 'none' || v === 'letter' || v === 'abc';
}

export function isValidSortBy(v: string): v is SortBy {
  return (
    v === 'artist' ||
    v === 'title' ||
    v === 'year' ||
    v === 'price_asc' ||
    v === 'price_desc'
  );
}
