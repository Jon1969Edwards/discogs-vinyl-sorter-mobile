export {
  createDiscogsClient,
  createAuthenticatedClient,
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
  getStoredToken,
  setStoredToken,
  clearStoredToken,
  clearAllAuth,
  hasStoredAuth,
  hasStoredToken,
  getAuthCredentials,
  setOAuthCredentials,
  getOAuthCredentials,
  clearOAuthCredentials,
  type AuthCredentials,
  type AuthMode,
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
