import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useSettings } from '../hooks/useSettings';
import type { DividerMode, SortBy } from '../types';
import { FORMAT_FILTERS } from '../domain/formatFilter';
import { clearAllAuth } from '../services';

const DIVIDER_OPTIONS: { id: DividerMode; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'letter', label: 'A–Z letters' },
  { id: 'abc', label: 'Shelf A/B/C' },
];

const SORT_OPTIONS: { id: SortBy; label: string }[] = [
  { id: 'artist', label: 'Artist' },
  { id: 'title', label: 'Title' },
  { id: 'year', label: 'Year' },
  { id: 'price_asc', label: 'Price (low first)' },
  { id: 'price_desc', label: 'Price (high first)' },
];

interface SettingsScreenProps {
  onSignOut: () => void;
  onSettingsChanged?: () => void;
}

export function SettingsScreen({
  onSignOut,
  onSettingsChanged,
}: SettingsScreenProps) {
  const { settings, loaded, update } = useSettings();

  const toggleFormat = useCallback(
    async (fmt: string) => {
      let formats = [...settings.formats];
      if (fmt === 'everything') {
        formats = formats.includes('everything') ? ['lp'] : ['everything'];
      } else {
        formats = formats.filter((f) => f !== 'everything');
        if (formats.includes(fmt)) {
          formats = formats.filter((f) => f !== fmt);
        } else {
          formats.push(fmt);
        }
        if (formats.length === 0) formats = ['lp'];
      }
      await update({ formats });
      onSettingsChanged?.();
    },
    [settings.formats, update, onSettingsChanged]
  );

  const handleSignOut = useCallback(async () => {
    await clearAllAuth();
    onSignOut();
  }, [onSignOut]);

  if (!loaded) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Loading settings…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Formats</Text>
      {FORMAT_FILTERS.map(([id, label]) => (
        <View key={id} style={styles.row}>
          <Text style={styles.label}>{label}</Text>
          <Switch
            value={
              id === 'everything'
                ? settings.formats.includes('everything')
                : settings.formats.includes(id)
            }
            onValueChange={() => toggleFormat(id)}
            trackColor={{ false: '#252542', true: '#e94560' }}
            thumbColor="#eee"
            ios_backgroundColor="#252542"
          />
        </View>
      ))}

      <Text style={styles.sectionTitle}>Export dividers</Text>
      <View style={styles.chipRow}>
        {DIVIDER_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.id}
            style={[
              styles.chip,
              settings.divider_mode === opt.id && styles.chipActive,
            ]}
            onPress={async () => {
              await update({ divider_mode: opt.id });
              onSettingsChanged?.();
            }}
          >
            <Text
              style={[
                styles.chipText,
                settings.divider_mode === opt.id && styles.chipTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Sort by</Text>
      <View style={styles.chipRow}>
        {SORT_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.id}
            style={[
              styles.chip,
              settings.sort_by === opt.id && styles.chipActive,
            ]}
            onPress={async () => {
              await update({ sort_by: opt.id });
              onSettingsChanged?.();
            }}
          >
            <Text
              style={[
                styles.chipText,
                settings.sort_by === opt.id && styles.chipTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Show prices in list</Text>
        <Switch
          value={settings.show_prices}
          onValueChange={(v) => update({ show_prices: v })}
          trackColor={{ false: '#444', true: '#e94560' }}
        />
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Include JSON in exports</Text>
        <Switch
          value={settings.write_json}
          onValueChange={(v) => update({ write_json: v })}
          trackColor={{ false: '#444', true: '#e94560' }}
        />
      </View>

      <Text style={styles.sectionTitle}>Poll interval (seconds)</Text>
      <TextInput
        style={styles.input}
        keyboardType="number-pad"
        value={String(settings.poll_seconds)}
        onChangeText={(t) => {
          const n = parseInt(t, 10);
          if (!Number.isNaN(n) && n >= 60) update({ poll_seconds: n });
        }}
      />

      <Text style={styles.sectionTitle}>Currency</Text>
      <TextInput
        style={styles.input}
        autoCapitalize="characters"
        maxLength={3}
        value={settings.currency}
        onChangeText={(t) => update({ currency: t.toUpperCase().slice(0, 3) })}
      />

      <Text style={styles.sectionTitle}>User-Agent (advanced)</Text>
      <TextInput
        style={[styles.input, styles.inputMulti]}
        multiline
        value={settings.user_agent}
        onChangeText={(t) => update({ user_agent: t })}
      />

      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  content: { padding: 16, paddingTop: 48, paddingBottom: 32 },
  center: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#eee',
    marginTop: 20,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  label: { color: '#ccc', fontSize: 15, flex: 1 },
  muted: { color: '#666' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    backgroundColor: '#252542',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  chipActive: { backgroundColor: '#e94560' },
  chipText: { color: '#aaa', fontSize: 13 },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  input: {
    backgroundColor: '#252542',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    marginBottom: 8,
  },
  inputMulti: { minHeight: 60 },
  signOutBtn: {
    marginTop: 32,
    backgroundColor: '#e94560',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  signOutText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
