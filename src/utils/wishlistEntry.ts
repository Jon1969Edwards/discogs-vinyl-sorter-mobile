/**
 * Map a collection row to a local wishlist entry.
 */

import type { ReleaseRow, WishlistEntry } from '../types';

export function rowToWishlistEntry(row: ReleaseRow): WishlistEntry {
  return {
    artist: row.artist_display,
    title: row.title,
    year: row.year ?? undefined,
    discogs_url: row.discogs_url,
    thumb: row.thumb_url,
    cover_image_url: row.cover_image_url,
    release_id: row.release_id ?? undefined,
    label: row.label,
    catno: row.catno,
    country: row.country,
    format: row.format_str,
    notes: row.notes,
    lowest_price: row.lowest_price ?? undefined,
    num_for_sale: row.num_for_sale ?? undefined,
    price_currency: row.price_currency,
  };
}
