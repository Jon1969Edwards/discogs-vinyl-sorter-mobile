/**
 * Pick or apply a CSV/JSON collection file (no Discogs).
 */

import * as DocumentPicker from 'expo-document-picker';
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
