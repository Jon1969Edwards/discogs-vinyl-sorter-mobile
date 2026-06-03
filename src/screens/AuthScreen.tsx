/**
 * Auth screen – OAuth sign-in or Personal Access Token.
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
import {
  setStoredToken,
  setOAuthCredentials,
  createAuthenticatedClient,
  getIdentity,
  isOAuthConfigured,
  runOAuthFlow,
} from '../services';

const DISCOGS_TOKEN_URL = 'https://www.discogs.com/settings/developers';

interface AuthScreenProps {
  onAuthenticated: () => void;
}

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPat, setShowPat] = useState(false);
  const oauthAvailable = isOAuthConfigured();

  const handleOAuth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { accessToken, accessSecret } = await runOAuthFlow();
      await setOAuthCredentials(accessToken, accessSecret);
      const client = createAuthenticatedClient({
        mode: 'oauth',
        oauthToken: accessToken,
        oauthSecret: accessSecret,
      });
      await getIdentity(client);
      onAuthenticated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OAuth sign-in failed');
    } finally {
      setLoading(false);
    }
  }, [onAuthenticated]);

  const handleSubmitPat = useCallback(async () => {
    const t = token.trim();
    if (!t) {
      setError('Enter your Discogs Personal Access Token');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const client = createAuthenticatedClient({ mode: 'pat', pat: t });
      await getIdentity(client);
      await setStoredToken(t);
      onAuthenticated();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Invalid token — could not verify with Discogs'
      );
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Discogs Vinyl Sorter</Text>
        <Text style={styles.subtitle}>
          Sign in to load and sort your Discogs collection.
        </Text>

        {oauthAvailable ? (
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleOAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign in with Discogs</Text>
            )}
          </TouchableOpacity>
        ) : (
          <Text style={styles.hint}>
            OAuth is not configured in this build. Use a Personal Access Token
            below, or add DISCOGS_CONSUMER_KEY / DISCOGS_CONSUMER_SECRET to .env.
          </Text>
        )}

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => setShowPat((v) => !v)}
        >
          <Text style={styles.linkText}>
            {showPat ? 'Hide token entry' : 'Advanced: use Personal Access Token'}
          </Text>
        </TouchableOpacity>

        {showPat ? (
          <>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => Linking.openURL(DISCOGS_TOKEN_URL)}
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

            <TouchableOpacity
              style={[styles.buttonSecondary, loading && styles.buttonDisabled]}
              onPress={handleSubmitPat}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Continue with token</Text>
            </TouchableOpacity>
          </>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}
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
  content: { padding: 24 },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#eee',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#aaa',
    marginBottom: 24,
  },
  hint: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
  },
  linkButton: {
    marginTop: 12,
    marginBottom: 8,
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
    marginTop: 8,
  },
  input: {
    backgroundColor: '#252542',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#fff',
  },
  inputFlex: { flex: 1 },
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
    marginTop: 16,
  },
  button: {
    backgroundColor: '#e94560',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: '#252542',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
