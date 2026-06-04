import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

export type CollectionSearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  filteredCount: number;
  totalCount: number;
  editable: boolean;
};

export function CollectionSearchBar({
  value,
  onChangeText,
  filteredCount,
  totalCount,
  editable,
}: CollectionSearchBarProps) {
  const isFiltering = value.trim().length > 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Search artist or title..."
          placeholderTextColor="#666"
          value={value}
          onChangeText={onChangeText}
          editable={editable}
          clearButtonMode="never"
        />
        {value.length > 0 ? (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => onChangeText('')}
            accessibilityLabel="Clear search"
          >
            <Text style={styles.clearText}>×</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {isFiltering ? (
        <Text style={styles.count}>
          Showing {filteredCount} of {totalCount}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#252542',
    borderRadius: 8,
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#fff',
  },
  clearBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  clearText: {
    color: '#aaa',
    fontSize: 22,
    lineHeight: 24,
  },
  count: {
    color: '#888',
    fontSize: 13,
    marginTop: 6,
    marginLeft: 4,
  },
});
