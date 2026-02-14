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
} from 'react-native';
import { setStoredToken, getStoredToken } from '../services';

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
          Get a token at: Discogs → Settings → Developers → Personal Access Tokens
        </Text>

        <TextInput
          style={styles.input}
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
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#252542',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    marginBottom: 16,
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
