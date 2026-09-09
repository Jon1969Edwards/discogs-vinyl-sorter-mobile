/**
 * Correct an album's filing genre (parity with Windows Edit genre dialog).
 */

import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { AppText } from './ui/AppText';
import { colors, radius, spacing } from '../theme';

type Props = {
  visible: boolean;
  albumLabel: string;
  current: string;
  hasOverride: boolean;
  onSave: (text: string) => void;
  onReset: () => void;
  onClose: () => void;
};

export function GenreEditModal({
  visible,
  albumLabel,
  current,
  hasOverride,
  onSave,
  onReset,
  onClose,
}: Props) {
  const [text, setText] = useState(current);

  useEffect(() => {
    if (visible) setText(current);
  }, [visible, current]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <AppText variant="title" style={styles.title}>
            Edit genre
          </AppText>
          <AppText variant="body" style={styles.album}>
            {albumLabel}
          </AppText>
          <AppText variant="caption" style={styles.hint}>
            Shelf filing uses the first genre. Extra genres: Jazz; Rock
          </AppText>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            autoFocus
            autoCapitalize="words"
            placeholder="Genre"
            placeholderTextColor={colors.textMuted}
          />
          <View style={styles.actions}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={onClose}>
              <AppText style={styles.secondaryText}>Cancel</AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => onSave(text.trim())}
            >
              <AppText style={styles.primaryText}>Save</AppText>
            </TouchableOpacity>
          </View>
          {hasOverride ? (
            <TouchableOpacity style={styles.resetBtn} onPress={onReset}>
              <AppText style={styles.resetText}>Reset to original</AppText>
            </TouchableOpacity>
          ) : null}
        </View>
      </KeyboardAvoidingView>
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
  title: {
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  album: {
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  hint: {
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    color: colors.textPrimary,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 16,
    minHeight: 48,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  primaryBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minHeight: 48,
    justifyContent: 'center',
  },
  primaryText: {
    color: colors.white,
    fontWeight: '600',
  },
  secondaryBtn: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minHeight: 48,
    justifyContent: 'center',
  },
  secondaryText: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  resetBtn: {
    marginTop: spacing.md,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  resetText: {
    color: colors.accent,
  },
});
