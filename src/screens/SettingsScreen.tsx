/**
 * Settings screen – sort options, dividers, LP strict.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import type { CollectionSettings } from '../types/settings';
import type { SortBy, VariousPolicy } from '../utils/sorting';
import { useSettingsContext } from '../contexts/SettingsContext';

type SettingsScreenProps = {
  navigation: { goBack: () => void };
};

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'artist', label: 'Artist' },
  { value: 'title', label: 'Title' },
  { value: 'year', label: 'Year' },
];

const VARIOUS_OPTIONS: { value: VariousPolicy; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'last', label: 'At end' },
  { value: 'title', label: 'By title' },
];

function OptionRow({
  label,
  value,
  options,
  onSelect,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onSelect: (value: string) => void;
}) {
  return (
    <View style={styles.optionRow}>
      <Text style={styles.optionLabel}>{label}</Text>
      <View style={styles.optionChips}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.chip,
              value === opt.value && styles.chipSelected,
            ]}
            onPress={() => onSelect(opt.value)}
          >
            <Text
              style={[
                styles.chipText,
                value === opt.value && styles.chipTextSelected,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function ToggleRow({
  label,
  subtitle,
  value,
  onToggle,
}: {
  label: string;
  subtitle?: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity style={styles.toggleRow} onPress={onToggle} activeOpacity={0.7}>
      <View style={styles.toggleLabelWrap}>
        <Text style={styles.optionLabel}>{label}</Text>
        {subtitle ? (
          <Text style={styles.toggleSubtitle}>{subtitle}</Text>
        ) : null}
      </View>
      <View style={[styles.toggle, value && styles.toggleOn]}>
        <View style={[styles.toggleThumb, value && styles.toggleThumbOn]} />
      </View>
    </TouchableOpacity>
  );
}

export function SettingsScreen({ navigation }: SettingsScreenProps) {
  const { settings, updateSettings } = useSettingsContext();
  if (!settings) {
    return (
      <View style={styles.wrapper}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#e94560" />
        </View>
      </View>
    );
  }
  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.content}>
        <Text style={styles.title}>Settings</Text>

        <OptionRow
          label="Sort by"
          value={settings.sortBy}
          options={SORT_OPTIONS}
          onSelect={(v) => updateSettings({ sortBy: v as SortBy })}
        />

        <OptionRow
          label="Various Artists"
          value={settings.variousPolicy}
          options={VARIOUS_OPTIONS}
          onSelect={(v) => updateSettings({ variousPolicy: v as VariousPolicy })}
        />

        <ToggleRow
          label="Letter dividers"
          subtitle="Show A, B, C sections in the list"
          value={settings.showDividers}
          onToggle={() => updateSettings({ showDividers: !settings.showDividers })}
        />

        <ToggleRow
          label="LP strict"
          subtitle="Exclude 12″ singles; only LP/Album formats"
          value={settings.lpStrict}
          onToggle={() => updateSettings({ lpStrict: !settings.lpStrict })}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
  },
  backButton: {
    paddingVertical: 8,
    paddingRight: 16,
  },
  backButtonText: {
    color: '#e94560',
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#eee',
    marginBottom: 24,
  },
  optionRow: {
    marginBottom: 20,
  },
  optionLabel: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 8,
  },
  optionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#252542',
  },
  chipSelected: {
    backgroundColor: '#e94560',
  },
  chipText: {
    color: '#aaa',
    fontSize: 14,
  },
  chipTextSelected: {
    color: '#fff',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#252542',
  },
  toggleLabelWrap: {
    flex: 1,
  },
  toggleSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#252542',
    padding: 2,
    flexDirection: 'row',
  },
  toggleOn: {
    backgroundColor: '#e94560',
    justifyContent: 'flex-end',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#666',
  },
  toggleThumbOn: {
    backgroundColor: '#fff',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
