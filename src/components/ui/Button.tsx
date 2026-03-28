/**
 * src/components/ui/Button.tsx
 * Graffiti-style button — bold borders, neon glow, uppercase ink.
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors, Spacing, Radius, Typography } from '../../theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'neon';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  textStyle,
  fullWidth = false,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      style={[
        styles.base,
        styles[variant],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'ghost' ? Colors.accentPurple : Colors.white}
          size="small"
        />
      ) : (
        <Text style={[styles.label, styles[`${variant}Text` as keyof typeof styles], textStyle]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: Spacing[3] + 2,
    paddingHorizontal: Spacing[6],
    borderRadius: Radius.sm,        // sharper corners — graffiti tags are angular
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    borderWidth: 2,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.35,
  },
  // ── Variants ──────────────────────────────────────────────
  primary: {
    backgroundColor: Colors.accentPurple,
    borderColor: Colors.accentPurple,
    shadowColor: Colors.accentPurple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  secondary: {
    backgroundColor: Colors.bgCard,
    borderColor: Colors.borderBright,
  },
  ghost: {
    backgroundColor: Colors.transparent,
    borderColor: Colors.borderBright,
  },
  danger: {
    backgroundColor: Colors.error,
    borderColor: Colors.error,
    shadowColor: Colors.error,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  neon: {
    backgroundColor: Colors.transparent,
    borderColor: Colors.accentGreen,
    shadowColor: Colors.accentGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  // ── Labels ────────────────────────────────────────────────
  label: {
    fontWeight: Typography.fontWeights.black,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wider,
    fontSize: Typography.fontSizes.sm,
  },
  primaryText: { color: Colors.white },
  secondaryText: { color: Colors.textPrimary },
  ghostText: { color: Colors.textSecondary },
  dangerText: { color: Colors.white },
  neonText: { color: Colors.accentGreen },
});
