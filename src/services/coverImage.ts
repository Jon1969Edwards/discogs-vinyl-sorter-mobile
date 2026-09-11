/**
 * Best-effort cover photo prep for OCR.
 * Resizes the long side to ~1600px (up or down) so ML Kit sees a consistent scale.
 * expo-image-manipulator has no contrast filter — the resized JPEG is the "enhanced" pass.
 */

import { Platform } from 'react-native';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

const TARGET_LONG_SIDE = 1600;
const SKIP_MIN = 900;

export async function prepareCoverForOcr(
  uri: string,
  width?: number,
  height?: number
): Promise<string[]> {
  if (!uri) return [];
  const uris = [uri];
  if (Platform.OS === 'web') return uris;

  const w = width ?? 0;
  const h = height ?? 0;
  const longest = Math.max(w, h);
  if (longest > 0 && longest <= TARGET_LONG_SIDE && longest >= SKIP_MIN) {
    return uris;
  }

  try {
    const resize =
      w > 0 && h > w
        ? { resize: { height: TARGET_LONG_SIDE } }
        : { resize: { width: TARGET_LONG_SIDE } };
    const result = await manipulateAsync(uri, [resize], {
      compress: 0.92,
      format: SaveFormat.JPEG,
    });
    if (result.uri && result.uri !== uri) {
      uris.push(result.uri);
    }
  } catch {
    // Preprocess is optional — OCR the original URI.
  }
  return uris;
}
