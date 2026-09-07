/**
 * Soft Pro upsell modal.
 */

import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  Linking,
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
import { upgradeMessage } from '../services/featureGate';

type Props = {
  visible: boolean;
  feature: string;
  onClose: () => void;
  onOpenLicense: () => void;
};

export function ProUpgradeModal({
  visible,
  feature,
  onClose,
  onOpenLicense,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <AppText variant="title" style={styles.title}>
            {APP_NAME} Pro
          </AppText>
          <AppText variant="body" style={styles.body}>
            {upgradeMessage(feature)}
          </AppText>
          <AppText variant="caption" style={styles.caption}>
            Included with Pro:
          </AppText>
          {PRO_BENEFITS.map((line) => (
            <AppText key={line} variant="caption" style={styles.bullet}>
              • {line}
            </AppText>
          ))}
          <Button
            title="Enter license key"
            onPress={() => {
              onClose();
              onOpenLicense();
            }}
            style={styles.btn}
          />
          {purchaseStoreReady() ? (
            <Button
              title="Buy Pro"
              onPress={() => void Linking.openURL(PURCHASE_URL)}
              style={styles.btn}
            />
          ) : (
            <AppText variant="caption" style={styles.soon}>
              Purchase coming soon
            </AppText>
          )}
          <TouchableOpacity onPress={onClose} style={styles.close}>
            <AppText variant="accent">Not now</AppText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.xl,
  },
  title: { marginBottom: spacing.sm },
  body: { marginBottom: spacing.md },
  caption: { marginBottom: spacing.xs, fontWeight: '600' },
  bullet: { marginBottom: 2 },
  btn: { marginTop: spacing.md, alignSelf: 'stretch' },
  soon: { marginTop: spacing.md, textAlign: 'center' },
  close: { marginTop: spacing.lg, alignItems: 'center', padding: spacing.sm },
});
