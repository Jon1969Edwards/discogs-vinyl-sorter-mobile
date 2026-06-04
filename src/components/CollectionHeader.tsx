import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';

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
}: CollectionHeaderProps) {
  const [menuVisible, setMenuVisible] = useState(false);

  const closeMenu = () => setMenuVisible(false);

  const subtitleParts = [`${username}'s collection`];
  if (manualOrderActive) subtitleParts.push('custom order');

  return (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{lpCount} LPs</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitleParts.join(' · ')}
          </Text>
        </View>
        {reorderMode ? (
          <View style={styles.reorderActions}>
            <TouchableOpacity onPress={onFinishReorder} style={styles.actionBtn}>
              <Text style={styles.actionTextPrimary}>Done</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onResetShelfOrder} style={styles.actionBtn}>
              <Text style={styles.actionText}>Reset</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setMenuVisible(true)}
            accessibilityLabel="More actions"
          >
            <Text style={styles.menuIcon}>⋮</Text>
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
              <Text
                style={[
                  styles.menuItemText,
                  searchActive && styles.menuItemTextDisabled,
                ]}
              >
                Reorder shelf
              </Text>
              {searchActive ? (
                <Text style={styles.menuItemHint}>Clear search first</Text>
              ) : null}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                closeMenu();
                onSettings();
              }}
            >
              <Text style={styles.menuItemText}>Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                closeMenu();
                onRefresh();
              }}
            >
              <Text style={styles.menuItemText}>Refresh collection</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                closeMenu();
                onSignOut();
              }}
            >
              <Text style={styles.menuItemTextDanger}>Sign out</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  titleBlock: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#eee',
  },
  subtitle: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  menuButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  menuIcon: {
    fontSize: 28,
    color: '#aaa',
    lineHeight: 32,
  },
  reorderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionBtn: {
    paddingVertical: 4,
  },
  actionText: {
    color: '#aaa',
    fontSize: 15,
    fontWeight: '600',
  },
  actionTextPrimary: {
    color: '#e94560',
    fontSize: 15,
    fontWeight: '600',
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 96,
    paddingRight: 16,
  },
  menuSheet: {
    backgroundColor: '#252542',
    borderRadius: 12,
    minWidth: 220,
    overflow: 'hidden',
  },
  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
  menuItemText: {
    color: '#eee',
    fontSize: 16,
  },
  menuItemTextDisabled: {
    color: '#888',
  },
  menuItemHint: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  menuItemTextDanger: {
    color: '#e94560',
    fontSize: 16,
    fontWeight: '600',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#1a1a2e',
  },
});
