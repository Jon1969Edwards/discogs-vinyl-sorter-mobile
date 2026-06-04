import { normalizeDiscogsCurrency } from '../src/services/settings';

describe('normalizeDiscogsCurrency', () => {
  it('accepts valid Discogs codes', () => {
    expect(normalizeDiscogsCurrency('gbp')).toBe('GBP');
    expect(normalizeDiscogsCurrency('EUR')).toBe('EUR');
  });

  it('falls back to USD for invalid codes', () => {
    expect(normalizeDiscogsCurrency('XYZ')).toBe('USD');
    expect(normalizeDiscogsCurrency('')).toBe('USD');
  });
});
