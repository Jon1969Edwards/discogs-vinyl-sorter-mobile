/**
 * Persist collection settings via AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CollectionSettings } from '../types/settings';
import { DEFAULT_SETTINGS } from '../types/settings';

const SETTINGS_KEY = '@discogs_vinyl_sorter_settings';

export async function loadSettings(): Promise<CollectionSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<CollectionSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings: CollectionSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
