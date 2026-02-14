/**
 * Context for collection settings (sort, dividers, etc.).
 */

import React, { createContext, useContext } from 'react';
import type { CollectionSettings } from '../types/settings';
import { useSettings } from '../hooks/useSettings';

type SettingsContextValue = {
  settings: CollectionSettings | null;
  updateSettings: (updates: Partial<CollectionSettings>) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { settings, updateSettings } = useSettings();
  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettingsContext(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettingsContext must be used within SettingsProvider');
  return ctx;
}
