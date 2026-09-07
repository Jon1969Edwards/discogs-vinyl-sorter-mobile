/**
 * License / Pro status for the React tree.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  activateLicense,
  deactivateLicense,
  isPro as checkIsPro,
  licenseSummary,
  refreshProStatus,
} from '../services/licensing';

type LicenseContextValue = {
  loaded: boolean;
  isPro: boolean;
  summary: string;
  refresh: () => Promise<void>;
  activate: (key: string) => Promise<{ ok: boolean; message: string }>;
  deactivate: () => Promise<void>;
};

const LicenseContext = createContext<LicenseContextValue | null>(null);

export function LicenseProvider({ children }: { children: React.ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [summary, setSummary] = useState('Free');

  const refresh = useCallback(async () => {
    const pro = await refreshProStatus();
    const s = await licenseSummary();
    setIsPro(pro);
    setSummary(s);
    setLoaded(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const activate = useCallback(
    async (key: string) => {
      const result = await activateLicense(key);
      if (result.ok) await refresh();
      return result;
    },
    [refresh]
  );

  const deactivate = useCallback(async () => {
    await deactivateLicense();
    await refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      loaded,
      isPro,
      summary,
      refresh,
      activate,
      deactivate,
    }),
    [loaded, isPro, summary, refresh, activate, deactivate]
  );

  return (
    <LicenseContext.Provider value={value}>{children}</LicenseContext.Provider>
  );
}

export function useLicense(): LicenseContextValue {
  const ctx = useContext(LicenseContext);
  if (!ctx) {
    throw new Error('useLicense must be used within LicenseProvider');
  }
  return ctx;
}

/** Safe for screens that may render before provider (should not happen). */
export async function ensureProLoaded(): Promise<boolean> {
  return checkIsPro();
}
