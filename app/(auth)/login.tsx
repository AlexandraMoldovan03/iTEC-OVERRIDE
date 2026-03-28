/**
 * app/(auth)/login.tsx
 * Login screen — graffiti wall aesthetic, neon accents.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';
import { Button, AppTextInput, ScreenContainer } from '../../src/components/ui';
import { Colors, Spacing, Typography, Radius } from '../../src/theme';

const { width } = Dimensions.get('window');
const LOGO = require('../_layout/logo1.png');

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    clearError();

    const success = await login(email.trim(), password);

    if (success) {
      router.replace('/(main)/home');
      return;
    }

    const latestError = useAuthStore.getState().error;
    if (latestError) {
      Alert.alert('Login failed', latestError);
    }
  };

  return (
    <ScreenContainer scrollable padded keyboardAvoiding>
      {/* ── Back ─────────────────────────────────────────── */}
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backArrow}>← BACK</Text>
      </TouchableOpacity>

      {/* ── Header ───────────────────────────────────────── */}
      <View style={styles.header}>
        <Image source={LOGO} style={styles.logoSmall} resizeMode="contain" />
        <Text style={styles.title}>Welcome{'\n'}Back.</Text>
        <View style={styles.accentLine} />
        <Text style={styles.subtitle}>Reclaim your territory</Text>
      </View>

      {/* ── Form ─────────────────────────────────────────── */}
      <View style={styles.form}>
        <AppTextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="artist@muralwar.io"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <AppTextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          secureTextEntry
        />

        {error ? <Text style={styles.error}>⚠ {error}</Text> : null}

        <Button
          label="⚡ Enter"
          onPress={handleLogin}
          loading={isLoading}
          fullWidth
          style={styles.submitBtn}
        />
      </View>

      {/* ── Switch ───────────────────────────────────────── */}
      <TouchableOpacity onPress={() => router.push('/(auth)/register')} style={styles.switchWrap}>
        <Text style={styles.switchText}>
          No account?{'  '}
          <Text style={styles.switchLink}>JOIN THE WAR →</Text>
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
    paddingTop: Spacing[4],
    paddingBottom: Spacing[6],
    gap: Spacing[2],
  },
  logoSmall: {
    width: width * 0.52,
    height: width * 0.33,
    alignSelf: 'flex-start',
    marginLeft: -8,
    marginBottom: -4,
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
    backgroundColor: Colors.accentPurple,
    borderRadius: 2,
    marginTop: Spacing[2],
    shadowColor: Colors.accentPurple,
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
  error: {
    color: Colors.error,
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
    letterSpacing: Typography.letterSpacing.wide,
    marginBottom: Spacing[2],
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
    color: Colors.accentPurple,
    fontWeight: Typography.fontWeights.black,
  },
});
