import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  const settingsRef = useRef(settings);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const reload = useCallback(async () => {
    const s = await loadSettings();
    settingsRef.current = s;
    setSettings(s);
    setLoaded(true);
    return s;
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  /** Merge into in-memory settings then persist (avoids stale disk reads clobbering patches). */
  const update = useCallback(async (patch: Partial<AppSettings>) => {
    const next = { ...settingsRef.current, ...patch };
    settingsRef.current = next;
    setSettings(next);
    await saveSettings(next);
    return next;
  }, []);

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
