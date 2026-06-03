/**
 * Manual shelf order – port of Windows ManualOrderManager (.discogs_manual_order.json).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ReleaseRow } from '../types';

const ORDER_KEY = 'discogs_manual_order';

interface ManualOrderData {
  version: number;
  username: string | null;
  order: number[];
  enabled: boolean;
}

const EMPTY: ManualOrderData = {
  version: 1,
  username: null,
  order: [],
  enabled: false,
};

async function loadData(): Promise<ManualOrderData> {
  try {
    const raw = await AsyncStorage.getItem(ORDER_KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as ManualOrderData;
    if (parsed.version === 1) return parsed;
  } catch {
    // ignore
  }
  return { ...EMPTY };
}

async function saveData(data: ManualOrderData): Promise<void> {
  await AsyncStorage.setItem(ORDER_KEY, JSON.stringify(data));
}

export async function manualOrderIsEnabled(): Promise<boolean> {
  const d = await loadData();
  return d.enabled;
}

export async function setManualOrderEnabled(enabled: boolean): Promise<void> {
  const d = await loadData();
  d.enabled = enabled;
  await saveData(d);
}

export async function setManualOrderUsername(username: string): Promise<void> {
  const d = await loadData();
  if (d.username !== username) {
    await saveData({ ...EMPTY, username });
  } else {
    d.username = username;
    await saveData(d);
  }
}

export async function setManualOrder(releaseIds: number[]): Promise<void> {
  const d = await loadData();
  d.order = releaseIds;
  d.enabled = true;
  await saveData(d);
}

export async function clearManualOrder(): Promise<void> {
  await saveData({ ...EMPTY });
}

export async function applyManualOrder(rows: ReleaseRow[]): Promise<ReleaseRow[]> {
  const d = await loadData();
  if (!d.enabled) return rows;
  const order = d.order;
  if (!order.length) return rows;

  const rowById = new Map<number, ReleaseRow>();
  for (const r of rows) {
    if (r.release_id != null) rowById.set(r.release_id, r);
  }

  const ordered: ReleaseRow[] = [];
  const seen = new Set<number>();

  for (const rid of order) {
    const row = rowById.get(rid);
    if (row && !seen.has(rid)) {
      ordered.push(row);
      seen.add(rid);
    }
  }

  for (const row of rows) {
    if (row.release_id != null && !seen.has(row.release_id)) {
      ordered.push(row);
      seen.add(row.release_id);
    } else if (row.release_id == null) {
      ordered.push(row);
    }
  }

  return ordered;
}
