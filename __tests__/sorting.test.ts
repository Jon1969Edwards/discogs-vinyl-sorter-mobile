import { makeSortKeys, sortRows, isVariousArtist } from '../src/domain/sorting';
import type { ReleaseRow } from '../src/types';

function sortKey(
  artist: string,
  title = 'X',
  opts: { lnf?: boolean; safe?: boolean } = {}
): string {
  return makeSortKeys(artist, title, {
    lastNameFirst: opts.lnf ?? false,
    lnfSafeBands: opts.safe ?? false,
  })[0];
}

describe('sorting parity with Windows test_sorting.py', () => {
  it('Box Tops stays literal under safe-bands', () => {
    expect(sortKey('Box Tops', 'X', { lnf: true, safe: true })).toBe('box tops');
  });

  it('Box Tops flips without safe-bands', () => {
    expect(sortKey('Box Tops', 'X', { lnf: true, safe: false })).toBe('tops, box');
  });

  it('Miles Davis flips', () => {
    expect(sortKey('Miles Davis', 'X', { lnf: true, safe: false })).toBe('davis, miles');
    expect(sortKey('Miles Davis', 'X', { lnf: true, safe: true })).toBe('davis, miles');
  });

  it('The Beatles article strip', () => {
    expect(sortKey('The Beatles', 'X', { lnf: true, safe: false })).toBe('beatles');
    expect(sortKey('The Beatles', 'X', { lnf: true, safe: true })).toBe('beatles');
  });

  it('Thelonious Monk flips', () => {
    expect(sortKey('Thelonious Monk', 'X', { lnf: true })).toBe('monk, thelonious');
  });

  it('Jean-Michel Jarre flips', () => {
    expect(sortKey('Jean-Michel Jarre', 'X', { lnf: true })).toBe('jarre, jean-michel');
  });

  it('Ludwig van Beethoven with allow_3', () => {
    const k = makeSortKeys('Ludwig van Beethoven', 'X', {
      lastNameFirst: true,
      lnfAllow3: true,
      lnfSafeBands: true,
    });
    expect(k[0]).toBe('beethoven, ludwig van');
  });

  it('Beach Boys safe-bands', () => {
    expect(sortKey('Beach Boys', 'X', { lnf: true, safe: false })).toBe('boys, beach');
    expect(sortKey('Beach Boys', 'X', { lnf: true, safe: true })).toBe('beach boys');
  });

  it('Fine Young Cannibals three-word band', () => {
    expect(sortKey('Fine Young Cannibals', 'X', { lnf: true, safe: false })).toBe(
      'fine young cannibals'
    );
  });

  it('Big Star safe-bands', () => {
    expect(sortKey('Big Star', 'X', { lnf: true, safe: true })).toBe('big star');
  });

  it('Agnostic Front safe-bands', () => {
    expect(sortKey('Agnostic Front', 'X', { lnf: true, safe: true })).toBe('agnostic front');
  });

  it('Elvis Costello and the Attractions consolidates', () => {
    const solo = sortKey('Elvis Costello', 'X', { safe: true });
    const band = sortKey('Elvis Costello and the Attractions', 'X', { safe: true });
    expect(solo).toBe(band);
    const amp = sortKey('Elvis Costello & The Attractions', 'X', { safe: true });
    expect(solo).toBe(amp);
  });

  it('Various Artists title policy', () => {
    const r1: ReleaseRow = {
      artist_display: 'Various Artists',
      title: 'Zebra Songs',
      year: 2000,
      label: '',
      catno: '',
      country: '',
      format_str: '',
      discogs_url: '',
      notes: '',
      sort_artist: '',
      sort_title: '',
      thumb_url: '',
      cover_image_url: '',
    };
    const r2: ReleaseRow = { ...r1, title: 'Alpha Tunes', year: 1999 };
    [r1.sort_artist, r1.sort_title] = makeSortKeys(r1.artist_display, r1.title, {
      lastNameFirst: true,
      lnfSafeBands: true,
    });
    [r2.sort_artist, r2.sort_title] = makeSortKeys(r2.artist_display, r2.title, {
      lastNameFirst: true,
      lnfSafeBands: true,
    });
    const sorted = sortRows([r1, r2], 'title', 'artist');
    expect(sorted[0].title).toBe('Alpha Tunes');
    expect(isVariousArtist('Various Artists')).toBe(true);
  });
});
