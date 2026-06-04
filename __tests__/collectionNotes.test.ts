import { formatCollectionNotes } from '../src/utils/collectionNotes';

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
});
