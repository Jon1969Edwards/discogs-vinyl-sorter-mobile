/**
 * Discogs Vinyl Sorter – Mobile
 */

import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthScreen } from './src/screens/AuthScreen';
import { MainTabs } from './src/navigation/MainTabs';
import { SettingsProvider } from './src/context/SettingsContext';
import { hasStoredAuth, clearAllAuth } from './src/services';

const Stack = createNativeStackNavigator();

export default function App() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    hasStoredAuth().then(setAuthenticated);
  }, []);

  const handleAuthenticated = useCallback(() => setAuthenticated(true), []);

  const handleSignOut = useCallback(async () => {
    await clearAllAuth();
    setAuthenticated(false);
  }, []);

  if (authenticated === null) {
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
          {!authenticated ? (
            <Stack.Screen name="Auth">
              {() => (
                <AuthScreen onAuthenticated={handleAuthenticated} />
              )}
            </Stack.Screen>
          ) : (
            <Stack.Screen name="Main">
              {() => (
                <SettingsProvider>
                  <MainTabs onSignOut={handleSignOut} />
                </SettingsProvider>
              )}
            </Stack.Screen>
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
