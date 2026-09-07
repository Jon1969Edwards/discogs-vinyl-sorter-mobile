/**
 * Write export to file and share via system share sheet.
 * Optionally keeps a durable copy under Documents/exports/.
 */

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { ReleaseRow } from '../types';
import type { DividerMode } from '../types';
import { generateTxt, generateCsv, generateJson } from '../domain/export';
import { loadSettings } from './settings';
import { refreshProStatus } from './licensing';
import {
  applyRecordLimit,
  canUseAbcDividers,
} from './featureGate';

export type ExportFormat = 'txt' | 'csv' | 'json';

const FILENAMES: Record<ExportFormat, string> = {
  txt: 'spindle_shelf_order.txt',
  csv: 'spindle_shelf_order.csv',
  json: 'spindle_shelf_order.json',
};

export type ExportResult = {
  truncated: boolean;
  savedPath: string | null;
  shared: boolean;
};

export async function exportAndShare(
  rows: ReleaseRow[],
  format: ExportFormat,
  options?: {
    dividerMode?: DividerMode;
    showPrice?: boolean;
  }
): Promise<ExportResult> {
  const settings = await loadSettings();
  const pro = await refreshProStatus();
  const { rows: limited, truncated } = applyRecordLimit(rows, pro);

  let dividerMode = options?.dividerMode ?? settings.divider_mode;
  if (dividerMode === 'abc' && !canUseAbcDividers(pro)) {
    dividerMode = 'letter';
  }
  const showPrice =
    (options?.showPrice ?? settings.show_prices) && pro;

  const filename = FILENAMES[format];
  let content: string;

  switch (format) {
    case 'txt':
      content = generateTxt(limited, {
        dividerMode,
        showPrice,
      });
      break;
    case 'csv':
      content = generateCsv(limited);
      break;
    case 'json':
      content = generateJson(limited);
      break;
    default:
      throw new Error(`Unknown format: ${format}`);
  }

  let savedPath: string | null = null;
  if (settings.save_last_export !== false && FileSystem.documentDirectory) {
    const dir = `${FileSystem.documentDirectory}exports/`;
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }
    savedPath = `${dir}${filename}`;
    await FileSystem.writeAsStringAsync(savedPath, content, {
      encoding: FileSystem.EncodingType.UTF8,
    });
  }

  const cachePath = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(cachePath, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Sharing is not available on this device');
  }

  await Sharing.shareAsync(cachePath, {
    mimeType:
      format === 'json'
        ? 'application/json'
        : format === 'csv'
          ? 'text/csv'
          : 'text/plain',
    dialogTitle: `Share ${filename}`,
  });

  return { truncated, savedPath, shared: true };
}
