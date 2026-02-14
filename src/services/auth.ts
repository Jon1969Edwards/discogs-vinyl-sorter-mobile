/**
 * Secure token storage using Expo SecureStore.
 * Used for Discogs Personal Access Token (PAT).
 */

import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'discogs_token';

export async function getStoredToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setStoredToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token.trim());
}

export async function clearStoredToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // Ignore
  }
}

export async function hasStoredToken(): Promise<boolean> {
  const token = await getStoredToken();
  return token !== null && token.length > 0;
}
