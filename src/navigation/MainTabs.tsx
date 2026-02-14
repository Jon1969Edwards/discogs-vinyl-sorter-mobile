/**
 * Custom tab bar – Collection and Wishlist (no @react-navigation/bottom-tabs).
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CollectionScreen } from '../screens/CollectionScreen';
import { WishlistScreen } from '../screens/WishlistScreen';

type TabId = 'collection' | 'wishlist';

type MainTabsProps = {
  navigation: {
    navigate: (name: string, params?: object) => void;
  };
  onSignOut: () => void;
};

export function MainTabs({ navigation, onSignOut }: MainTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('collection');

  return (
    <View style={styles.container}>
      <View style={[styles.content, activeTab !== 'collection' && styles.hidden]}>
        <CollectionScreen navigation={navigation} onSignOut={onSignOut} />
      </View>
      <View style={[styles.content, activeTab !== 'wishlist' && styles.hidden]}>
        <WishlistScreen navigation={navigation} onSignOut={onSignOut} />
      </View>
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'collection' && styles.tabActive]}
          onPress={() => setActiveTab('collection')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'collection' && styles.tabTextActive,
            ]}
          >
            Collection
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'wishlist' && styles.tabActive]}
          onPress={() => setActiveTab('wishlist')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'wishlist' && styles.tabTextActive,
            ]}
          >
            Wishlist
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
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
    backgroundColor: '#1a1a2e',
    borderTopWidth: 1,
    borderTopColor: '#252542',
    paddingBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    borderTopWidth: 2,
    borderTopColor: '#e94560',
    marginTop: -1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  tabTextActive: {
    color: '#e94560',
  },
});
