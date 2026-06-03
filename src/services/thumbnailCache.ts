/**
 * Cache album thumbnails under app documents (mirrors Windows .discogs_thumbnails intent).
 */

import { useEffect, useState } from 'react';
import * as FileSystem from 'expo-file-system';

const CACHE_DIR = `${FileSystem.documentDirectory}discogs_thumbnails/`;

async function ensureDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

function cachePathForUrl(url: string): string {
  const safe = url.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 120);
  return `${CACHE_DIR}${safe}.jpg`;
}

export async function getCachedThumbUri(
  remoteUrl: string | undefined
): Promise<string | undefined> {
  if (!remoteUrl) return undefined;
  await ensureDir();
  const path = cachePathForUrl(remoteUrl);
  const info = await FileSystem.getInfoAsync(path);
  if (info.exists) return path;

  try {
    const result = await FileSystem.downloadAsync(remoteUrl, path);
    return result.uri;
  } catch {
    return remoteUrl;
  }
}

/** Resolve remote thumb URL to local cache path when possible */
export function useCachedThumb(uri: string | undefined): string | undefined {
  const [local, setLocal] = useState(uri);
  useEffect(() => {
    if (!uri) {
      setLocal(undefined);
      return;
    }
    getCachedThumbUri(uri).then(setLocal);
  }, [uri]);
  return local;
}
