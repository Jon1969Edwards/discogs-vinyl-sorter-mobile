import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors, radius, spacing } from '../../theme';

const ROW_COUNT = 5;

function SkeletonRow({ opacity }: { opacity: Animated.Value }) {
  return (
    <View style={styles.row}>
      <Animated.View style={[styles.thumb, { opacity }]} />
      <View style={styles.lines}>
        <Animated.View style={[styles.line, styles.lineWide, { opacity }]} />
        <Animated.View style={[styles.line, styles.lineMid, { opacity }]} />
        <Animated.View style={[styles.line, styles.lineShort, { opacity }]} />
      </View>
    </View>
  );
}

export function CollectionSkeleton() {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.35,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={styles.container}>
      {Array.from({ length: ROW_COUNT }, (_, i) => (
        <SkeletonRow key={i} opacity={pulse} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceElevated,
  },
  lines: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
    gap: spacing.sm,
  },
  line: {
    height: 12,
    borderRadius: 4,
    backgroundColor: colors.surfaceElevated,
  },
  lineWide: { width: '75%' },
  lineMid: { width: '55%' },
  lineShort: { width: '35%' },
});
