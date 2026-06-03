/**
 * Write export to file and share via system share sheet.
 */

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { ReleaseRow } from '../types';
import type { DividerMode } from '../types';
import { generateTxt, generateCsv, generateJson } from '../domain/export';
import { loadSettings } from './settings';

export type ExportFormat = 'txt' | 'csv' | 'json';

const FILENAMES: Record<ExportFormat, string> = {
  txt: 'vinyl_shelf_order.txt',
  csv: 'vinyl_shelf_order.csv',
  json: 'vinyl_shelf_order.json',
};

export async function exportAndShare(
  rows: ReleaseRow[],
  format: ExportFormat,
  options?: {
    dividerMode?: DividerMode;
    showPrice?: boolean;
  }
): Promise<void> {
  const settings = await loadSettings();
  const dividerMode = options?.dividerMode ?? settings.divider_mode;
  const showPrice = options?.showPrice ?? settings.show_prices;

  const filename = FILENAMES[format];
  let content: string;

  switch (format) {
    case 'txt':
      content = generateTxt(rows, {
        dividerMode,
        showPrice,
      });
      break;
    case 'csv':
      content = generateCsv(rows);
      break;
    case 'json':
      content = generateJson(rows);
      break;
    default:
      throw new Error(`Unknown format: ${format}`);
  }

  const path = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(path, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Sharing is not available on this device');
  }

  await Sharing.shareAsync(path, {
    mimeType:
      format === 'json'
        ? 'application/json'
        : format === 'csv'
          ? 'text/csv'
          : 'text/plain',
    dialogTitle: `Share ${filename}`,
  });
}
