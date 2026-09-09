/**
 * Best-effort on-device OCR for cover / catno photos.
 * Returns empty string when no OCR module is available (user can type query).
 */

import { Platform } from 'react-native';

export async function extractTextFromImage(uri: string): Promise<string> {
  if (!uri || Platform.OS === 'web') return '';

  try {
    // Optional native dependency — may be absent until a rebuild with ML Kit.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@react-native-ml-kit/text-recognition') as {
      default: { recognize: (u: string) => Promise<{ text?: string }> };
    };
    const TextRecognition = mod.default;
    if (!TextRecognition?.recognize) return '';
    const result = await TextRecognition.recognize(uri);
    return (result?.text || '').trim();
  } catch {
    return '';
  }
}

export function isOcrAvailable(): boolean {
  if (Platform.OS === 'web') return false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@react-native-ml-kit/text-recognition');
    return true;
  } catch {
    return false;
  }
}
