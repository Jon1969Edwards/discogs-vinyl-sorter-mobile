import type { ReleaseRow } from '../types';

/** Stable list key: Discogs instance_id when present, else release_id + list index. */
export function releaseRowKey(item: ReleaseRow, index: number): string {
  if (item.instance_id != null) return `i-${item.instance_id}`;
  if (item.release_id != null) return `r-${item.release_id}-${index}`;
  return `row-${index}`;
}
