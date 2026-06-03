import { detectFormatCategories } from '../src/domain/sorting';
import { filterRowsByFormat } from '../src/domain/formatFilter';
import type { ReleaseRow } from '../src/types';

function row(categories: string[]): ReleaseRow {
  return {
    artist_display: 'A',
    title: 'T',
    year: 2000,
    label: '',
    catno: '',
    country: '',
    format_str: '',
    discogs_url: '',
    notes: '',
    format_categories: new Set(categories),
    sort_artist: 'a',
    sort_title: 't',
    thumb_url: '',
    cover_image_url: '',
  };
}

describe('format filter parity', () => {
  it('detect_format_categories', () => {
    const lp = {
      formats: [{ name: 'Vinyl', descriptions: ['LP', 'Album', '33 ⅓ RPM'] }],
    };
    const cats = detectFormatCategories(lp);
    expect(cats.has('lp')).toBe(true);
    expect(cats.has('vinyl')).toBe(true);

    const cd = { formats: [{ name: 'CD', descriptions: ['Album'] }] };
    expect([...detectFormatCategories(cd)].sort()).toEqual(['cd']);

    const box45 = {
      formats: [
        { name: 'Box Set' },
        { name: 'Vinyl', descriptions: ['7"', '45 RPM', 'Single'] },
      ],
    };
    const b = detectFormatCategories(box45);
    expect(b.has('boxset')).toBe(true);
    expect(b.has('vinyl45')).toBe(true);
    expect(b.has('vinyl')).toBe(true);
  });

  it('filter_rows_by_format', () => {
    const rows = [row(['lp', 'vinyl']), row(['cd']), row(['vinyl45', 'vinyl'])];

    expect(filterRowsByFormat(rows, new Set()).length).toBe(3);
    expect(filterRowsByFormat(rows, new Set(['everything'])).length).toBe(3);

    const lpOnly = filterRowsByFormat(rows, new Set(['lp']));
    expect(lpOnly.length).toBe(1);
    expect(lpOnly[0].format_categories?.has('lp')).toBe(true);

    expect(filterRowsByFormat(rows, new Set(['lp', 'cd'])).length).toBe(2);
    expect(filterRowsByFormat(rows, new Set(['cassette'])).length).toBe(0);
  });
});
