import React, { useCallback, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { CollectionScreen } from '../screens/CollectionScreen';
import { WishlistScreen } from '../screens/WishlistScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

interface MainTabsProps {
  onSignOut: () => void;
}

export function MainTabs({ onSignOut }: MainTabsProps) {
  const [settingsVersion, setSettingsVersion] = useState(0);

  const onSettingsChanged = useCallback(() => {
    setSettingsVersion((v) => v + 1);
  }, []);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#16213e',
          borderTopColor: '#252542',
        },
        tabBarActiveTintColor: '#e94560',
        tabBarInactiveTintColor: '#888',
      }}
    >
      <Tab.Screen
        name="Shelf"
        options={{
          title: 'Shelf Order',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="albums-outline" size={size} color={color} />
          ),
        }}
      >
        {() => <CollectionScreen settingsVersion={settingsVersion} />}
      </Tab.Screen>
      <Tab.Screen
        name="Wishlist"
        component={WishlistScreen}
        options={{
          title: 'Wishlist',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      >
        {() => (
          <SettingsScreen
            onSignOut={onSignOut}
            onSettingsChanged={onSettingsChanged}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
