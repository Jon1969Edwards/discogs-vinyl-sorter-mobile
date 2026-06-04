import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  batchSetCachedPrices,
  getFreshPriceEntries,
  PRICE_CACHE_MAX_AGE_MS,
} from '../src/services/collectionCache';

describe('collectionCache prices', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('getFreshPriceEntries returns only non-stale prices', async () => {
    const now = Date.now();
    await AsyncStorage.setItem(
      'discogs_collection_cache',
      JSON.stringify({
        version: 1,
        username: 'user',
        releases: {
          '1': {
            cached_at: now,
            prices: {
              USD: {
                lowest_price: 5,
                num_for_sale: 2,
                fetched_at: now,
              },
            },
          },
          '2': {
            cached_at: now,
            prices: {
              USD: {
                lowest_price: 99,
                num_for_sale: 1,
                fetched_at: now - PRICE_CACHE_MAX_AGE_MS - 1000,
              },
            },
          },
        },
        last_full_fetch: null,
        collection_item_count: null,
      })
    );

    const fresh = await getFreshPriceEntries('USD');
    expect(fresh.size).toBe(1);
    expect(fresh.get(1)).toEqual({ lowest: 5, numForSale: 2 });
  });

  it('batchSetCachedPrices writes all updates in one save', async () => {
    await batchSetCachedPrices(
      [
        { releaseId: 10, lowest: 1.5, numForSale: 4 },
        { releaseId: 11, lowest: null, numForSale: 0 },
      ],
      'GBP'
    );

    const raw = await AsyncStorage.getItem('discogs_collection_cache');
    const data = JSON.parse(raw!);
    expect(data.releases['10'].prices.GBP.lowest_price).toBe(1.5);
    expect(data.releases['11'].prices.GBP.lowest_price).toBeNull();
  });
});
