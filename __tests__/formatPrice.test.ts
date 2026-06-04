import { formatMarketplacePrice } from '../src/utils/formatPrice';

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
