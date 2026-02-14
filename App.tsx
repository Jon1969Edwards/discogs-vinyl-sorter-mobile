/**
 * Discogs Vinyl Sorter – Mobile
 */

import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthScreen } from './src/screens/AuthScreen';
import { CollectionScreen } from './src/screens/CollectionScreen';
import { AlbumDetailScreen } from './src/screens/AlbumDetailScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { SettingsProvider } from './src/contexts/SettingsContext';
import { getStoredToken } from './src/services';

const Stack = createNativeStackNavigator();

export default function App() {
  const [hasToken, setHasToken] = useState<boolean | null>(null);

  useEffect(() => {
    getStoredToken().then((token) => {
      setHasToken(token !== null && token.length > 0);
    });
  }, []);

  const handleAuthenticated = () => setHasToken(true);
  const handleSignOut = () => setHasToken(false);

  if (hasToken === null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#e94560" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#1a1a2e' },
          }}
        >
          {!hasToken ? (
            <Stack.Screen name="Auth">
              {(props) => (
                <AuthScreen
                  {...props}
                  onAuthenticated={handleAuthenticated}
                />
              )}
            </Stack.Screen>
          ) : (
            <SettingsProvider>
              <Stack.Screen name="Collection">
                {(props) => (
                  <CollectionScreen
                    {...props}
                    onSignOut={handleSignOut}
                  />
                )}
              </Stack.Screen>
              <Stack.Screen
                name="AlbumDetail"
                component={AlbumDetailScreen}
              />
              <Stack.Screen
                name="Settings"
                component={SettingsScreen}
              />
            </SettingsProvider>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
