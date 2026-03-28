/**
 * src/components/ui/TextInput.tsx
 * Graffiti-styled text input — wall-tag aesthetic, neon focus glow.
 */

import React, { useState } from 'react';
import {
  View,
  TextInput as RNTextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { Colors, Spacing, Radius, Typography } from '../../theme';

interface AppTextInputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export function AppTextInput({
  label,
  error,
  containerStyle,
  ...props
}: AppTextInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text style={[styles.label, focused && styles.labelFocused]}>{label}</Text>
      ) : null}
      <RNTextInput
        {...props}
        onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
        style={[
          styles.input,
          focused && styles.inputFocused,
          error && styles.inputError,
          props.style,
        ]}
        placeholderTextColor={Colors.textMuted}
      />
      {error ? <Text style={styles.error}>⚠ {error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing[4],
  },
  label: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.black,
    color: Colors.textMuted,
    marginBottom: Spacing[1] + 2,
    letterSpacing: Typography.letterSpacing.widest,
    textTransform: 'uppercase',
  },
  labelFocused: {
    color: Colors.accentPurple,
  },
  input: {
    backgroundColor: Colors.bgSurface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.medium,
    minHeight: 52,
  },
  inputFocused: {
    borderColor: Colors.accentPurple,
    backgroundColor: Colors.bgCard,
    shadowColor: Colors.accentPurple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  inputError: {
    borderColor: Colors.error,
  },
  error: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.error,
    marginTop: Spacing[1],
    fontWeight: Typography.fontWeights.bold,
    letterSpacing: Typography.letterSpacing.wide,
  },
});
