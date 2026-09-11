/**
 * Best-effort on-device OCR for cover / catno photos.
 * Returns empty result when no OCR module is available (user can type query).
 */

import { Platform } from 'react-native';

export type OcrLine = {
  text: string;
  height: number;
  confidence: number | null;
};

export type OcrResult = {
  text: string;
  lines: OcrLine[];
};

const EMPTY: OcrResult = { text: '', lines: [] };

type MlKitLine = {
  text?: string;
  frame?: { height?: number; width?: number };
  confidenceScore?: number;
};

type MlKitBlock = { lines?: MlKitLine[] };

type MlKitResult = {
  text?: string;
  blocks?: MlKitBlock[];
};

function linesFromText(text: string): OcrLine[] {
  return (text || '')
    .split(/\r?\n/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => ({ text: t, height: 0, confidence: null }));
}

function normalizeLineKey(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function mergeOcrResults(results: OcrResult[]): OcrResult {
  const seen = new Map<string, OcrLine>();
  for (const r of results) {
    const lines = r.lines.length ? r.lines : linesFromText(r.text);
    for (const line of lines) {
      const text = (line.text || '').trim();
      const key = normalizeLineKey(text);
      if (!key) continue;
      const next: OcrLine = {
        text,
        height: line.height || 0,
        confidence: line.confidence ?? null,
      };
      const prev = seen.get(key);
      if (!prev) {
        seen.set(key, next);
        continue;
      }
      const taller = next.height > prev.height;
      const moreConfident =
        next.confidence != null &&
        (prev.confidence == null || next.confidence > prev.confidence);
      if (taller) {
        seen.set(key, {
          ...next,
          confidence: next.confidence ?? prev.confidence,
        });
      } else if (moreConfident) {
        seen.set(key, { ...prev, confidence: next.confidence });
      }
    }
  }
  const lines = [...seen.values()];
  return { text: lines.map((l) => l.text).join('\n'), lines };
}

export async function extractTextFromImage(uri: string): Promise<OcrResult> {
  if (!uri || Platform.OS === 'web') return EMPTY;

  try {
    // Optional native dependency — may be absent until a rebuild with ML Kit.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@react-native-ml-kit/text-recognition') as {
      default: { recognize: (u: string) => Promise<MlKitResult> };
    };
    const TextRecognition = mod.default;
    if (!TextRecognition?.recognize) return EMPTY;
    const result = await TextRecognition.recognize(uri);
    const lines: OcrLine[] = [];
    for (const block of result.blocks || []) {
      for (const line of block.lines || []) {
        const text = (line.text || '').trim();
        if (!text) continue;
        lines.push({
          text,
          height: line.frame?.height ?? 0,
          confidence:
            typeof line.confidenceScore === 'number' ? line.confidenceScore : null,
        });
      }
    }
    const text =
      (result.text || '').trim() || lines.map((l) => l.text).join('\n');
    if (!lines.length && text) {
      return { text, lines: linesFromText(text) };
    }
    return { text, lines };
  } catch {
    return EMPTY;
  }
}

export async function extractTextFromImages(uris: string[]): Promise<OcrResult> {
  const unique = [...new Set(uris.filter(Boolean))];
  if (!unique.length) return EMPTY;
  const results = await Promise.all(unique.map(extractTextFromImage));
  return mergeOcrResults(results);
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
