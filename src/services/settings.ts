/**
 * App settings persisted in AsyncStorage (mirrors Windows .discogs_config.json keys).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  AppSettings,
  DiscogsCurrency,
  DividerMode,
  SortBy,
} from '../types';
import { DEFAULT_SETTINGS, DISCOGS_CURRENCY_OPTIONS } from '../types';

const VALID_CURRENCIES = new Set(
  DISCOGS_CURRENCY_OPTIONS.map((o) => o.code)
);

export function normalizeDiscogsCurrency(value: unknown): DiscogsCurrency {
  const code = String(value ?? '')
    .toUpperCase()
    .slice(0, 3);
  return VALID_CURRENCIES.has(code as DiscogsCurrency)
    ? (code as DiscogsCurrency)
    : DEFAULT_SETTINGS.currency;
}

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
      currency: normalizeDiscogsCurrency(parsed.currency),
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
