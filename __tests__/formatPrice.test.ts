import { formatListPrice, formatMarketplacePrice } from '../src/utils/formatPrice';
import type { ReleaseRow } from '../src/types';

function row(partial: Partial<ReleaseRow>): ReleaseRow {
  return {
    artist_display: 'A',
    title: 'T',
    year: 2000,
    label: '',
    catno: '',
    country: '',
    format_str: 'LP',
    discogs_url: '',
    notes: '',
    sort_artist: 'a',
    sort_title: 't',
    thumb_url: '',
    cover_image_url: '',
    ...partial,
  };
}

describe('formatMarketplacePrice', () => {
  it('formats USD with dollar sign', () => {
    expect(formatMarketplacePrice(48.81, 'USD')).toBe('$48.81');
  });

  it('formats SEK with currency code suffix', () => {
    expect(formatMarketplacePrice(420, 'SEK')).toBe('420.00 SEK');
  });

  it('formats GBP with pound sign', () => {
    expect(formatMarketplacePrice(12.5, 'GBP')).toBe('£12.50');
  });
});

describe('formatListPrice', () => {
  it('returns null when showPrice is off', () => {
    expect(
      formatListPrice(
        row({ lowest_price: 10, num_for_sale: 2, price_currency: 'USD' }),
        'USD',
        false
      )
    ).toBeNull();
  });

  it('formats listed price with sale count', () => {
    expect(
      formatListPrice(
        row({ lowest_price: 48.81, num_for_sale: 3, price_currency: 'SEK' }),
        'USD',
        true
      )
    ).toBe('48.81 SEK+ (3)');
  });

  it('returns Not listed when showPrice on but no marketplace listing', () => {
    expect(formatListPrice(row({ lowest_price: null }), 'USD', true)).toBe(
      'Not listed'
    );
  });
});
