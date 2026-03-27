/**
 * app/(auth)/login.tsx
 * Login screen with email/password form.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';
import { Button, AppTextInput, ScreenContainer } from '../../src/components/ui';
import { Colors, Spacing, Typography } from '../../src/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    clearError();
    await login(email, password);
    // Navigation is handled by the route guard in _layout.tsx
  };

  return (
    <ScreenContainer scrollable padded keyboardAvoiding>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to reclaim your territory</Text>
      </View>

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

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          label="Enter"
          onPress={handleLogin}
          loading={isLoading}
          fullWidth
          style={styles.submitBtn}
        />
      </View>

      <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
        <Text style={styles.switchText}>
          No account? <Text style={styles.switchLink}>Join the war →</Text>
        </Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: Spacing[6],
    paddingBottom: Spacing[8],
    gap: Spacing[2],
  },
  backBtn: {
    marginBottom: Spacing[3],
  },
  backArrow: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xl,
  },
  title: {
    fontSize: Typography.fontSizes['3xl'],
    fontWeight: Typography.fontWeights.black,
    color: Colors.textPrimary,
    letterSpacing: Typography.letterSpacing.tight,
  },
  subtitle: {
    fontSize: Typography.fontSizes.base,
    color: Colors.textSecondary,
  },
  form: {
    gap: Spacing[1],
    marginBottom: Spacing[8],
  },
  error: {
    color: Colors.error,
    fontSize: Typography.fontSizes.sm,
    marginBottom: Spacing[2],
  },
  submitBtn: {
    marginTop: Spacing[4],
  },
  switchText: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.sm,
    textAlign: 'center',
  },
  switchLink: {
    color: Colors.accentPurple,
    fontWeight: Typography.fontWeights.semibold,
  },
});
