import {
  categoriesFromFormatStr,
  isSameRelease,
  looksLikeCollectionRow,
} from '../src/services/addToCollection';
import { SOURCE_DISCOGS, SOURCE_LOCAL } from '../src/types';
import type { ReleaseRow } from '../src/types';

function row(partial: Partial<ReleaseRow>): ReleaseRow {
  return {
    artist_display: 'Billy Bragg',
    title: "Life's A Riot With Spy vs Spy",
    year: 2006,
    label: 'Cooking Vinyl',
    catno: 'COOK CD 302',
    country: 'UK',
    format_str: 'CD, Album',
    discogs_url: '',
    notes: '',
    sort_artist: 'billy bragg',
    sort_title: "life's a riot with spy vs spy",
    thumb_url: '',
    cover_image_url: '',
    ...partial,
  };
}

describe('addToCollection helpers', () => {
  it('matches by release_id when both have one', () => {
    expect(
      isSameRelease(row({ release_id: 1, title: 'A' }), row({ release_id: 1, title: 'B' }))
    ).toBe(true);
    expect(
      isSameRelease(row({ release_id: 1 }), row({ release_id: 2 }))
    ).toBe(false);
  });

  it('matches artist, title, and catno when ids are missing', () => {
    expect(isSameRelease(row({ catno: 'COOKCD302' }), row({ catno: 'COOK CD 302' }))).toBe(
      true
    );
    expect(isSameRelease(row({ catno: 'COOK CD 302' }), row({ catno: 'OTHER' }))).toBe(
      false
    );
  });

  it('treats collection-tab rows as already owned', () => {
    expect(looksLikeCollectionRow(row({ source: SOURCE_DISCOGS }))).toBe(true);
    expect(looksLikeCollectionRow(row({ source: SOURCE_LOCAL }))).toBe(true);
    expect(looksLikeCollectionRow(row({ instance_id: 9 }))).toBe(true);
    expect(looksLikeCollectionRow(row({ source: 'discogs_search' }))).toBe(false);
  });

  it('infers format categories from search format text', () => {
    expect([...categoriesFromFormatStr('CD, Album, Reissue')]).toContain('cd');
    const vinyl = categoriesFromFormatStr('Vinyl, LP, Album');
    expect(vinyl.has('vinyl')).toBe(true);
    expect(vinyl.has('lp')).toBe(true);
  });
});
