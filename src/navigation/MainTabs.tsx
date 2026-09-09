/**
 * Custom tab bar – Collection, Scan, Wishlist.
 */

import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CollectionScreen } from '../screens/CollectionScreen';
import { ScannerScreen } from '../screens/ScannerScreen';
import { WishlistScreen } from '../screens/WishlistScreen';
import { AppText } from '../components/ui/AppText';
import { colors, spacing } from '../theme';

type TabId = 'collection' | 'scan' | 'wishlist';

type MainTabsProps = {
  navigation: {
    navigate: (name: string, params?: object) => void;
  };
  onSignOut: () => void;
};

export function MainTabs({ navigation, onSignOut }: MainTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('collection');
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View style={[styles.content, activeTab !== 'collection' && styles.hidden]}>
        <CollectionScreen navigation={navigation} onSignOut={onSignOut} />
      </View>
      <View style={[styles.content, activeTab !== 'scan' && styles.hidden]}>
        <ScannerScreen navigation={navigation} />
      </View>
      <View style={[styles.content, activeTab !== 'wishlist' && styles.hidden]}>
        <WishlistScreen />
      </View>
      <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'collection' && styles.tabActive]}
          onPress={() => setActiveTab('collection')}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'collection' }}
        >
          <Ionicons
            name={activeTab === 'collection' ? 'albums' : 'albums-outline'}
            size={22}
            color={activeTab === 'collection' ? colors.accent : colors.textMuted}
          />
          <AppText
            variant="bodySmall"
            style={[
              styles.tabLabel,
              activeTab === 'collection' && styles.tabLabelActive,
            ]}
          >
            Collection
          </AppText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'scan' && styles.tabActive]}
          onPress={() => setActiveTab('scan')}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'scan' }}
        >
          <Ionicons
            name={activeTab === 'scan' ? 'scan' : 'scan-outline'}
            size={22}
            color={activeTab === 'scan' ? colors.accent : colors.textMuted}
          />
          <AppText
            variant="bodySmall"
            style={[
              styles.tabLabel,
              activeTab === 'scan' && styles.tabLabelActive,
            ]}
          >
            Scan
          </AppText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'wishlist' && styles.tabActive]}
          onPress={() => setActiveTab('wishlist')}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'wishlist' }}
        >
          <Ionicons
            name={activeTab === 'wishlist' ? 'bookmark' : 'bookmark-outline'}
            size={22}
            color={activeTab === 'wishlist' ? colors.accent : colors.textMuted}
          />
          <AppText
            variant="bodySmall"
            style={[
              styles.tabLabel,
              activeTab === 'wishlist' && styles.tabLabelActive,
            ]}
          >
            Wishlist
          </AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  hidden: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    pointerEvents: 'none',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.surface,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    gap: 4,
  },
  tabActive: {
    borderTopWidth: 2,
    borderTopColor: colors.accent,
    marginTop: -1,
  },
  tabLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: colors.accent,
  },
});
