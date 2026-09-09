/**
 * Pick or apply a CSV/JSON collection file (no Discogs).
 * expo-document-picker is loaded only when picking a file so older
 * preview APKs can still apply OTA JS (paste import) without that native module.
 */

import * as FileSystem from 'expo-file-system';
import {
  CollectionImportError,
  parseCollectionText,
} from '../domain/collectionImport';
import { setStoredCredentials } from './auth';
import { loadLocalCollection, saveLocalCollection } from './localCollection';

export async function applyImportedCollection(
  text: string,
  filename = 'collection.csv'
): Promise<number> {
  const rows = parseCollectionText(text, filename);
  await saveLocalCollection(rows, filename);
  await setStoredCredentials({ type: 'local' });
  return rows.length;
}

export async function startLocalSession(): Promise<void> {
  const existing = await loadLocalCollection();
  if (!existing) {
    await saveLocalCollection([], '');
  }
  await setStoredCredentials({ type: 'local' });
}

export async function pickAndImportCollection(): Promise<number | null> {
  let DocumentPicker: typeof import('expo-document-picker');
  try {
    DocumentPicker = await import('expo-document-picker');
  } catch {
    throw new CollectionImportError(
      'File picker is not in this install. Paste CSV or JSON on the sign-in screen instead.'
    );
  }
  const result = await DocumentPicker.getDocumentAsync({
    type: [
      'text/csv',
      'text/comma-separated-values',
      'application/json',
      'text/plain',
      '*/*',
    ],
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  const uri = asset.uri;
  const name = asset.name || 'collection.csv';
  const text = await FileSystem.readAsStringAsync(uri);
  return applyImportedCollection(text, name);
}

export { CollectionImportError };
