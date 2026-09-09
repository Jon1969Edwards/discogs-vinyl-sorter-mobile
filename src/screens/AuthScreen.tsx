/**
 * Auth screen – Discogs OAuth/PAT, or import a CSV/JSON collection.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Linking,
  ScrollView,
  Image,
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
import {
  applyImportedCollection,
  pickAndImportCollection,
} from '../services/importCollection';
import {
  createLocalAccount,
  hasLocalAccount,
  signInLocalAccount,
} from '../services/localAccount';
import { runOAuthFlow } from '../services/oauthDiscogs';
import { Screen } from '../components/ui/Screen';
import { AppText } from '../components/ui/AppText';
import { Button } from '../components/ui/Button';
import { colors, radius, spacing } from '../theme';
import { APP_NAME, DISCOGS_DISCLAIMER } from '../constants/version';

const DISCOGS_TOKEN_URL = 'https://www.discogs.com/settings/developers';

const logoMark = require('../../assets/logo-mark.png');

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
  const [showPasteImport, setShowPasteImport] = useState(false);
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [showLocalLogin, setShowLocalLogin] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [localName, setLocalName] = useState('');
  const [localEmail, setLocalEmail] = useState('');
  const [localPassword, setLocalPassword] = useState('');
  const [localConfirm, setLocalConfirm] = useState('');
  const [hasDeviceAccount, setHasDeviceAccount] = useState(false);

  React.useEffect(() => {
    Promise.all([getStoredCredentials(), hasLocalAccount()]).then(
      ([cred, exists]) => {
        setCheckingStored(false);
        setHasDeviceAccount(exists);
        if (cred?.type === 'pat') {
          setToken(cred.token);
        }
      }
    );
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
      const tokens = await runOAuthFlow();
      await setStoredCredentials({
        type: 'oauth',
        token: tokens.accessToken,
        secret: tokens.accessSecret,
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

  const handleImportFile = useCallback(async () => {
    setImportLoading(true);
    setError(null);
    try {
      const count = await pickAndImportCollection();
      if (count == null) return;
      onAuthenticated();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Could not import that file';
      setError(
        msg.includes('ExpoDocumentPicker') || msg.includes('native module')
          ? 'File picker needs a rebuilt app. Paste CSV or JSON below instead.'
          : msg
      );
      setShowPasteImport(true);
    } finally {
      setImportLoading(false);
    }
  }, [onAuthenticated]);

  const handlePasteImport = useCallback(async () => {
    const text = pasteText.trim();
    if (!text) {
      setError('Paste a CSV or JSON collection first.');
      return;
    }
    setImportLoading(true);
    setError(null);
    try {
      const looksJson = text.startsWith('{') || text.startsWith('[');
      await applyImportedCollection(
        text,
        looksJson ? 'pasted.json' : 'pasted.csv'
      );
      onAuthenticated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not import that text');
    } finally {
      setImportLoading(false);
    }
  }, [pasteText, onAuthenticated]);

  const handleCreateAccount = useCallback(async () => {
    setImportLoading(true);
    setError(null);
    try {
      await createLocalAccount({
        name: localName,
        email: localEmail,
        password: localPassword,
        confirm: localConfirm,
      });
      onAuthenticated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create account');
    } finally {
      setImportLoading(false);
    }
  }, [localName, localEmail, localPassword, localConfirm, onAuthenticated]);

  const handleLocalSignIn = useCallback(async () => {
    setImportLoading(true);
    setError(null);
    try {
      await signInLocalAccount(localEmail, localPassword);
      onAuthenticated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in');
    } finally {
      setImportLoading(false);
    }
  }, [localEmail, localPassword, onAuthenticated]);

  if (checkingStored) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </Screen>
    );
  }

  const anyLoading = oauthLoading || loading || importLoading;

  return (
    <Screen edges={[]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <Image source={logoMark} style={styles.logo} accessibilityLabel="App logo" />
            <AppText variant="titleLarge" style={styles.title}>
              {APP_NAME}
            </AppText>
            <AppText variant="body" style={styles.subtitle}>
              Create a Spindle account on this phone, sign in with Discogs, or
              import a collection.
            </AppText>

            {showCreateAccount ? (
              <>
                <AppText variant="caption" style={styles.hint}>
                  Stored only on this device. This is not a Discogs account and
                  does not sync to a server.
                </AppText>
                <TextInput
                  style={[styles.input, styles.accountInput]}
                  placeholder="Name"
                  placeholderTextColor={colors.textMuted}
                  value={localName}
                  onChangeText={setLocalName}
                  autoCapitalize="words"
                  editable={!anyLoading}
                />
                <TextInput
                  style={[styles.input, styles.accountInput]}
                  placeholder="Email"
                  placeholderTextColor={colors.textMuted}
                  value={localEmail}
                  onChangeText={setLocalEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!anyLoading}
                />
                <TextInput
                  style={[styles.input, styles.accountInput]}
                  placeholder="Password (at least 6 characters)"
                  placeholderTextColor={colors.textMuted}
                  value={localPassword}
                  onChangeText={setLocalPassword}
                  secureTextEntry
                  editable={!anyLoading}
                />
                <TextInput
                  style={[styles.input, styles.accountInput]}
                  placeholder="Confirm password"
                  placeholderTextColor={colors.textMuted}
                  value={localConfirm}
                  onChangeText={setLocalConfirm}
                  secureTextEntry
                  editable={!anyLoading}
                />
                <Button
                  title="Create account"
                  onPress={() => void handleCreateAccount()}
                  loading={importLoading}
                  disabled={anyLoading}
                  style={styles.importBtn}
                />
                <TouchableOpacity
                  style={styles.backLink}
                  onPress={() => setShowCreateAccount(false)}
                  disabled={anyLoading}
                >
                  <AppText variant="accent" style={styles.linkText}>
                    ← Back
                  </AppText>
                </TouchableOpacity>
              </>
            ) : showLocalLogin ? (
              <>
                <AppText variant="caption" style={styles.hint}>
                  Sign in with the email and password you created on this phone.
                </AppText>
                <TextInput
                  style={[styles.input, styles.accountInput]}
                  placeholder="Email"
                  placeholderTextColor={colors.textMuted}
                  value={localEmail}
                  onChangeText={setLocalEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!anyLoading}
                />
                <TextInput
                  style={[styles.input, styles.accountInput]}
                  placeholder="Password"
                  placeholderTextColor={colors.textMuted}
                  value={localPassword}
                  onChangeText={setLocalPassword}
                  secureTextEntry
                  editable={!anyLoading}
                />
                <Button
                  title="Sign in"
                  onPress={() => void handleLocalSignIn()}
                  loading={importLoading}
                  disabled={anyLoading}
                  style={styles.importBtn}
                />
                <TouchableOpacity
                  style={styles.backLink}
                  onPress={() => setShowLocalLogin(false)}
                  disabled={anyLoading}
                >
                  <AppText variant="accent" style={styles.linkText}>
                    ← Back
                  </AppText>
                </TouchableOpacity>
              </>
            ) : showPasteImport ? (
              <>
                <AppText variant="caption" style={styles.hint}>
                  Paste a Spindle CSV/JSON export, or a spreadsheet with Artist
                  and/or Title columns.
                </AppText>
                <TextInput
                  style={[styles.input, styles.pasteArea]}
                  placeholder={'Artist,Title\nThe Beatles,Abbey Road'}
                  placeholderTextColor={colors.textMuted}
                  value={pasteText}
                  onChangeText={(v) => {
                    setPasteText(v);
                    setError(null);
                  }}
                  multiline
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!anyLoading}
                />
                <Button
                  title="Import pasted collection"
                  variant="secondary"
                  onPress={() => void handlePasteImport()}
                  loading={importLoading}
                  disabled={anyLoading}
                />
                <TouchableOpacity
                  style={styles.backLink}
                  onPress={() => setShowPasteImport(false)}
                  disabled={anyLoading}
                >
                  <AppText variant="accent" style={styles.linkText}>
                    ← Back
                  </AppText>
                </TouchableOpacity>
              </>
            ) : !showManualEntry ? (
              <>
                <Button
                  title="Sign in with Discogs"
                  onPress={handleOAuthSignIn}
                  loading={oauthLoading}
                  disabled={anyLoading}
                  style={styles.primaryBtn}
                />

                <Button
                  title="Create an account"
                  variant="secondary"
                  onPress={() => {
                    setShowCreateAccount(true);
                    setError(null);
                  }}
                  disabled={anyLoading}
                  style={styles.importBtn}
                />
                {hasDeviceAccount ? (
                  <TouchableOpacity
                    style={styles.linkButton}
                    onPress={() => {
                      setShowLocalLogin(true);
                      setError(null);
                    }}
                    disabled={anyLoading}
                  >
                    <AppText variant="accent" style={styles.linkText}>
                      Sign in to your Spindle account
                    </AppText>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={() => setShowManualEntry(true)}
                  disabled={anyLoading}
                >
                  <AppText variant="accent" style={styles.linkText}>
                    Or enter a Personal Access Token
                  </AppText>
                </TouchableOpacity>

                <Button
                  title="Import CSV or JSON"
                  variant="secondary"
                  onPress={() => void handleImportFile()}
                  loading={importLoading && !showPasteImport}
                  disabled={anyLoading}
                  style={styles.importBtn}
                />

                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={() => {
                    setShowPasteImport(true);
                    setError(null);
                  }}
                  disabled={anyLoading}
                >
                  <AppText variant="accent" style={styles.linkText}>
                    Or paste CSV / JSON
                  </AppText>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <AppText variant="caption" style={styles.hint}>
                  Paste a token from Discogs (Settings → Developers → Generate
                  token).
                </AppText>

                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={handleOpenDiscogs}
                  activeOpacity={0.7}
                >
                  <AppText variant="accent" style={styles.linkText}>
                    Open Discogs to get token
                  </AppText>
                </TouchableOpacity>

                <View style={styles.inputRow}>
                  <TextInput
                    style={[styles.input, styles.inputFlex]}
                    placeholder="Paste your token here"
                    placeholderTextColor={colors.textMuted}
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
                    <AppText variant="accent">Paste</AppText>
                  </TouchableOpacity>
                </View>

                <Button
                  title="Continue"
                  variant="secondary"
                  onPress={handleSubmit}
                  loading={loading}
                  disabled={anyLoading}
                />

                <TouchableOpacity
                  style={styles.backLink}
                  onPress={() => setShowManualEntry(false)}
                  disabled={anyLoading}
                >
                  <AppText variant="accent" style={styles.linkText}>
                    ← Back to Sign in with Discogs
                  </AppText>
                </TouchableOpacity>
              </>
            )}

            {error ? (
              <View style={styles.errorCard}>
                <AppText variant="bodySmall" style={styles.errorText}>
                  {error}
                </AppText>
              </View>
            ) : null}

            <AppText variant="caption" style={styles.disclaimer}>
              {DISCOGS_DISCLAIMER}
            </AppText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, justifyContent: 'center' },
  center: { justifyContent: 'center', alignItems: 'center' },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  content: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  logo: {
    width: 96,
    height: 96,
    marginBottom: spacing.lg,
    borderRadius: radius.lg,
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  hint: {
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  primaryBtn: {
    alignSelf: 'stretch',
    marginBottom: spacing.lg,
  },
  importBtn: {
    alignSelf: 'stretch',
    marginBottom: spacing.sm,
  },
  accountInput: {
    alignSelf: 'stretch',
    marginBottom: spacing.sm,
  },
  pasteArea: {
    alignSelf: 'stretch',
    minHeight: 160,
    textAlignVertical: 'top',
    marginBottom: spacing.lg,
  },
  linkButton: {
    marginBottom: spacing.lg,
    padding: spacing.md,
  },
  backLink: {
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  linkText: {
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    alignSelf: 'stretch',
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.lg,
    fontSize: 16,
    color: colors.textPrimary,
  },
  inputFlex: {
    flex: 1,
  },
  pasteButton: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    minHeight: 48,
  },
  errorCard: {
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.lg,
    marginTop: spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  errorText: {
    color: colors.textPrimary,
  },
  disclaimer: {
    marginTop: spacing.xl,
    textAlign: 'center',
  },
});
