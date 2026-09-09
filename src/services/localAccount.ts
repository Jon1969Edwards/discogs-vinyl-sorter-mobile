/**
 * Device-only Spindle account (no Discogs, no cloud).
 */

import { Platform } from 'react-native';
import CryptoJS from 'crypto-js';
import { startLocalSession } from './importCollection';
import type { DiscogsCredentials } from './auth';

const ACCOUNT_KEY = 'spindle_local_account';
const isWeb = Platform.OS === 'web';

export type StoredLocalAccount = {
  version: 1;
  name: string;
  email: string;
  salt: string;
  passwordHash: string;
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashLocalPassword(password: string, salt: string): string {
  return CryptoJS.SHA256(`${salt}:${password}`).toString(CryptoJS.enc.Hex);
}

export function validateLocalAccountForm(input: {
  name: string;
  email: string;
  password: string;
  confirm?: string;
}): string | null {
  const name = input.name.trim();
  const email = normalizeEmail(input.email);
  if (name.length < 2) return 'Enter a name (at least 2 characters).';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Enter a valid email address.';
  }
  if (input.password.length < 6) {
    return 'Password must be at least 6 characters.';
  }
  if (input.confirm != null && input.password !== input.confirm) {
    return 'Passwords do not match.';
  }
  return null;
}

async function readRaw(): Promise<string | null> {
  if (isWeb && typeof localStorage !== 'undefined') {
    try {
      return localStorage.getItem(ACCOUNT_KEY);
    } catch {
      return null;
    }
  }
  try {
    const SecureStore = await import('expo-secure-store');
    return await SecureStore.getItemAsync(ACCOUNT_KEY);
  } catch {
    return null;
  }
}

async function writeRaw(json: string): Promise<void> {
  if (isWeb && typeof localStorage !== 'undefined') {
    localStorage.setItem(ACCOUNT_KEY, json);
    return;
  }
  const SecureStore = await import('expo-secure-store');
  await SecureStore.setItemAsync(ACCOUNT_KEY, json);
}

async function deleteRaw(): Promise<void> {
  if (isWeb && typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(ACCOUNT_KEY);
    } catch {
      // ignore
    }
    return;
  }
  try {
    const SecureStore = await import('expo-secure-store');
    await SecureStore.deleteItemAsync(ACCOUNT_KEY);
  } catch {
    // ignore
  }
}

export async function getLocalAccount(): Promise<Omit<
  StoredLocalAccount,
  'salt' | 'passwordHash'
> | null> {
  const raw = await readRaw();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredLocalAccount;
    if (parsed?.version !== 1 || !parsed.email || !parsed.name) return null;
    return { version: 1, name: parsed.name, email: parsed.email };
  } catch {
    return null;
  }
}

export async function hasLocalAccount(): Promise<boolean> {
  return (await getLocalAccount()) != null;
}

export async function createLocalAccount(input: {
  name: string;
  email: string;
  password: string;
  confirm: string;
}): Promise<DiscogsCredentials> {
  const error = validateLocalAccountForm(input);
  if (error) throw new Error(error);
  if (await getLocalAccount()) {
    throw new Error(
      'A Spindle account already exists on this phone. Sign in instead.'
    );
  }
  const salt = CryptoJS.lib.WordArray.random(16).toString(CryptoJS.enc.Hex);
  const record: StoredLocalAccount = {
    version: 1,
    name: input.name.trim(),
    email: normalizeEmail(input.email),
    salt,
    passwordHash: hashLocalPassword(input.password, salt),
  };
  await writeRaw(JSON.stringify(record));
  const cred: DiscogsCredentials = {
    type: 'local',
    name: record.name,
    email: record.email,
  };
  await startLocalSession(cred);
  return cred;
}

export async function signInLocalAccount(
  email: string,
  password: string
): Promise<DiscogsCredentials> {
  const raw = await readRaw();
  if (!raw) {
    throw new Error('No Spindle account on this phone. Create one first.');
  }
  let parsed: StoredLocalAccount;
  try {
    parsed = JSON.parse(raw) as StoredLocalAccount;
  } catch {
    throw new Error('Could not read the saved account.');
  }
  if (normalizeEmail(email) !== parsed.email) {
    throw new Error('Email or password is incorrect.');
  }
  const next = hashLocalPassword(password, parsed.salt);
  if (next !== parsed.passwordHash) {
    throw new Error('Email or password is incorrect.');
  }
  const cred: DiscogsCredentials = {
    type: 'local',
    name: parsed.name,
    email: parsed.email,
  };
  await startLocalSession(cred);
  return cred;
}

export async function deleteLocalAccount(): Promise<void> {
  await deleteRaw();
}
