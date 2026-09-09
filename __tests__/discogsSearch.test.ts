import {
  extractLikelyCatno,
  normalizeBarcode,
  queryFromOcrText,
  searchResultToReleaseRow,
  splitSearchTitle,
} from '../src/utils/discogsSearch';

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
  });

  it('extracts likely catno tokens', () => {
    expect(extractLikelyCatno('Catalog PCS-7088 UK')).toMatch(/PCS-?7088/i);
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
