/**
 * app/(main)/vault.tsx
 * Poster vault — shows all posters the current user has ever scanned.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useVaultStore } from '../../src/stores/vaultStore';
import { useAuthStore }  from '../../src/stores/authStore';
import { PosterCard } from '../../src/components/poster/PosterCard';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { Button } from '../../src/components/ui/Button';
import { Poster } from '../../src/types/poster';
import { Colors, Spacing, Typography } from '../../src/theme';

export default function VaultScreen() {
  const router = useRouter();
  const user   = useAuthStore((s) => s.user);
  const { posters, isLoading, loadVault } = useVaultStore();

  useEffect(() => {
    if (user?.id) {
      loadVault(user.id);
    }
  }, [user?.id]);

  const handlePress = (poster: Poster) => {
    router.push(`/poster/${poster.id}`);
  };

  return (
    <ScreenContainer scrollable padded={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Vault</Text>
        <Text style={styles.subtitle}>{posters.length} poster{posters.length !== 1 ? 's' : ''} scanned</Text>
      </View>

      {isLoading ? (
        <View style={styles.empty}>
          <ActivityIndicator color={Colors.accentPurple} size="large" />
          <Text style={[styles.emptyText, { marginTop: Spacing[3] }]}>
            Loading your posters…
          </Text>
        </View>
      ) : posters.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🖼️</Text>
          <Text style={styles.emptyTitle}>Your vault is empty</Text>
          <Text style={styles.emptyText}>
            Scan a real-world poster to enter your first battle room.
          </Text>
          <Button
            label="Scan a Poster"
            onPress={() => router.push('/scanner')}
            style={styles.scanBtn}
          />
        </View>
      ) : (
        <FlatList
          data={posters}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => (
            <PosterCard poster={item} onPress={handlePress} style={styles.card} />
          )}
          contentContainerStyle={styles.list}
          scrollEnabled={false}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[6],
    paddingBottom: Spacing[5],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: Spacing[1],
  },
  title: {
    fontSize: Typography.fontSizes['2xl'],
    fontWeight: Typography.fontWeights.black,
    color: Colors.textPrimary,
    letterSpacing: Typography.letterSpacing.wider,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textMuted,
    letterSpacing: Typography.letterSpacing.widest,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  list: {
    paddingHorizontal: Spacing[4],
  },
  card: {},
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing[8],
    paddingTop: Spacing[20],
    gap: Spacing[3],
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: Spacing[2],
  },
  emptyTitle: {
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: Typography.fontSizes.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.fontSizes.base * Typography.lineHeights.relaxed,
  },
  scanBtn: {
    marginTop: Spacing[4],
  },
});
