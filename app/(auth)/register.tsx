/**
 * app/(auth)/register.tsx
 * Registration screen — graffiti tag creation flow.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, AppTextInput, ScreenContainer } from '../../src/components/ui';
import { Colors, Spacing, Typography } from '../../src/theme';

export default function RegisterScreen() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!username.trim()) e.username = 'Handle is required';
    if (!email.includes('@')) e.email = 'Valid email required';
    if (password.length < 6) e.password = 'Min 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (!validate()) return;
    router.push({
      pathname: '/(auth)/team-select',
      params: { username, email, password },
    });
  };

  return (
    <ScreenContainer scrollable padded keyboardAvoiding>
      {/* ── Back ─────────────────────────────────────────── */}
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backArrow}>← BACK</Text>
      </TouchableOpacity>

      {/* ── Header ───────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.label}>NEW ARTIST</Text>
        <Text style={styles.title}>Create{'\n'}Your Tag.</Text>
        <View style={styles.accentLine} />
        <Text style={styles.subtitle}>Your identity on every wall</Text>
      </View>

      {/* ── Form ─────────────────────────────────────────── */}
      <View style={styles.form}>
        <AppTextInput
          label="Handle"
          value={username}
          onChangeText={setUsername}
          placeholder="ghost_line"
          autoCapitalize="none"
          error={errors.username}
        />
        <AppTextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="artist@muralwar.io"
          keyboardType="email-address"
          autoCapitalize="none"
          error={errors.email}
        />
        <AppTextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          secureTextEntry
          error={errors.password}
        />

        <Button
          label="Choose Your Crew →"
          onPress={handleNext}
          fullWidth
          style={styles.submitBtn}
        />
      </View>

      {/* ── Switch ───────────────────────────────────────── */}
      <TouchableOpacity
        onPress={() => router.push('/(auth)/login')}
        style={styles.switchWrap}
      >
        <Text style={styles.switchText}>
          Already in?{'  '}
          <Text style={styles.switchLink}>LOGIN →</Text>
        </Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    marginTop: Spacing[4],
    marginBottom: Spacing[2],
    alignSelf: 'flex-start',
  },
  backArrow: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.black,
    letterSpacing: Typography.letterSpacing.widest,
  },
  header: {
    paddingTop: Spacing[6],
    paddingBottom: Spacing[8],
    gap: Spacing[2],
  },
  label: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.black,
    color: Colors.accentPink,
    letterSpacing: Typography.letterSpacing.widest,
  },
  title: {
    fontSize: Typography.fontSizes['4xl'],
    fontWeight: Typography.fontWeights.black,
    color: Colors.textPrimary,
    letterSpacing: Typography.letterSpacing.tight,
    lineHeight: Typography.fontSizes['4xl'] * Typography.lineHeights.tight,
  },
  accentLine: {
    height: 3,
    width: 48,
    backgroundColor: Colors.accentPink,
    borderRadius: 2,
    marginTop: Spacing[2],
    shadowColor: Colors.accentPink,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  subtitle: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textMuted,
    letterSpacing: Typography.letterSpacing.wide,
    textTransform: 'uppercase',
    marginTop: Spacing[1],
  },
  form: {
    gap: Spacing[1],
    marginBottom: Spacing[8],
  },
  submitBtn: {
    marginTop: Spacing[4],
  },
  switchWrap: {
    alignSelf: 'center',
    paddingVertical: Spacing[3],
  },
  switchText: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.xs,
    letterSpacing: Typography.letterSpacing.wider,
  },
  switchLink: {
    color: Colors.accentPink,
    fontWeight: Typography.fontWeights.black,
  },
});
