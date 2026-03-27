/**
 * app/(auth)/welcome.tsx
 * Intro / splash screen. Sets the "poster battle arena" tone.
 */

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, ScreenContainer } from '../../src/components/ui';
import { Colors, Spacing, Typography } from '../../src/theme';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <ScreenContainer style={styles.screen} padded={false}>
      <View style={styles.hero}>
        {/* Animated logo placeholder */}
        <View style={styles.logoWrap}>
          <Text style={styles.logoIcon}>🖌️</Text>
          <Text style={styles.logoText}>MURAL WAR</Text>
          <Text style={styles.logoSub}>TERRITORY BELONGS TO THE BOLD</Text>
        </View>

        {/* Team color splatter decoration */}
        <View style={styles.decorRow}>
          <View style={[styles.blob, { backgroundColor: '#E0E0E0' }]} />
          <View style={[styles.blob, { backgroundColor: '#4A90E2' }]} />
          <View style={[styles.blob, { backgroundColor: '#FF3D00' }]} />
        </View>
      </View>

      <View style={styles.actions}>
        <Text style={styles.tagline}>
          Scan. Draw. Dominate.{'\n'}Real posters. Real battles.
        </Text>
        <Button
          label="Enter the Arena"
          onPress={() => router.push('/(auth)/register')}
          fullWidth
          style={styles.primaryBtn}
        />
        <Button
          label="I already have an account"
          onPress={() => router.push('/(auth)/login')}
          variant="ghost"
          fullWidth
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: Colors.bg,
    justifyContent: 'space-between',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[8],
  },
  logoWrap: {
    alignItems: 'center',
    gap: Spacing[2],
  },
  logoIcon: {
    fontSize: 72,
  },
  logoText: {
    fontSize: Typography.fontSizes['4xl'],
    fontWeight: Typography.fontWeights.black,
    color: Colors.textPrimary,
    letterSpacing: Typography.letterSpacing.widest,
  },
  logoSub: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textMuted,
    letterSpacing: Typography.letterSpacing.widest,
    textTransform: 'uppercase',
  },
  decorRow: {
    flexDirection: 'row',
    gap: Spacing[3],
  },
  blob: {
    width: 18,
    height: 18,
    borderRadius: 9,
    opacity: 0.8,
  },
  actions: {
    padding: Spacing[6],
    gap: Spacing[3],
  },
  tagline: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.lg,
    textAlign: 'center',
    lineHeight: Typography.fontSizes.lg * Typography.lineHeights.relaxed,
    marginBottom: Spacing[4],
  },
  primaryBtn: {
    backgroundColor: Colors.accentPurple,
  },
});
