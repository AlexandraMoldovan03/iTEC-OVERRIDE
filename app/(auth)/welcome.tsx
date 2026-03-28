/**
 * app/(auth)/welcome.tsx
 * Graffiti hero screen — black wall, neon ink, bold war cry.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, ScreenContainer } from '../../src/components/ui';
import { Colors, Spacing, Typography } from '../../src/theme';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <ScreenContainer style={styles.screen} padded={false}>
      {/* ── Hero ─────────────────────────────────────────── */}
      <View style={styles.hero}>
        {/* Spray paint splatter decoration — team colors */}
        <View style={styles.splatRow}>
          <View style={[styles.splat, styles.splatLg, { backgroundColor: Colors.accentPurple, left: '8%', top: 0 }]} />
          <View style={[styles.splat, styles.splatSm, { backgroundColor: Colors.accentCyan, left: '30%', top: 20 }]} />
          <View style={[styles.splat, styles.splatMd, { backgroundColor: Colors.accentPink, right: '12%', top: 8 }]} />
        </View>

        {/* Logo block */}
        <View style={styles.logoWrap}>
          <Text style={styles.sprayIcon}>🎨</Text>

          {/* MURAL — top line */}
          <Text style={styles.logoTop}>MURAL</Text>

          {/* Divider slash */}
          <View style={styles.slashRow}>
            <View style={[styles.slashLine, { backgroundColor: Colors.accentPurple }]} />
            <Text style={styles.slashStar}>✦</Text>
            <View style={[styles.slashLine, { backgroundColor: Colors.accentPink }]} />
          </View>

          {/* WAR — bottom line, neon pink glow */}
          <Text style={styles.logoBottom}>WAR</Text>

          <Text style={styles.logoTagline}>TERRITORY BELONGS TO THE BOLD</Text>
        </View>

        {/* Bottom splatter row */}
        <View style={styles.splatRowBottom}>
          <View style={[styles.dot, { backgroundColor: '#E8E8E8' }]} />
          <View style={[styles.dot, { backgroundColor: Colors.accentCyan }]} />
          <View style={[styles.dot, { backgroundColor: Colors.accentPink }]} />
          <View style={[styles.dot, { backgroundColor: Colors.accentGreen }]} />
          <View style={[styles.dot, { backgroundColor: Colors.accentPurple }]} />
        </View>
      </View>

      {/* ── Actions ──────────────────────────────────────── */}
      <View style={styles.actions}>
        <Text style={styles.tagline}>
          Scan a poster.{'\n'}Paint your mark.{'\n'}Own the street.
        </Text>

        {/* Primary CTA */}
        <Button
          label="⚡ Enter the Arena"
          onPress={() => router.push('/(auth)/register')}
          fullWidth
          style={styles.primaryBtn}
        />

        {/* Secondary — ghost */}
        <Button
          label="I already run these streets →"
          onPress={() => router.push('/(auth)/login')}
          variant="ghost"
          fullWidth
          style={styles.ghostBtn}
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
  // ── Hero ────────────────────────────────────────────────
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing[10],
  },
  splatRow: {
    position: 'absolute',
    top: Spacing[8],
    left: 0,
    right: 0,
    height: 48,
  },
  splatRowBottom: {
    flexDirection: 'row',
    gap: Spacing[2],
    marginTop: Spacing[8],
  },
  splat: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.6,
  },
  splatLg: { width: 28, height: 28 },
  splatMd: { width: 20, height: 20 },
  splatSm: { width: 14, height: 14 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    opacity: 0.85,
  },
  logoWrap: {
    alignItems: 'center',
    gap: Spacing[2],
  },
  sprayIcon: {
    fontSize: 56,
    marginBottom: Spacing[2],
  },
  logoTop: {
    fontSize: Typography.fontSizes['4xl'] + 4,
    fontWeight: Typography.fontWeights.black,
    color: Colors.white,
    letterSpacing: Typography.letterSpacing.spray,
    textTransform: 'uppercase',
  },
  slashRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    marginVertical: Spacing[1],
  },
  slashLine: {
    height: 2,
    width: 60,
    borderRadius: 1,
  },
  slashStar: {
    color: Colors.accentYellow,
    fontSize: Typography.fontSizes.lg,
  },
  logoBottom: {
    fontSize: Typography.fontSizes['4xl'] + 16,
    fontWeight: Typography.fontWeights.black,
    color: Colors.accentPurple,
    letterSpacing: Typography.letterSpacing.spray,
    textTransform: 'uppercase',
    // Neon glow via text shadow isn't native, but elevation + shadow on a wrapper works
    textShadowColor: Colors.accentPurple,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  logoTagline: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textMuted,
    letterSpacing: Typography.letterSpacing.widest,
    textTransform: 'uppercase',
    marginTop: Spacing[2],
  },
  // ── Actions ────────────────────────────────────────────
  actions: {
    padding: Spacing[6],
    paddingBottom: Spacing[10],
    gap: Spacing[3],
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  tagline: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    textAlign: 'center',
    lineHeight: Typography.fontSizes.lg * Typography.lineHeights.relaxed,
    letterSpacing: Typography.letterSpacing.wide,
    marginBottom: Spacing[2],
  },
  primaryBtn: {
    backgroundColor: Colors.accentPurple,
    borderColor: Colors.accentPurple,
    shadowColor: Colors.accentPurple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 16,
    elevation: 10,
  },
  ghostBtn: {
    borderColor: Colors.borderBright,
  },
});
