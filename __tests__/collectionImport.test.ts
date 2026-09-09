import {
  CollectionImportError,
  detectFormatCategoriesFromStr,
  parseCollectionText,
  parseDiscogsReleaseId,
  rowsFromRecords,
} from '../src/domain/collectionImport';
import { generateCsv, generateJson } from '../src/domain/export';
import { sortRows } from '../src/domain/sorting';
import { SOURCE_LOCAL, type ReleaseRow } from '../src/types';

function row(overrides: Partial<ReleaseRow> = {}): ReleaseRow {
  return {
    artist_display: 'Miles Davis',
    title: 'Kind of Blue',
    year: 1959,
    label: 'Columbia',
    catno: 'CL 1355',
    country: 'US',
    format_str: 'Vinyl, LP, Album',
    discogs_url: 'https://www.discogs.com/release/12345',
    notes: '',
    release_id: 12345,
    sort_artist: 'davis, miles',
    sort_title: 'kind of blue',
    thumb_url: '',
    cover_image_url: '',
    format_categories: new Set(['lp', 'vinyl']),
    source: 'discogs',
    item_id: 'discogs:12345',
    genre: 'Jazz',
    genres: ['Jazz', 'Modal'],
    styles: ['Hard Bop'],
    ...overrides,
  };
}

describe('collection import (Windows test_collection_import.py)', () => {
  it('parses Discogs release ids', () => {
    expect(parseDiscogsReleaseId('https://www.discogs.com/release/12345')).toBe(12345);
    expect(
      parseDiscogsReleaseId(
        'https://www.discogs.com/release/12345-Miles-Davis-Kind-Of-Blue'
      )
    ).toBe(12345);
    expect(parseDiscogsReleaseId('https://api.discogs.com/releases/99')).toBe(99);
    expect(parseDiscogsReleaseId('12345')).toBe(12345);
    expect(parseDiscogsReleaseId('')).toBeNull();
  });

  it('detects format categories from a Format column', () => {
    const lp = detectFormatCategoriesFromStr('Vinyl, LP, Album');
    expect(lp.has('lp') && lp.has('vinyl')).toBe(true);

    const cd = detectFormatCategoriesFromStr('CD, Album');
    expect([...cd].sort()).toEqual(['cd']);

    const single = detectFormatCategoriesFromStr('Vinyl, 7", 45 RPM, Single');
    expect(single.has('vinyl45') && single.has('vinyl')).toBe(true);

    const cassette = detectFormatCategoriesFromStr('Cassette, Album');
    expect([...cassette].sort()).toEqual(['cassette']);

    const looseLp = detectFormatCategoriesFromStr('LP');
    expect(looseLp.has('lp')).toBe(true);
  });

  it('round-trips Spindle CSV exports', () => {
    const src = [
      row(),
      row({
        artist_display: 'The Beatles',
        title: 'Abbey Road',
        year: 1969,
        catno: 'PCS 7088',
        release_id: null,
        discogs_url: '',
        item_id: '',
        source: SOURCE_LOCAL,
        format_str: 'Vinyl, LP, Album',
      }),
    ];
    const loaded = parseCollectionText(generateCsv(src), 'out.csv');
    expect(loaded).toHaveLength(2);
    expect(loaded[0].artist_display).toBe('Miles Davis');
    expect(loaded[0].release_id).toBe(12345);
    expect(loaded[0].title).toBe('Kind of Blue');
    expect(loaded[1].format_categories?.has('lp')).toBe(true);
    expect(loaded[1].item_id?.startsWith('local:')).toBe(true);
    expect(loaded[0].genre).toBe('Jazz');
    expect(loaded[0].genres).toEqual(['Jazz', 'Modal']);
  });

  it('round-trips JSON exports', () => {
    const loaded = parseCollectionText(generateJson([row()]), 'out.json');
    expect(loaded).toHaveLength(1);
    expect(loaded[0].catno).toBe('CL 1355');
    expect(loaded[0].release_id).toBe(12345);
    expect(loaded[0].genre).toBe('Jazz');
    expect(loaded[0].genres).toEqual(['Jazz', 'Modal']);
    expect(loaded[0].styles).toEqual(['Hard Bop']);
  });

  it('accepts spreadsheet headers', () => {
    const csv =
      'Artist,Title,Year,Format\n' +
      'David Bowie,Low,1977,LP\n' +
      'Talking Heads,Remain in Light,1980,"Vinyl, LP, Album"\n';
    const loaded = parseCollectionText(csv, 'sheet.csv');
    const bowie = loaded.find((r) => r.artist_display === 'David Bowie');
    expect(bowie).toBeTruthy();
    expect(bowie?.format_categories?.has('lp')).toBe(true);
  });

  it('parses genre CSV and sorts Unknown last', () => {
    const csv =
      'Artist,Title,Genre\n' +
      'Mystery Act,No Tags,\n' +
      'The Beatles,Abbey Road,Rock; Pop\n' +
      'Folk Person,Folk Album,"Folk, World, & Country"\n';
    const loaded = parseCollectionText(csv, 'genres.csv');
    const byTitle = Object.fromEntries(loaded.map((r) => [r.title, r]));
    expect(byTitle['Abbey Road'].genre).toBe('Rock');
    expect(byTitle['Abbey Road'].genres).toEqual(['Rock', 'Pop']);
    expect(byTitle['Folk Album'].genre).toBe('Folk, World, & Country');
    expect(byTitle['No Tags'].genre).toBe('Unknown');
    const sorted = sortRows(loaded, 'normal', 'genre');
    expect(sorted.map((r) => r.title)).toEqual([
      'Folk Album',
      'Abbey Road',
      'No Tags',
    ]);
  });

  it('rejects empty and invalid files', () => {
    expect(() => parseCollectionText('', 'empty.csv')).toThrow(CollectionImportError);
    expect(() => parseCollectionText('foo,bar\n1,2\n', 'nohead.csv')).toThrow(
      CollectionImportError
    );
    expect(() => parseCollectionText('{}', 'bad.json')).toThrow(CollectionImportError);
  });

  it('sorts imported rows like Windows', () => {
    const rows = rowsFromRecords([
      { Artist: 'The Beatles', Title: 'Abbey Road', Year: '1969', Format: 'LP' },
      {
        Artist: 'Miles Davis',
        Title: 'Kind of Blue',
        Year: '1959',
        Format: 'Vinyl, LP',
      },
    ]);
    const sorted = sortRows(rows, 'normal');
    expect(sorted[0].artist_display).toBe('The Beatles');
    expect(sorted[1].artist_display).toBe('Miles Davis');
  });
});
