/**
 * Auth screen – enter Discogs Personal Access Token.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Linking,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { setStoredToken, getStoredToken } from '../services';

const DISCOGS_TOKEN_URL = 'https://www.discogs.com/settings/developers';

interface AuthScreenProps {
  onAuthenticated: () => void;
}

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingStored, setCheckingStored] = useState(true);

  React.useEffect(() => {
    getStoredToken().then((stored) => {
      setCheckingStored(false);
      if (stored) {
        setToken(stored);
      }
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    const t = token.trim();
    if (!t) {
      setError('Enter your Discogs Personal Access Token');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await setStoredToken(t);
      onAuthenticated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save token');
    } finally {
      setLoading(false);
    }
  }, [token, onAuthenticated]);

  const handlePaste = useCallback(async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text?.trim()) {
        setToken(text.trim());
        setError(null);
      }
    } catch {
      setError('Could not paste from clipboard');
    }
  }, []);

  const handleOpenDiscogs = useCallback(() => {
    Linking.openURL(DISCOGS_TOKEN_URL);
  }, []);

  if (checkingStored) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#e94560" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Discogs Vinyl Sorter</Text>
        <Text style={styles.subtitle}>
          Enter your Discogs Personal Access Token to load your collection.
        </Text>
        <Text style={styles.hint}>
          You need a computer to create a token. Then paste it here or use the
          same token on both devices.
        </Text>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={handleOpenDiscogs}
          activeOpacity={0.7}
        >
          <Text style={styles.linkText}>Open Discogs to get token</Text>
        </TouchableOpacity>

        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, styles.inputFlex]}
            placeholder="Paste your token here"
            placeholderTextColor="#666"
            value={token}
            onChangeText={(v) => {
              setToken(v);
              setError(null);
            }}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
          <TouchableOpacity
            style={styles.pasteButton}
            onPress={handlePaste}
            disabled={loading}
          >
            <Text style={styles.pasteButtonText}>Paste</Text>
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Continue</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#eee',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#aaa',
    marginBottom: 8,
  },
  hint: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
  },
  linkButton: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#252542',
    borderRadius: 8,
  },
  linkText: {
    color: '#e94560',
    fontSize: 15,
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#252542',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#fff',
  },
  inputFlex: {
    flex: 1,
  },
  pasteButton: {
    backgroundColor: '#252542',
    borderRadius: 8,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  pasteButtonText: {
    color: '#e94560',
    fontSize: 15,
    fontWeight: '600',
  },
  error: {
    color: '#e94560',
    fontSize: 14,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#e94560',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
