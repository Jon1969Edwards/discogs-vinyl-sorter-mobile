/**
 * Collection display settings (persisted via AsyncStorage).
 */

import type { VariousPolicy, SortBy } from '../utils/sorting';

export interface CollectionSettings {
  sortBy: SortBy;
  variousPolicy: VariousPolicy;
  showDividers: boolean;
  lpStrict: boolean;
}

export const DEFAULT_SETTINGS: CollectionSettings = {
  sortBy: 'artist',
  variousPolicy: 'last',
  showDividers: true,
  lpStrict: false,
};
