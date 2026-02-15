/**
 * Auth screen – Sign in with Discogs (OAuth) or enter Personal Access Token.
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
  ScrollView,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {
  DISCOGS_CONSUMER_KEY,
  DISCOGS_CONSUMER_SECRET,
} from '@env';
import {
  setStoredCredentials,
  setStoredToken,
  getStoredCredentials,
} from '../services';
import { runDiscogsOAuthFlow } from '../services/oauthDiscogs';

const DISCOGS_TOKEN_URL = 'https://www.discogs.com/settings/developers';

interface AuthScreenProps {
  onAuthenticated: () => void;
}

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingStored, setCheckingStored] = useState(true);
  const [showManualEntry, setShowManualEntry] = useState(false);

  React.useEffect(() => {
    getStoredCredentials().then((cred) => {
      setCheckingStored(false);
      if (cred?.type === 'pat') {
        setToken(cred.token);
      }
    });
  }, []);

  const handleOAuthSignIn = useCallback(async () => {
    if (!DISCOGS_CONSUMER_KEY?.trim() || !DISCOGS_CONSUMER_SECRET?.trim()) {
      setError(
        'OAuth not configured. Add DISCOGS_CONSUMER_KEY and DISCOGS_CONSUMER_SECRET to your .env file. Create an app at Discogs → Settings → Developers.'
      );
      return;
    }

    setOauthLoading(true);
    setError(null);

    try {
      const tokens = await runDiscogsOAuthFlow(
        DISCOGS_CONSUMER_KEY.trim(),
        DISCOGS_CONSUMER_SECRET.trim()
      );
      await setStoredCredentials({
        type: 'oauth',
        token: tokens.token,
        secret: tokens.secret,
      });
      onAuthenticated();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'OAuth failed';
      if (msg.toLowerCase().includes('cancelled')) {
        setError('Sign-in was cancelled.');
      } else {
        setError(msg);
      }
    } finally {
      setOauthLoading(false);
    }
  }, [onAuthenticated]);

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

  const isOauthLoading = oauthLoading;
  const isSubmitLoading = loading;
  const anyLoading = isOauthLoading || isSubmitLoading;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Text style={styles.title}>Discogs Vinyl Sorter</Text>
          <Text style={styles.subtitle}>
            Sign in with Discogs to load your collection.
          </Text>

          {!showManualEntry ? (
            <>
              <TouchableOpacity
                style={[styles.oauthButton, anyLoading && styles.buttonDisabled]}
                onPress={handleOAuthSignIn}
                disabled={anyLoading}
                activeOpacity={0.7}
              >
                {isOauthLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.oauthButtonText}>Sign in with Discogs</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => setShowManualEntry(true)}
                disabled={anyLoading}
              >
                <Text style={styles.linkText}>
                  Or enter a Personal Access Token
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.hint}>
                Paste a token from Discogs (Settings → Developers → Generate
                token).
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
                  editable={!anyLoading}
                />
                <TouchableOpacity
                  style={styles.pasteButton}
                  onPress={handlePaste}
                  disabled={anyLoading}
                >
                  <Text style={styles.pasteButtonText}>Paste</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.button, anyLoading && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={anyLoading}
              >
                {isSubmitLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Continue</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backLink}
                onPress={() => setShowManualEntry(false)}
                disabled={anyLoading}
              >
                <Text style={styles.linkText}>← Back to Sign in with Discogs</Text>
              </TouchableOpacity>
            </>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 24,
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
    marginBottom: 24,
  },
  hint: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
  },
  oauthButton: {
    backgroundColor: '#e94560',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  oauthButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: 'transparent',
  },
  backLink: {
    marginTop: 16,
    padding: 12,
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
    marginTop: 16,
  },
  button: {
    backgroundColor: '#252542',
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
