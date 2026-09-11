import {
  catnoSearchAttempts,
  catnoQueryVariants,
  coverSearchAttempts,
  dedupeSearchResults,
  extractCatnoFromOcr,
  extractCoverQuery,
  extractLikelyCatno,
  extractLikelyYear,
  normalizeBarcode,
  queryFromOcrText,
  rankSearchResults,
  searchResultToReleaseRow,
  splitSearchTitle,
} from '../src/utils/discogsSearch';
import type { DiscogsSearchResult } from '../src/services/discogsApi';

describe('discogsSearch helpers', () => {
  it('splits Artist - Title', () => {
    expect(splitSearchTitle('Pink Floyd - The Wall')).toEqual({
      artist: 'Pink Floyd',
      album: 'The Wall',
    });
  });

  it('normalizes barcodes to digits', () => {
    expect(normalizeBarcode('0 4228-39235-1 8')).toBe('042283923518');
  });

  it('builds OCR query from noisy lines', () => {
    const q = queryFromOcrText('LP\nThe Beatles\nAbbey Road\n1969\nEMI');
    expect(q.toLowerCase()).toContain('beatles');
    expect(q.toLowerCase()).toContain('abbey');
    expect(q.toLowerCase()).not.toMatch(/\blp\b/);
    expect(q).not.toMatch(/1969/);
  });

  it('drops sleeve slogans and keeps a short artist/title pair', () => {
    const cover = extractCoverQuery(
      'STEREO\nPink Floyd\nThe Dark Side of the Moon\n1973\nHarvest'
    );
    expect(cover.query.toLowerCase()).toContain('pink floyd');
    expect(cover.query.toLowerCase()).toContain('dark side');
    expect(cover.query.toLowerCase()).not.toContain('stereo');
    expect(cover.year).toBe(1973);
  });

  it('prefers larger type over a long tracklist line', () => {
    const cover = extractCoverQuery({
      text: 'Pink Floyd\nThe Dark Side of the Moon\nThe Great Gig in the Sky',
      lines: [
        { text: 'Pink Floyd', height: 42 },
        { text: 'The Dark Side of the Moon', height: 38 },
        { text: 'The Great Gig in the Sky', height: 12 },
        { text: 'Money', height: 11 },
      ],
    });
    expect(cover.query.toLowerCase()).toContain('pink floyd');
    expect(cover.query.toLowerCase()).toContain('dark side');
    expect(cover.query.toLowerCase()).not.toContain('great gig');
  });

  it('keeps catno out of the text query and records year', () => {
    const cover = extractCoverQuery('The Beatles\nAbbey Road\nPCS 7088\n1969');
    expect(cover.catno).toMatch(/PCS-?7088/i);
    expect(cover.query.toUpperCase()).not.toContain('PCS');
    expect(cover.year).toBe(1969);
    expect(cover.shortQuery.toLowerCase()).toMatch(/beatles|abbey/);
  });

  it('extracts likely catno tokens', () => {
    expect(extractLikelyCatno('Catalog PCS-7088 UK')).toMatch(/PCS-?7088/i);
  });

  it('picks a catalog number out of noisy label OCR', () => {
    const cat = extractCatnoFromOcr(
      'STEREO\nMade in UK\nPCS 7088\n1969\nAll rights reserved'
    );
    expect(cat).toMatch(/PCS-?7088/i);
  });

  it('prefers a letter-digit catno over a UPC-like digit string', () => {
    const cat = extractCatnoFromOcr('042283923518\nPCS-7088\n1969');
    expect(cat).toMatch(/PCS-?7088/i);
    expect(cat).not.toMatch(/04228/);
  });

  it('ignores a year when extracting catno from OCR', () => {
    expect(extractCatnoFromOcr('1969\nAbbey Road')).toBeNull();
  });

  it('prefers a larger-type catno line when frames exist', () => {
    const cat = extractCatnoFromOcr({
      text: 'SO-383\nPCS-7088',
      lines: [
        { text: 'SO-383', height: 10 },
        { text: 'PCS-7088', height: 40 },
      ],
    });
    expect(cat).toBe('PCS-7088');
  });

  it('expands compact catnos like COOKCD302 for Discogs', () => {
    expect(catnoQueryVariants('COOKCD302')).toEqual([
      'COOK CD 302',
      'COOKCD 302',
      'COOKCD302',
    ]);
  });

  it('searches catno variants without a Vinyl filter', () => {
    expect(catnoSearchAttempts({ catno: 'PCS7088' })).toEqual([
      { catno: 'PCS 7088' },
      { catno: 'PCS7088' },
    ]);
    expect(
      catnoSearchAttempts({ catno: 'PCS7088', barcode: '042283923518' })[0]
    ).toEqual({ catno: 'PCS 7088' });
    expect(catnoSearchAttempts({ barcode: '0 4228-39235-1 8' })).toEqual([
      { barcode: '042283923518' },
    ]);
  });

  it('extracts a plausible year', () => {
    expect(extractLikelyYear('Recorded 1969 London')).toBe(1969);
    expect(extractLikelyYear('no year here')).toBeNull();
  });

  it('searches catno before free text, Vinyl first', () => {
    const cover = extractCoverQuery('The Beatles\nAbbey Road\nPCS 7088');
    const attempts = coverSearchAttempts({ cover });
    expect(attempts[0]).toEqual({ catno: cover.catno!, format: 'Vinyl' });
    expect(attempts[1]).toEqual({ catno: cover.catno! });
    expect(attempts[2]).toEqual({ query: cover.query, format: 'Vinyl' });
    expect(attempts.some((a) => a.query === cover.shortQuery)).toBe(true);
  });

  it('tries a still-image barcode before catno/text', () => {
    const cover = extractCoverQuery('The Beatles\nAbbey Road');
    const attempts = coverSearchAttempts({
      barcode: '0 4228-39235-1 8',
      cover,
    });
    expect(attempts[0]).toEqual({ barcode: '042283923518' });
  });

  it('ranks vinyl, year, and token overlap above a CD pressing', () => {
    const hits: DiscogsSearchResult[] = [
      {
        id: 1,
        title: 'Nirvana - Nevermind',
        year: '1991',
        format: ['CD', 'Album'],
        catno: 'DGCD-24425',
      },
      {
        id: 2,
        title: 'Nirvana - Nevermind',
        year: '1991',
        format: ['Vinyl', 'LP', 'Album'],
        catno: 'GF-24425',
      },
      {
        id: 3,
        title: 'Someone Else - Other Album',
        year: '2001',
        format: ['Vinyl', 'LP'],
        catno: 'XX-1',
      },
    ];
    const ranked = rankSearchResults(hits, {
      query: 'Nirvana Nevermind',
      shortQuery: 'Nirvana',
      catno: null,
      year: 1991,
    });
    expect(ranked[0].id).toBe(2);
    expect(ranked[ranked.length - 1].id).toBe(3);
  });

  it('boosts an exact catalog-number hit', () => {
    const hits: DiscogsSearchResult[] = [
      {
        id: 10,
        title: 'The Beatles - Abbey Road',
        format: ['Vinyl', 'LP'],
        catno: 'PCS-7088',
      },
      {
        id: 11,
        title: 'The Beatles - Abbey Road',
        format: ['Vinyl', 'LP'],
        catno: 'SO-383',
      },
    ];
    const ranked = rankSearchResults(hits, {
      query: 'The Beatles Abbey Road',
      shortQuery: 'The Beatles',
      catno: 'PCS7088',
      year: null,
    });
    expect(ranked[0].id).toBe(10);
  });

  it('dedupes search hits by release id', () => {
    const hits: DiscogsSearchResult[] = [
      { id: 1, title: 'A' },
      { id: 1, title: 'A again' },
      { id: 2, title: 'B' },
    ];
    expect(dedupeSearchResults(hits).map((h) => h.id)).toEqual([1, 2]);
  });

  it('maps search hit to ReleaseRow', () => {
    const row = searchResultToReleaseRow({
      id: 249504,
      title: 'Nirvana - Nevermind',
      year: '1991',
      thumb: 'https://example.com/t.jpg',
      cover_image: 'https://example.com/c.jpg',
      catno: 'DGCD-24425',
      country: 'US',
      format: ['CD', 'Album'],
      label: ['DGC'],
      uri: '/release/249504',
    });
    expect(row.artist_display).toBe('Nirvana');
    expect(row.title).toBe('Nevermind');
    expect(row.release_id).toBe(249504);
    expect(row.discogs_url).toContain('discogs.com');
    expect(row.catno).toBe('DGCD-24425');
  });
});
