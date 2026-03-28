/**
 * src/theme/typography.ts
 * Graffiti-inspired type scale — heavy, bold, loud.
 * Uses system fonts compatible with Expo Go.
 */

export const Typography = {
  fontSizes: {
    xs: 10,
    sm: 12,
    md: 14,
    base: 16,
    lg: 18,
    xl: 22,
    '2xl': 28,
    '3xl': 36,
    '4xl': 48,
    '5xl': 64,
  },
  fontWeights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    black: '900' as const,
  },
  lineHeights: {
    tight: 1.1,
    normal: 1.5,
    relaxed: 1.75,
  },
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 1.5,
    wider: 3,
    widest: 5,
    spray: 8,  // extra dramatic — for hero titles
  },
};
