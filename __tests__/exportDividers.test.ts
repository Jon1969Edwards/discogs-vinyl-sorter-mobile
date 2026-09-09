import {
  generateTxtLines,
  resolveDividerMode,
  sortLetterToShelf,
} from '../src/domain/export';
import type { ReleaseRow } from '../src/types';

function mockRow(artist: string, sortArtist: string): ReleaseRow {
  return {
    artist_display: artist,
    title: 'Album',
    year: 2000,
    label: '',
    catno: '',
    country: '',
    format_str: '',
    discogs_url: '',
    notes: '',
    sort_artist: sortArtist,
    sort_title: 'album',
    thumb_url: '',
    cover_image_url: '',
  };
}

describe('export dividers parity', () => {
  it('resolve_divider_mode', () => {
    expect(resolveDividerMode(false, null)).toBe('none');
    expect(resolveDividerMode(true, null)).toBe('letter');
    expect(resolveDividerMode(false, 'abc')).toBe('abc');
  });

  it('sort_letter_to_shelf', () => {
    expect(sortLetterToShelf('A')).toBe('A');
    expect(sortLetterToShelf('H')).toBe('A');
    expect(sortLetterToShelf('I')).toBe('B');
    expect(sortLetterToShelf('P')).toBe('B');
    expect(sortLetterToShelf('Q')).toBe('C');
    expect(sortLetterToShelf('#')).toBe('A');
  });

  it('abc shelf dividers in txt', () => {
    const rows = [
      mockRow('Arctic Monkeys', 'arctic monkeys'),
      mockRow('Iron Maiden', 'iron maiden'),
      mockRow('Queen', 'queen'),
    ];
    const lines = generateTxtLines(rows, { dividerMode: 'abc' });
    expect(lines[0]).toBe('=== SHELF A (A–H) ===');
    expect(lines[1]).toContain('Arctic Monkeys');
    expect(lines[2]).toBe('=== SHELF B (I–P) ===');
    expect(lines[3]).toContain('Iron Maiden');
    expect(lines[4]).toBe('=== SHELF C (Q–Z) ===');
    expect(lines[5]).toContain('Queen');
  });

  it('letter dividers in txt', () => {
    const rows = [
      mockRow('Arctic Monkeys', 'arctic monkeys'),
      mockRow('Iron Maiden', 'iron maiden'),
      mockRow('Queen', 'queen'),
    ];
    const lines = generateTxtLines(rows, { dividerMode: 'letter' });
    expect(lines[0]).toBe('=== A ===');
    expect(lines[2]).toBe('=== I ===');
    expect(lines[4]).toBe('=== Q ===');
  });

  it('genre section headers when sortBy is genre', () => {
    const jazz = mockRow('Miles Davis', 'davis, miles');
    jazz.genre = 'Jazz';
    jazz.genres = ['Jazz'];
    const rock = mockRow('The Beatles', 'beatles');
    rock.genre = 'Rock';
    rock.genres = ['Rock'];
    const unknown = mockRow('Mystery', 'mystery');
    unknown.genre = '';
    unknown.genres = [];
    const lines = generateTxtLines([jazz, rock, unknown], {
      dividerMode: 'abc',
      sortBy: 'genre',
    });
    expect(lines[0]).toBe('=== Jazz ===');
    expect(lines[1]).toContain('Miles Davis');
    expect(lines[2]).toBe('=== Rock ===');
    expect(lines[3]).toContain('The Beatles');
    expect(lines[4]).toBe('=== Unknown ===');
    expect(lines[5]).toContain('Mystery');
    expect(resolveDividerMode(true, 'letter', 'genre')).toBe('genre');
    expect(resolveDividerMode(false, null)).toBe('none');
  });
});
