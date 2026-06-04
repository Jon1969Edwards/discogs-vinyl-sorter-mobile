import React from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';
import { colors, typography } from '../../theme';

type Variant = 'title' | 'titleLarge' | 'body' | 'bodySmall' | 'caption' | 'accent' | 'label';

const variantStyles: Record<Variant, TextStyle> = {
  title: { ...typography.title, color: colors.textPrimary },
  titleLarge: { ...typography.titleLarge, color: colors.textPrimary },
  body: { ...typography.body, color: colors.textSecondary },
  bodySmall: { ...typography.bodySmall, color: colors.textSecondary },
  caption: { ...typography.caption, color: colors.textMuted },
  accent: { ...typography.body, color: colors.accent, fontWeight: '600' },
  label: { ...typography.label, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
};

interface AppTextProps extends TextProps {
  variant?: Variant;
}

export function AppText({ variant = 'body', style, ...rest }: AppTextProps) {
  return <Text style={[variantStyles[variant], style]} {...rest} />;
}
