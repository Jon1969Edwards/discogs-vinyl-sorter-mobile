/** Format marketplace amounts using the row/settings currency (not always USD). */

const CURRENCY_SYMBOL: Partial<Record<string, string>> = {
  USD: '$',
  GBP: '£',
  EUR: '€',
  JPY: '¥',
};

export function formatMarketplacePrice(
  value: number | null | undefined,
  currency = 'USD'
): string {
  if (value == null || value === 0) return '—';
  const code = currency.toUpperCase();
  const decimals = code === 'JPY' ? 0 : 2;
  const amount = value.toFixed(decimals);
  const symbol = CURRENCY_SYMBOL[code];
  if (symbol) {
    return `${symbol}${amount}`;
  }
  return `${amount} ${code}`;
}
