/**
 * Application name and version (aligned with Windows core/version.py).
 */

export const APP_NAME = 'Spindle';
export const APP_SLUG = 'spindle';
export const APP_VERSION = '1.0.0';

export const GITHUB_OWNER = 'Jon1969Edwards';
export const GITHUB_REPO = 'discogs-vinyl-sorter-mobile';
export const GITHUB_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}`;

export const SUPPORT_EMAIL = 'jon1969edwards@gmail.com';

/** Default Discogs User-Agent (must identify the app per Discogs API rules). */
export const DEFAULT_USER_AGENT = `${APP_NAME}/${APP_VERSION} (+${GITHUB_URL})`;

export const DISCOGS_DISCLAIMER = 'Not affiliated with Discogs.';

/** Sentinel: Buy Pro hidden while checkout points at GitHub Releases. */
const GITHUB_RELEASES_URL =
  'https://github.com/Jon1969Edwards/discogs-vinyl-sorter-windows/releases/latest';

/** Override at release with a real store URL when checkout exists. */
export const PURCHASE_URL = GITHUB_RELEASES_URL;

/** True when Buy Pro should open a real checkout (not GitHub Releases). */
export function purchaseStoreReady(): boolean {
  const url = (PURCHASE_URL || '').trim();
  if (!url) return false;
  if (url.replace(/\/$/, '') === GITHUB_RELEASES_URL.replace(/\/$/, '')) {
    return false;
  }
  return true;
}

export const PRO_BENEFITS = [
  'Unlimited collection size (no 100-record Free limit)',
  'Marketplace prices with local cache',
  'Wishlist availability checks',
  'Manual shelf order and A/B/C shelf dividers',
] as const;
