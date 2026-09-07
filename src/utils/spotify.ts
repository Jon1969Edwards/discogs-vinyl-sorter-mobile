/**
 * Open album search on Spotify (port of Windows core/spotify_utils.py).
 */

import { Linking } from 'react-native';

export function spotifySearchUrl(artist: string, album: string): string {
  const query = `album:${album} artist:${artist}`;
  return `https://open.spotify.com/search/${encodeURIComponent(query)}`;
}

export async function openAlbumOnSpotify(
  artist: string,
  album: string
): Promise<void> {
  const query = `album:${album} artist:${artist}`;
  const appUri = `spotify:search:${encodeURIComponent(query)}`;
  try {
    const can = await Linking.canOpenURL(appUri);
    if (can) {
      await Linking.openURL(appUri);
      return;
    }
  } catch {
    // fall through
  }
  await Linking.openURL(spotifySearchUrl(artist, album));
}
