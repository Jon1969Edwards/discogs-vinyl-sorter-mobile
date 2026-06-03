import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { AppSettings } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { loadSettings, saveSettings } from '../services/settings';

interface SettingsContextValue {
  settings: AppSettings;
  loaded: boolean;
  update: (patch: Partial<AppSettings>) => Promise<AppSettings>;
  reload: () => Promise<AppSettings>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    const s = await loadSettings();
    setSettings(s);
    setLoaded(true);
    return s;
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const update = useCallback(
    async (patch: Partial<AppSettings>) => {
      const current = await loadSettings();
      const next = { ...current, ...patch };
      setSettings(next);
      await saveSettings(next);
      return next;
    },
    []
  );

  const value = useMemo(
    () => ({ settings, loaded, update, reload }),
    [settings, loaded, update, reload]
  );

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return ctx;
}
