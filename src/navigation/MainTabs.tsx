/**
 * Bottom tab navigator – Collection and Wishlist.
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet } from 'react-native';
import { CollectionScreen } from '../screens/CollectionScreen';
import { WishlistScreen } from '../screens/WishlistScreen';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

type MainTabsProps = {
  onSignOut: () => void;
};

export function MainTabs({ onSignOut }: MainTabsProps) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#e94560',
        tabBarInactiveTintColor: '#666',
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen name="Collection">
        {(props) => (
          <CollectionScreen
            {...props}
            onSignOut={onSignOut}
          />
        )}
      </Tab.Screen>
      <Tab.Screen name="Wishlist">
        {(props) => (
          <WishlistScreen
            {...props}
            onSignOut={onSignOut}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#1a1a2e',
    borderTopColor: '#252542',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
});
