/**
 * Offline Pro license activation (HMAC-signed VSS1 keys).
 * Port of Windows core/licensing.py — same key format and signing rules.
 */

import { Platform } from 'react-native';
import CryptoJS from 'crypto-js';
import { BUNDLED_LICENSE_SECRET } from '../constants/licenseSecrets';

const LICENSE_STORAGE_KEY = 'spindle_license';
const LICENSE_PREFIX = 'VSS1';

/** Dev-only fallback when no env/baked secret (never for release). */
const DEFAULT_SECRET = 'VSS-CHANGE-ME-IN-RELEASE-BUILDS-2026';

export type StoredLicense = {
  valid: boolean;
  tier: string;
  email: string;
  exp: number;
  key_hint: string;
};

export type LicensePayload = {
  tier: string;
  email: string;
  exp: number;
};

let _testSecretOverride: string | null | undefined = undefined;
let _proCache: boolean | null = null;

/** Jest only: inject secret (null = empty / fail closed). */
export function __setLicenseSecretForTests(secret: string | null | undefined): void {
  _testSecretOverride = secret;
  _proCache = null;
}

export function __resetProCacheForTests(): void {
  _proCache = null;
}

function envLicenseSecret(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const env = require('@env') as { VSS_LICENSE_SECRET?: string };
    return (env.VSS_LICENSE_SECRET || '').trim();
  } catch {
    return '';
  }
}

function envDevPro(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const env = require('@env') as { SPINDLE_DEV_PRO?: string; VSS_DEV_PRO?: string };
    const raw = (
      env.SPINDLE_DEV_PRO ||
      env.VSS_DEV_PRO ||
      ''
    )
      .trim()
      .toLowerCase();
    return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
  } catch {
    return false;
  }
}

function previewOrDevChannel(): boolean {
  if (typeof __DEV__ !== 'undefined' && __DEV__) return true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Updates = require('expo-updates') as { channel?: string | null };
    const channel = (Updates.channel || '').trim();
    // Empty: Metro, Jest, or a bundle with no channel. Production channel stays fail-closed.
    return !channel || channel === 'preview' || channel === 'development';
  } catch {
    return true;
  }
}

function resolveSecret(): string {
  if (_testSecretOverride !== undefined) {
    return _testSecretOverride ?? '';
  }
  const fromEnv = envLicenseSecret();
  if (fromEnv) return fromEnv;
  const bundled = (BUNDLED_LICENSE_SECRET || '').trim();
  if (bundled) return bundled;
  // Preview APKs / OTAs often compile without .env (CI has no VSS_LICENSE_SECRET).
  // Match Windows unsigned builds so keys minted on this PC still verify.
  if (previewOrDevChannel()) {
    return DEFAULT_SECRET;
  }
  return '';
}

/** Canonical JSON matching Python json.dumps(..., sort_keys=True, separators=(",", ":")). */
export function canonicalJson(payload: Record<string, unknown>): string {
  const keys = Object.keys(payload).sort();
  const parts = keys.map((k) => {
    const v = payload[k];
    return `${JSON.stringify(k)}:${JSON.stringify(v)}`;
  });
  return `{${parts.join(',')}}`;
}

