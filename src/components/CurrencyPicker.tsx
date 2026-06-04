import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  DISCOGS_CURRENCY_OPTIONS,
  type DiscogsCurrency,
} from '../types';

interface CurrencyPickerProps {
  value: DiscogsCurrency;
  onChange: (currency: DiscogsCurrency) => void;
}

export function CurrencyPicker({ value, onChange }: CurrencyPickerProps) {
  const [open, setOpen] = useState(false);
  const selectedLabel = useMemo(
    () =>
      DISCOGS_CURRENCY_OPTIONS.find((o) => o.code === value)?.label ?? value,
    [value]
  );

  const close = () => setOpen(false);

  return (
    <>
      <TouchableOpacity
        style={styles.select}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Currency, ${value}`}
      >
        <View style={styles.selectTextBlock}>
          <Text style={styles.selectCode}>{value}</Text>
          <Text style={styles.selectLabel}>{selectedLabel}</Text>
        </View>
        <Text style={styles.chevron}>▾</Text>
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <Pressable style={styles.backdrop} onPress={close}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Currency</Text>
            {DISCOGS_CURRENCY_OPTIONS.map((opt) => {
              const active = opt.code === value;
              return (
                <TouchableOpacity
                  key={opt.code}
                  style={[styles.option, active && styles.optionActive]}
                  onPress={() => {
                    onChange(opt.code);
                    close();
                  }}
                >
                  <Text
                    style={[styles.optionCode, active && styles.optionTextActive]}
                  >
                    {opt.code}
                  </Text>
                  <Text
                    style={[styles.optionLabel, active && styles.optionTextActive]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  select: {
    backgroundColor: '#252542',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectTextBlock: { flex: 1 },
  selectCode: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  selectLabel: {
    color: '#888',
    fontSize: 13,
    marginTop: 2,
  },
  chevron: {
    color: '#aaa',
    fontSize: 18,
    marginLeft: 8,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    backgroundColor: '#252542',
    borderRadius: 12,
    paddingVertical: 8,
    maxHeight: '80%',
  },
  sheetTitle: {
    color: '#eee',
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#3a3a5c',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  optionActive: { backgroundColor: 'rgba(233, 69, 96, 0.15)' },
  optionCode: {
    color: '#ccc',
    fontSize: 15,
    fontWeight: '700',
    width: 40,
  },
  optionLabel: { color: '#888', fontSize: 15, flex: 1 },
  optionTextActive: { color: '#fff' },
});
