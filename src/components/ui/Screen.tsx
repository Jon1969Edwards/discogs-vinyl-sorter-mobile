import React from 'react';
import { View, StyleSheet, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme';

interface ScreenProps extends ViewProps {
  children: React.ReactNode;
  edges?: ('top' | 'bottom')[];
}

export function Screen({ children, edges = ['top'], style, ...rest }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const paddingTop = edges.includes('top') ? insets.top : 0;
  const paddingBottom = edges.includes('bottom') ? insets.bottom : 0;

  return (
    <View
      style={[styles.screen, { paddingTop, paddingBottom }, style]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
