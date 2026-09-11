import { mergeOcrResults, type OcrResult } from '../src/services/coverOcr';

describe('mergeOcrResults', () => {
  it('unions unique lines and keeps the taller copy', () => {
    const a: OcrResult = {
      text: 'The Beatles\nAbbey Road',
      lines: [
        { text: 'The Beatles', height: 20, confidence: 0.5 },
        { text: 'Abbey Road', height: 18, confidence: 0.4 },
      ],
    };
    const b: OcrResult = {
      text: 'the beatles\nEMI',
      lines: [
        { text: 'the beatles', height: 40, confidence: 0.9 },
        { text: 'EMI', height: 12, confidence: 0.8 },
      ],
    };
    const merged = mergeOcrResults([a, b]);
    const beatles = merged.lines.find(
      (l) => l.text.toLowerCase() === 'the beatles'
    );
    expect(beatles?.height).toBe(40);
    expect(beatles?.confidence).toBe(0.9);
    expect(merged.lines.some((l) => l.text === 'EMI')).toBe(true);
    expect(merged.lines.some((l) => /abbey/i.test(l.text))).toBe(true);
  });

  it('synthesizes lines from flat text when blocks are missing', () => {
    const merged = mergeOcrResults([{ text: 'Pink Floyd\nAnimals', lines: [] }]);
    expect(merged.lines.map((l) => l.text)).toEqual(['Pink Floyd', 'Animals']);
  });
});