function signPayload(payload: Record<string, unknown>): string {
  const secret = resolveSecret();
  if (!secret) return '';
  const body = canonicalJson(payload);
  const hash = CryptoJS.HmacSHA256(body, secret);
  const b64 = CryptoJS.enc.Base64.stringify(hash);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function generateLicenseKey(
  email = '',
  tier = 'pro',
  years = 99
): string {
  const secret = resolveSecret();
  if (!secret) {
    throw new Error(
      'Set VSS_LICENSE_SECRET (or bake licenseSecrets) before generating keys.'
    );
  }
  const payload: LicensePayload = {
    tier,
    email: email.trim().toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + years * 365 * 86400,
  };
  const sig = signPayload(payload as unknown as Record<string, unknown>);
  const blob = CryptoJS.enc.Base64.stringify(
    CryptoJS.enc.Utf8.parse(JSON.stringify(payload))
  )
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${LICENSE_PREFIX}-${blob}.${sig}`;
}

function parseKey(key: string): LicensePayload | null {
  const trimmed = key.trim();
  if (!trimmed.startsWith(`${LICENSE_PREFIX}-`)) return null;
  const rest = trimmed.slice(LICENSE_PREFIX.length + 1);
  const dot = rest.lastIndexOf('.');
  if (dot < 0) return null;
  const blob = rest.slice(0, dot);
  const sig = rest.slice(dot + 1);
  try {
    const pad = '='.repeat((4 - (blob.length % 4)) % 4);
    const json = CryptoJS.enc.Utf8.stringify(
      CryptoJS.enc.Base64.parse(blob.replace(/-/g, '+').replace(/_/g, '/') + pad)
    );
    const payload = JSON.parse(json) as LicensePayload;
    const expected = signPayload(payload as unknown as Record<string, unknown>);
    if (!expected || expected !== sig) return null;
    if ((payload.exp || 0) < Date.now() / 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

function keyHint(key: string): string {
  const t = key.trim();
  if (t.length < 8) return t.slice(0, 24);
  return `${t.slice(0, 4)}…${t.slice(-4)}`.slice(0, 24);
}

const memoryStore = new Map<string, string>();
const isWeb = Platform.OS === 'web';

function useMemoryStore(): boolean {
  return isWeb || process.env.NODE_ENV === 'test';
}

async function storageGet(key: string): Promise<string | null> {
  if (useMemoryStore()) {
    return memoryStore.get(key) ?? null;
  }
  try {
    const SecureStore = await import('expo-secure-store');
    return await SecureStore.getItemAsync(key);
  } catch {
    return memoryStore.get(key) ?? null;
  }
}

async function storageSet(key: string, value: string): Promise<void> {
  memoryStore.set(key, value);
  if (useMemoryStore()) return;
  try {
    const SecureStore = await import('expo-secure-store');
    await SecureStore.setItemAsync(key, value);
  } catch {
    // memory fallback already set
  }
}

async function storageDelete(key: string): Promise<void> {
  memoryStore.delete(key);
  if (useMemoryStore()) return;
  try {
    const SecureStore = await import('expo-secure-store');
    await SecureStore.deleteItemAsync(key);
  } catch {
    // ignore
  }
}

async function loadStoredLicense(): Promise<StoredLicense | null> {
  try {
    const raw = await storageGet(LICENSE_STORAGE_KEY);
    if (!raw) return null;
    const lic = JSON.parse(raw) as StoredLicense;
    if (lic?.valid && (lic.exp || 0) >= Date.now() / 1000) return lic;
  } catch {
    // ignore
  }
  return null;
}

async function saveStoredLicense(lic: StoredLicense | null): Promise<void> {
  if (!lic) {
    await storageDelete(LICENSE_STORAGE_KEY);
    return;
  }
  await storageSet(LICENSE_STORAGE_KEY, JSON.stringify(lic));
}

export function isDevProUnlocked(): boolean {
  return envDevPro();
}

/** Sync cache after refreshProStatus / activate / deactivate. */
export function isProCached(): boolean {
  if (isDevProUnlocked()) return true;
  return _proCache === true;
}

export async function refreshProStatus(): Promise<boolean> {
  if (isDevProUnlocked()) {
    _proCache = true;
    return true;
  }
  const lic = await loadStoredLicense();
  _proCache = lic != null;
  return _proCache;
}

export async function isPro(): Promise<boolean> {
  return refreshProStatus();
}

export async function licenseSummary(): Promise<string> {
  if (isDevProUnlocked()) {
    const lic = await loadStoredLicense();
    if (!lic) return 'Pro (dev)';
  }
  const lic = await loadStoredLicense();
  if (!lic) return 'Free';
  const email = lic.email || 'Licensed';
  return `Pro (${email})`;
}

export async function getStoredLicense(): Promise<StoredLicense | null> {
  return loadStoredLicense();
}

export async function activateLicense(
  key: string
): Promise<{ ok: boolean; message: string }> {
  const trimmed = key.trim().replace(/\s+/g, '');
  if (!trimmed.startsWith(`${LICENSE_PREFIX}-`)) {
    return {
      ok: false,
      message: `This doesn't look like a license key (it should start with ${LICENSE_PREFIX}-).`,
    };
  }
  const payload = parseKey(trimmed);
  if (!payload) {
    return {
      ok: false,
      message:
        'Invalid or expired license key. If this key works on Windows, this install may be using a different signing secret.',
    };
  }
  const lic: StoredLicense = {
    valid: true,
    tier: payload.tier || 'pro',
    email: payload.email || '',
    exp: payload.exp || 0,
    key_hint: keyHint(trimmed),
  };
  await saveStoredLicense(lic);
  _proCache = true;
  return { ok: true, message: 'Pro activated. Thank you!' };
}

export async function deactivateLicense(): Promise<void> {
  await saveStoredLicense(null);
  _proCache = isDevProUnlocked();
}
