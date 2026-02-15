/**
 * Secure credential storage. Uses Expo SecureStore on native (iOS/Android),
 * localStorage on web (SecureStore is not supported in the browser).
 * Supports both Personal Access Token (PAT) and OAuth (token + secret).
 */

import { Platform } from 'react-native';

const AUTH_KEY = 'discogs_auth';
const LEGACY_TOKEN_KEY = 'discogs_token';

export type DiscogsCredentials =
  | { type: 'pat'; token: string }
  | { type: 'oauth'; token: string; secret: string };

const isWeb = Platform.OS === 'web';

async function getStoredAuthNative(): Promise<string | null> {
  const SecureStore = await import('expo-secure-store');
  try {
    return await SecureStore.getItemAsync(AUTH_KEY);
  } catch {
    return null;
  }
}

async function getLegacyTokenNative(): Promise<string | null> {
  const SecureStore = await import('expo-secure-store');
  try {
    return await SecureStore.getItemAsync(LEGACY_TOKEN_KEY);
  } catch {
    return null;
  }
}

async function setStoredAuthNative(json: string): Promise<void> {
  const SecureStore = await import('expo-secure-store');
  await SecureStore.setItemAsync(AUTH_KEY, json);
}

async function clearStoredAuthNative(): Promise<void> {
  const SecureStore = await import('expo-secure-store');
  try {
    await SecureStore.deleteItemAsync(AUTH_KEY);
    await SecureStore.deleteItemAsync(LEGACY_TOKEN_KEY);
  } catch {
    // Ignore
  }
}

function parseCredentials(json: string | null): DiscogsCredentials | null {
  if (!json || !json.trim()) return null;
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const obj = parsed as Record<string, unknown>;
    if (obj.type === 'pat' && typeof obj.token === 'string' && obj.token.trim()) {
      return { type: 'pat', token: obj.token.trim() };
    }
    if (
      obj.type === 'oauth' &&
      typeof obj.token === 'string' &&
      typeof obj.secret === 'string' &&
      obj.token.trim() &&
      obj.secret.trim()
    ) {
      return { type: 'oauth', token: obj.token.trim(), secret: obj.secret.trim() };
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

/** Migrate from legacy token-only storage to new credentials format. */
async function migrateFromLegacy(): Promise<DiscogsCredentials | null> {
  if (isWeb && typeof localStorage !== 'undefined') {
    try {
      const legacy = localStorage.getItem(LEGACY_TOKEN_KEY);
      if (legacy?.trim()) {
        const cred: DiscogsCredentials = { type: 'pat', token: legacy.trim() };
        localStorage.setItem(AUTH_KEY, JSON.stringify(cred));
        localStorage.removeItem(LEGACY_TOKEN_KEY);
        return cred;
      }
    } catch {
      // Ignore
    }
    return null;
  }
  const legacy = await getLegacyTokenNative();
  if (legacy?.trim()) {
    const cred: DiscogsCredentials = { type: 'pat', token: legacy.trim() };
    await setStoredAuthNative(JSON.stringify(cred));
    try {
      const SecureStore = await import('expo-secure-store');
      await SecureStore.deleteItemAsync(LEGACY_TOKEN_KEY);
    } catch {
      // Ignore
    }
    return cred;
  }
  return null;
}

export async function getStoredCredentials(): Promise<DiscogsCredentials | null> {
  let json: string | null;
  if (isWeb && typeof localStorage !== 'undefined') {
    try {
      json = localStorage.getItem(AUTH_KEY);
      if (!json) {
        return migrateFromLegacy();
      }
      return parseCredentials(json);
    } catch {
      return null;
    }
  }
  json = await getStoredAuthNative();
  if (!json) {
    return migrateFromLegacy();
  }
  return parseCredentials(json);
}

export async function setStoredCredentials(cred: DiscogsCredentials): Promise<void> {
  const json = JSON.stringify(cred);
  if (isWeb && typeof localStorage !== 'undefined') {
    localStorage.setItem(AUTH_KEY, json);
    return;
  }
  await setStoredAuthNative(json);
}

export async function clearStoredCredentials(): Promise<void> {
  if (isWeb && typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(AUTH_KEY);
      localStorage.removeItem(LEGACY_TOKEN_KEY);
    } catch {
      // Ignore
    }
    return;
  }
  await clearStoredAuthNative();
}

export async function hasStoredCredentials(): Promise<boolean> {
  const cred = await getStoredCredentials();
  return cred !== null;
}

// ---------------------------------------------------------------------------
// Legacy API – for backward compatibility, maps to credentials
// ---------------------------------------------------------------------------

/** @deprecated Use getStoredCredentials instead. Returns token for PAT; for OAuth returns null (use getStoredCredentials). */
export async function getStoredToken(): Promise<string | null> {
  const cred = await getStoredCredentials();
  if (!cred) return null;
  return cred.token;
}

/** Store a Personal Access Token. */
export async function setStoredToken(token: string): Promise<void> {
  await setStoredCredentials({ type: 'pat', token: token.trim() });
}

/** @deprecated Use clearStoredCredentials instead. */
export async function clearStoredToken(): Promise<void> {
  await clearStoredCredentials();
}

/** @deprecated Use hasStoredCredentials instead. */
export async function hasStoredToken(): Promise<boolean> {
  return hasStoredCredentials();
}
