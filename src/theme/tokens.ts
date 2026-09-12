/** Shared design tokens (dark shelf theme). */

export const colors = {
  background: '#1a1a2e',
  surface: '#252542',
  surfaceElevated: '#2d2d4a',
  accent: '#c9943a',
  accentMuted: 'rgba(201, 148, 58, 0.18)',
  textPrimary: '#eeeeee',
  textSecondary: '#bbbbbb',
  textMuted: '#666666',
  border: '#3a3a5c',
  warning: '#f0ad4e',
  warningMuted: 'rgba(240, 173, 78, 0.12)',
  error: '#d97a7a',
  white: '#ffffff',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 999,
} as const;

export const typography = {
  title: { fontSize: 22, fontWeight: '700' as const },
  titleLarge: { fontSize: 26, fontWeight: '700' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  bodySmall: { fontSize: 14, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
  label: { fontSize: 13, fontWeight: '600' as const },
} as const;
