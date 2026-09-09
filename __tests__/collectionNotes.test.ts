import { formatCollectionNotes, extractSpindleGenre, injectSpindleGenre } from '../src/utils/collectionNotes';

describe('formatCollectionNotes', () => {
  it('passes through plain strings', () => {
    expect(formatCollectionNotes('Near mint')).toBe('Near mint');
  });

  it('joins Discogs field objects', () => {
    expect(
      formatCollectionNotes([
        { field_id: 1, value: 'VG+' },
        { field_id: 2, value: 'Original sleeve' },
      ])
    ).toBe('VG+\nOriginal sleeve');
  });

  it('handles a single field object', () => {
    expect(formatCollectionNotes({ field_id: 1, value: 'Test press' })).toBe(
      'Test press'
    );
  });

  it('hides the spindle-genre sync marker from display', () => {
    expect(
      formatCollectionNotes('Gift from dad\nspindle-genre: Indie')
    ).toBe('Gift from dad');
    expect(extractSpindleGenre('spindle-genre: Punk/Hardcore, Reggae')).toBe(
      'Punk/Hardcore, Reggae'
    );
    expect(injectSpindleGenre('Gift from dad', 'Indie')).toBe(
      'Gift from dad\nspindle-genre: Indie'
    );
  });
});
