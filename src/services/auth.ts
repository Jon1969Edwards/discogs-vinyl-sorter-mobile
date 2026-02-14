/**
 * Secure token storage. Uses Expo SecureStore on native (iOS/Android),
 * localStorage on web (SecureStore is not supported in the browser).
 */

import { Platform } from 'react-native';

const TOKEN_KEY = 'discogs_token';

// SecureStore only works on iOS/Android; use localStorage on web
const isWeb = Platform.OS === 'web';

async function getStoredTokenNative(): Promise<string | null> {
  const SecureStore = await import('expo-secure-store');
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

async function setStoredTokenNative(token: string): Promise<void> {
  const SecureStore = await import('expo-secure-store');
  await SecureStore.setItemAsync(TOKEN_KEY, token.trim());
}

async function clearStoredTokenNative(): Promise<void> {
  try {
    const SecureStore = await import('expo-secure-store');
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // Ignore
  }
}

export async function getStoredToken(): Promise<string | null> {
  if (isWeb && typeof localStorage !== 'undefined') {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }
  return getStoredTokenNative();
}

export async function setStoredToken(token: string): Promise<void> {
  if (isWeb && typeof localStorage !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token.trim());
    return;
  }
  await setStoredTokenNative(token);
}

export async function clearStoredToken(): Promise<void> {
  if (isWeb && typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // Ignore
    }
    return;
  }
  await clearStoredTokenNative();
}

export async function hasStoredToken(): Promise<boolean> {
  const token = await getStoredToken();
  return token !== null && token.length > 0;
}
