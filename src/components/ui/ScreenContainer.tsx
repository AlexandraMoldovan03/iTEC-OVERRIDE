/**
 * src/components/ui/ScreenContainer.tsx
 * Wrapper for all non-fullscreen screens providing safe area, background, and optional scroll.
 */

import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ViewStyle,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../../theme';

interface ScreenContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  padded?: boolean;
  keyboardAvoiding?: boolean;
}

export function ScreenContainer({
  children,
  scrollable = false,
  style,
  contentStyle,
  padded = true,
  keyboardAvoiding = false,
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();

  const inner = scrollable ? (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContent,
        padded && styles.padded,
        { paddingBottom: insets.bottom + Spacing[8] },
        contentStyle,
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.inner, padded && styles.padded, contentStyle]}>{children}</View>
  );

  const content = (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top },
        style,
      ]}
    >
      {inner}
    </View>
  );

  if (keyboardAvoiding) {
    return (
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {content}
      </KeyboardAvoidingView>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  inner: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  padded: {
    paddingHorizontal: Spacing[4],
  },
});
