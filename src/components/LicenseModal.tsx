/**
 * Pro license activation sheet (parity with Windows license_dialog).
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { AppText } from './ui/AppText';
import { Button } from './ui/Button';
import { colors, radius, spacing } from '../theme';
import {
  APP_NAME,
  PRO_BENEFITS,
  PURCHASE_URL,
  purchaseStoreReady,
} from '../constants/version';
import { useLicense } from '../context/LicenseContext';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function LicenseModal({ visible, onClose }: Props) {
  const { isPro, summary, activate, deactivate } = useLicense();
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleActivate = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await activate(key);
      if (result.ok) {
        setKey('');
        Alert.alert(
          'Pro unlocked',
          'Pro is active. Unlimited collection, prices, and other Pro tools are available.'
        );
        onClose();
      } else {
        setError(result.message);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDeactivate = () => {
    Alert.alert(
      'Deactivate Pro',
      'Remove Pro from this device? Free limits will apply again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              await deactivate();
              onClose();
            })();
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <AppText variant="title">Pro license</AppText>
          <AppText variant="caption" style={styles.status}>
            Status: {summary}
          </AppText>

          <AppText variant="bodySmall" style={styles.included}>
            Included with Pro:
          </AppText>
          {PRO_BENEFITS.map((line) => (
            <AppText key={line} variant="caption" style={styles.bullet}>
              • {line}
            </AppText>
          ))}

          {isPro ? (
            <View style={styles.row}>
              <Button title="Deactivate" onPress={handleDeactivate} style={styles.flexBtn} />
              <Button title="Close" onPress={onClose} style={styles.flexBtn} />
            </View>
          ) : (
            <>
              <AppText variant="bodySmall" style={styles.hint}>
                Already have a key? Paste it below. Long keys scroll — the
                visible end is normal. It should start with VSS1-.
              </AppText>
              <TextInput
                style={[styles.input, styles.inputMulti]}
                value={key}
                onChangeText={(t) => {
                  setKey(t);
                  setError(null);
                }}
                placeholder="VSS1-…"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                multiline
                importantForAutofill="no"
              />
              {error ? (
                <AppText variant="caption" style={styles.error}>
                  {error}
                </AppText>
              ) : null}
              <View style={styles.row}>
                <Button
                  title="Paste"
                  variant="secondary"
                  onPress={() => {
                    void (async () => {
                      try {
                        const Clipboard = await import('expo-clipboard');
                        const text = (await Clipboard.getStringAsync())?.trim();
                        if (text) {
                          setKey(text);
                          setError(null);
                        }
                      } catch {
                        setError('Could not read clipboard');
                      }
                    })();
                  }}
                  style={styles.flexBtn}
                />
                <Button
                  title="Activate"
                  onPress={() => void handleActivate()}
                  loading={busy}
                  disabled={!key.trim() || busy}
                  style={styles.flexBtn}
                />
              </View>
              {purchaseStoreReady() ? (
                <Button
                  title="Buy Pro"
                  onPress={() => void Linking.openURL(PURCHASE_URL)}
                  style={{ marginTop: spacing.sm }}
                />
              ) : null}
              {!purchaseStoreReady() ? (
                <AppText variant="caption" style={styles.soon}>
                  Purchase coming soon — paste a beta key if you have one.
                </AppText>
              ) : null}
              <TouchableOpacity onPress={onClose} style={styles.close}>
                <AppText variant="accent">Close</AppText>
              </TouchableOpacity>
            </>
          )}

          <AppText variant="caption" style={styles.brand}>
            {APP_NAME}
          </AppText>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  status: { marginTop: spacing.sm, marginBottom: spacing.md },
  included: { fontWeight: '600', marginBottom: spacing.xs },
  bullet: { marginBottom: 2 },
  hint: { marginTop: spacing.lg, marginBottom: spacing.sm },
  input: {
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    padding: spacing.md,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  inputMulti: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  error: { color: colors.error, marginBottom: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  flexBtn: { flex: 1 },
  soon: { marginTop: spacing.md, textAlign: 'center' },
  close: { marginTop: spacing.lg, alignItems: 'center', padding: spacing.sm },
  brand: { marginTop: spacing.md, textAlign: 'center' },
});
