/**
 * Hook to load and persist collection settings.
 */

import { useState, useCallback, useEffect } from 'react';
import { loadSettings, saveSettings } from '../services/settings';
import type { CollectionSettings } from '../types/settings';

export function useSettings() {
  const [settings, setSettingsState] = useState<CollectionSettings | null>(null);

  useEffect(() => {
    loadSettings().then(setSettingsState);
  }, []);

  const updateSettings = useCallback(async (updates: Partial<CollectionSettings>) => {
    if (!settings) return;
    const next = { ...settings, ...updates };
    setSettingsState(next);
    await saveSettings(next);
  }, [settings]);

  return { settings, updateSettings };
}
