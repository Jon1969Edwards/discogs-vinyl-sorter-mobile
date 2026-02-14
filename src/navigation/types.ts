/**
 * Navigation param lists.
 */

import type { ReleaseRow } from '../types';

export type RootStackParamList = {
  MainTabs: undefined;
  AlbumDetail: { release: ReleaseRow };
  Settings: undefined;
};

export type MainTabParamList = {
  Collection: undefined;
  Wishlist: undefined;
};
