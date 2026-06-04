/**
 * Draggable shelf reorder – separate chunk; requires dev client (gesture-handler native).
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import DraggableFlatList, {
  ScaleDecorator,
  type RenderItemParams,
} from 'react-native-draggable-flatlist';
import type { ReleaseRow } from '../types';

function rowKey(item: ReleaseRow, index: number): string {
  if (item.instance_id != null) return `i-${item.instance_id}`;
  if (item.release_id != null) return `r-${item.release_id}`;
  return `row-${index}`;
}

function ReorderRow({ item, drag }: { item: ReleaseRow; drag?: () => void }) {
  return (
    <ScaleDecorator activeScale={1.02}>
      <TouchableOpacity
        style={styles.row}
        onLongPress={drag}
        delayLongPress={120}
        activeOpacity={0.7}
      >
        <Text style={styles.dragHandle} accessibilityLabel="Drag to reorder">
          ≡
        </Text>
        {item.thumb_url ? (
          <Image source={{ uri: item.thumb_url }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]} />
        )}
        <View style={styles.rowText}>
          <Text style={styles.artist} numberOfLines={1}>
            {item.artist_display}
          </Text>
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
        </View>
      </TouchableOpacity>
    </ScaleDecorator>
  );
}

export type ManualReorderListProps = {
  rows: ReleaseRow[];
  onRowsChange: (rows: ReleaseRow[]) => void;
};

export function ManualReorderList({ rows, onRowsChange }: ManualReorderListProps) {
  const renderItem = useCallback(
    ({ item, drag }: RenderItemParams<ReleaseRow>) => (
      <ReorderRow item={item} drag={drag} />
    ),
    []
  );

  return (
    <DraggableFlatList
      data={rows}
      onDragEnd={({ data }) => onRowsChange(data)}
      keyExtractor={(item, index) => rowKey(item, index)}
      renderItem={renderItem}
      ListEmptyComponent={<Text style={styles.empty}>No LPs in collection</Text>}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    padding: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#252542',
    backgroundColor: '#222240',
  },
  dragHandle: {
    width: 28,
    fontSize: 22,
    color: '#888',
    textAlign: 'center',
    alignSelf: 'center',
    marginRight: 4,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 4,
  },
  thumbPlaceholder: {
    backgroundColor: '#252542',
  },
  rowText: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  artist: {
    fontSize: 16,
    fontWeight: '600',
    color: '#eee',
  },
  title: {
    fontSize: 14,
    color: '#bbb',
  },
  empty: {
    color: '#666',
    textAlign: 'center',
    padding: 24,
  },
});
