import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadSettings,
  normalizeDiscogsCurrency,
  saveSettings,
} from '../src/services/settings';
import { DEFAULT_SETTINGS } from '../src/types';

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

describe('saveSettings / loadSettings', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('persists currency across load', async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, currency: 'SEK' });
    const loaded = await loadSettings();
    expect(loaded.currency).toBe('SEK');
  });
});
