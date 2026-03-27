/**
 * app/(auth)/register.tsx
 * Registration screen. After submitting, pushes to team-select.
 * Saves username/email/password in local state and passes teamId once selected.
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
    // Pass credentials as params to team-select screen
    router.push({
      pathname: '/(auth)/team-select',
      params: { username, email, password },
    });
  };

  return (
    <ScreenContainer scrollable padded keyboardAvoiding>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Create your tag</Text>
        <Text style={styles.subtitle}>Your identity on every wall</Text>
      </View>

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
          label="Choose Your Team →"
          onPress={handleNext}
          fullWidth
          style={styles.submitBtn}
        />
      </View>

      <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
        <Text style={styles.switchText}>
          Already in? <Text style={styles.switchLink}>Login →</Text>
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
  backBtn: { marginBottom: Spacing[3] },
  backArrow: { color: Colors.textSecondary, fontSize: Typography.fontSizes.xl },
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
  form: { gap: Spacing[1], marginBottom: Spacing[8] },
  submitBtn: { marginTop: Spacing[4] },
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
