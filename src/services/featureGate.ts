/**
 * Freemium feature limits (port of Windows core/feature_gate.py).
 */

import { isProCached } from './licensing';

export const FREE_RECORD_LIMIT = 100;

export function canFetchPrices(isPro = isProCached()): boolean {
  return isPro;
}

export function canCheckWishlistAvailability(isPro = isProCached()): boolean {
  return isPro;
}

export function canUseManualOrder(isPro = isProCached()): boolean {
  return isPro;
}

export function canPlayAudioPreview(isPro = isProCached()): boolean {
  return isPro;
}

export function canUseAbcDividers(isPro = isProCached()): boolean {
  return isPro;
}

export function applyRecordLimit<T>(
  rows: T[],
  isPro = isProCached()
): { rows: T[]; truncated: boolean } {
  if (isPro || rows.length <= FREE_RECORD_LIMIT) {
    return { rows, truncated: false };
  }
  return { rows: rows.slice(0, FREE_RECORD_LIMIT), truncated: true };
}

export function upgradeMessage(feature: string): string {
  return (
    `${feature} is included with Pro.\n\n` +
    'Pro also unlocks unlimited collection size, marketplace prices, ' +
    'wishlist checks, manual shelf order, and A/B/C shelf dividers.'
  );
}
