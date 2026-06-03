/**
 * Secure credential storage (PAT + OAuth 1.0a).
 */

import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'discogs_token';
const OAUTH_TOKEN_KEY = 'discogs_oauth_token';
const OAUTH_SECRET_KEY = 'discogs_oauth_secret';

export type AuthMode = 'none' | 'pat' | 'oauth';

export interface AuthCredentials {
  mode: AuthMode;
  pat?: string;
  oauthToken?: string;
  oauthSecret?: string;
}

export async function getStoredToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setStoredToken(token: string): Promise<void> {
  await clearOAuthCredentials();
  await SecureStore.setItemAsync(TOKEN_KEY, token.trim());
}

export async function getOAuthCredentials(): Promise<{
  token: string;
  secret: string;
} | null> {
  try {
    const token = await SecureStore.getItemAsync(OAUTH_TOKEN_KEY);
    const secret = await SecureStore.getItemAsync(OAUTH_SECRET_KEY);
    if (token && secret) return { token, secret };
  } catch {
    // ignore
  }
  return null;
}

export async function setOAuthCredentials(
  token: string,
  secret: string
): Promise<void> {
  await clearStoredToken();
  await SecureStore.setItemAsync(OAUTH_TOKEN_KEY, token);
  await SecureStore.setItemAsync(OAUTH_SECRET_KEY, secret);
}

export async function clearOAuthCredentials(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(OAUTH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(OAUTH_SECRET_KEY);
  } catch {
    // ignore
  }
}

export async function clearStoredToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // ignore
  }
}

export async function clearAllAuth(): Promise<void> {
  await clearStoredToken();
  await clearOAuthCredentials();
}

export async function getAuthCredentials(): Promise<AuthCredentials> {
  const oauth = await getOAuthCredentials();
  if (oauth) {
    return {
      mode: 'oauth',
      oauthToken: oauth.token,
      oauthSecret: oauth.secret,
    };
  }
  const pat = await getStoredToken();
  if (pat) return { mode: 'pat', pat };
  return { mode: 'none' };
}

export async function hasStoredAuth(): Promise<boolean> {
  const creds = await getAuthCredentials();
  return creds.mode !== 'none';
}

/** @deprecated use hasStoredAuth */
export async function hasStoredToken(): Promise<boolean> {
  return hasStoredAuth();
}
