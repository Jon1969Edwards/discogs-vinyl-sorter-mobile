import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { AppText } from './ui/AppText';
import { colors, radius, spacing } from '../theme';

export type CollectionHeaderProps = {
  lpCount: number;
  username: string;
  manualOrderActive: boolean;
  reorderMode: boolean;
  searchActive: boolean;
  onReorder: () => void;
  onSettings: () => void;
  onRefresh: () => void;
  onSignOut: () => void;
  onFinishReorder: () => void;
  onResetShelfOrder: () => void;
  onExportTxt: () => void;
  onExportCsv: () => void;
  onExportJson: () => void;
  exportDisabled?: boolean;
};

export function CollectionHeader({
  lpCount,
  username,
  manualOrderActive,
  reorderMode,
  searchActive,
  onReorder,
  onSettings,
  onRefresh,
  onSignOut,
  onFinishReorder,
  onResetShelfOrder,
  onExportTxt,
  onExportCsv,
  onExportJson,
  exportDisabled = false,
}: CollectionHeaderProps) {
  const [menuVisible, setMenuVisible] = useState(false);

  const closeMenu = () => setMenuVisible(false);

  const subtitleParts = [`${username}'s collection`];
  if (manualOrderActive) subtitleParts.push('custom order');

  return (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <View style={styles.titleBlock}>
          <AppText variant="title">{lpCount} LPs</AppText>
          <AppText variant="caption" style={styles.subtitle} numberOfLines={1}>
            {subtitleParts.join(' · ')}
          </AppText>
        </View>
        {reorderMode ? (
          <View style={styles.reorderActions}>
            <TouchableOpacity onPress={onFinishReorder} style={styles.actionBtn}>
              <AppText variant="accent" style={styles.actionTextPrimary}>
                Done
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity onPress={onResetShelfOrder} style={styles.actionBtn}>
              <AppText variant="bodySmall" style={styles.actionText}>
                Reset
              </AppText>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setMenuVisible(true)}
            accessibilityLabel="More actions"
          >
            <AppText style={styles.menuIcon}>⋮</AppText>
          </TouchableOpacity>
        )}
      </View>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <Pressable style={styles.menuBackdrop} onPress={closeMenu}>
          <View style={styles.menuSheet}>
            <TouchableOpacity
              style={[styles.menuItem, searchActive && styles.menuItemDisabled]}
              onPress={() => {
                if (!searchActive) {
                  closeMenu();
                  onReorder();
                }
              }}
              disabled={searchActive}
            >
              <AppText
                variant="body"
                style={[
                  styles.menuItemText,
                  searchActive && styles.menuItemTextDisabled,
                ]}
              >
                Reorder shelf
              </AppText>
              {searchActive ? (
                <AppText variant="caption" style={styles.menuItemHint}>
                  Clear search first
                </AppText>
              ) : null}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                closeMenu();
                onSettings();
              }}
            >
              <AppText variant="body" style={styles.menuItemText}>
                Settings
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                closeMenu();
                onRefresh();
              }}
            >
              <AppText variant="body" style={styles.menuItemText}>
                Refresh collection
              </AppText>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity
              style={[styles.menuItem, exportDisabled && styles.menuItemDisabled]}
              onPress={() => {
                if (!exportDisabled) {
                  closeMenu();
                  onExportTxt();
                }
              }}
              disabled={exportDisabled}
            >
              <AppText variant="body" style={styles.menuItemText}>
                Export TXT
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuItem, exportDisabled && styles.menuItemDisabled]}
              onPress={() => {
                if (!exportDisabled) {
                  closeMenu();
                  onExportCsv();
                }
              }}
              disabled={exportDisabled}
            >
              <AppText variant="body" style={styles.menuItemText}>
                Export CSV
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuItem, exportDisabled && styles.menuItemDisabled]}
              onPress={() => {
                if (!exportDisabled) {
                  closeMenu();
                  onExportJson();
                }
              }}
              disabled={exportDisabled}
            >
              <AppText variant="body" style={styles.menuItemText}>
                Export JSON
              </AppText>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                closeMenu();
                onSignOut();
              }}
            >
              <AppText variant="accent" style={styles.menuItemTextDanger}>
                Sign out
              </AppText>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: 48,
    paddingBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  titleBlock: {
    flex: 1,
    marginRight: spacing.md,
  },
  subtitle: {
    marginTop: 2,
    color: colors.textMuted,
  },
  menuButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: {
    fontSize: 28,
    color: colors.textSecondary,
    lineHeight: 32,
  },
  reorderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  actionBtn: {
    paddingVertical: spacing.xs,
    minHeight: 48,
    justifyContent: 'center',
  },
  actionText: {
    color: colors.textSecondary,
  },
  actionTextPrimary: {},
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 96,
    paddingRight: spacing.lg,
  },
  menuSheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    minWidth: 220,
    overflow: 'hidden',
  },
  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
  menuItemText: {
    color: colors.textPrimary,
  },
  menuItemTextDisabled: {
    color: colors.textMuted,
  },
  menuItemHint: {
    marginTop: spacing.xs,
  },
  menuItemTextDanger: {
    fontWeight: '600',
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.background,
  },
});
