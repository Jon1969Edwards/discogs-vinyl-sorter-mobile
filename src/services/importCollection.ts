/**
 * Pick or apply a CSV/JSON collection file (no Discogs).
 *
 * This preview APK has no expo-document-picker native module. Do not import
 * that package here — Metro would ship it in the OTA bundle and a missing
 * native module greys out the app on launch.
 */

import {
  CollectionImportError,
  parseCollectionText,
} from '../domain/collectionImport';
import { getStoredCredentials, setStoredCredentials } from './auth';
import type { DiscogsCredentials } from './auth';
import { loadLocalCollection, saveLocalCollection } from './localCollection';

async function keepLocalProfile(
  extra?: Pick<Extract<DiscogsCredentials, { type: 'local' }>, 'name' | 'email'>
): Promise<void> {
  const current = await getStoredCredentials();
  const name =
    extra?.name || (current?.type === 'local' ? current.name : undefined);
  const email =
    extra?.email || (current?.type === 'local' ? current.email : undefined);
  await setStoredCredentials({ type: 'local', name, email });
}

export async function applyImportedCollection(
  text: string,
  filename = 'collection.csv'
): Promise<number> {
  const rows = parseCollectionText(text, filename);
  await saveLocalCollection(rows, filename);
  await keepLocalProfile();
  return rows.length;
}

export async function startLocalSession(
  profile?: Pick<Extract<DiscogsCredentials, { type: 'local' }>, 'name' | 'email'>
): Promise<void> {
  const existing = await loadLocalCollection();
  if (!existing) {
    await saveLocalCollection([], '');
  }
  await keepLocalProfile(profile);
}

export async function pickAndImportCollection(): Promise<number | null> {
  throw new CollectionImportError(
    'File picker needs a newer APK. Use “Or paste CSV / JSON” on the sign-in screen.'
  );
}

export { CollectionImportError };
