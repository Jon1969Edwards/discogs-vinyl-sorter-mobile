export {
  createDiscogsClient,
  apiGet,
  getIdentity,
  getCollectionCount,
  fetchCollectionPage,
  iterateCollection,
  fetchMarketplaceStats,
  attachPricesToRows,
  type DiscogsIdentity,
  type DiscogsCollectionRelease,
  type DiscogsCollectionResponse,
  type DiscogsMarketplaceStats,
} from './discogsApi';

export {
  getStoredCredentials,
  setStoredCredentials,
  clearStoredCredentials,
  hasStoredCredentials,
  getStoredToken,
  setStoredToken,
  clearStoredToken,
  hasStoredToken,
  clearAllAuth,
  type DiscogsCredentials,
} from './auth';

export {
  exportAndShare,
  type ExportFormat,
} from './exportShare';

export { loadSettings, saveSettings, updateSettings, formatsToSet } from './settings';

export {
  runOAuthFlow,
  isOAuthConfigured,
  getConsumerCredentials,
} from './oauthDiscogs';

export {
  loadLocalWishlist,
  syncWishlistFromDiscogs,
  addToWishlist,
  removeFromWishlist,
  isInWishlist,
} from './wishlist';

export {
  applyManualOrder,
  setManualOrder,
  setManualOrderEnabled,
  manualOrderIsEnabled,
  clearManualOrder,
} from './manualOrder';

export { useCachedThumb, getCachedThumbUri } from './thumbnailCache';

export {
  getLastCollectionCount,
  getLastFullFetch,
  markFullFetch,
  saveCachedRows,
  loadCachedRows,
} from './collectionCache';
