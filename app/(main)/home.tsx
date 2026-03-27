/**
 * app/(main)/home.tsx
 * Home screen — battle hub. Quick-scan CTA + active poster feed.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';
import { useVaultStore } from '../../src/stores/vaultStore';
import { PosterCard } from '../../src/components/poster/PosterCard';
import { TeamBadge } from '../../src/components/ui/TeamBadge';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { Button } from '../../src/components/ui/Button';
import { MOCK_POSTERS } from '../../src/mock/posters';
import { Poster } from '../../src/types/poster';
import { Colors, Spacing, Typography, Radius } from '../../src/theme';

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { posters: vaultPosters, loadVault } = useVaultStore();

  useEffect(() => {
    loadVault();
  }, []);

  const handlePosterPress = (poster: Poster) => {
    router.push(`/poster/${poster.id}`);
  };

  const handleScan = () => {
    router.push('/scanner');
  };

  return (
    <ScreenContainer scrollable padded={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hey, {user?.username ?? 'artist'}</Text>
          <Text style={styles.subGreeting}>The walls are waiting.</Text>
        </View>
        {user && <TeamBadge teamId={user.teamId} />}
      </View>

      {/* Scan CTA */}
      <View style={styles.scanSection}>
        <TouchableOpacity style={styles.scanBtn} onPress={handleScan} activeOpacity={0.85}>
          <Text style={styles.scanIcon}>📷</Text>
          <View>
            <Text style={styles.scanTitle}>SCAN A POSTER</Text>
            <Text style={styles.scanSub}>Enter a live mural battle room</Text>
          </View>
          <Text style={styles.scanArrow}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Active battles */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔥  ACTIVE BATTLES</Text>
        <FlatList
          data={MOCK_POSTERS}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => (
            <PosterCard poster={item} onPress={handlePosterPress} style={styles.card} />
          )}
          scrollEnabled={false}
          contentContainerStyle={styles.listContent}
        />
      </View>

      {/* Recently visited */}
      {vaultPosters.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏱  RECENTLY VISITED</Text>
          {vaultPosters.slice(0, 3).map((p) => (
            <PosterCard key={p.id} poster={p} onPress={handlePosterPress} style={styles.card} />
          ))}
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[6],
    paddingBottom: Spacing[4],
  },
  greeting: {
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.black,
    color: Colors.textPrimary,
  },
  subGreeting: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  scanSection: {
    paddingHorizontal: Spacing[4],
    marginBottom: Spacing[6],
  },
  scanBtn: {
    backgroundColor: Colors.accentPurple + '22',
    borderColor: Colors.accentPurple,
    borderWidth: 1,
    borderRadius: Radius['2xl'],
    padding: Spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  scanIcon: {
    fontSize: 32,
  },
  scanTitle: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.black,
    color: Colors.accentPurple,
    letterSpacing: Typography.letterSpacing.wider,
  },
  scanSub: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  scanArrow: {
    fontSize: Typography.fontSizes.xl,
    color: Colors.accentPurple,
    marginLeft: 'auto',
  },
  section: {
    paddingHorizontal: Spacing[4],
    marginBottom: Spacing[6],
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textMuted,
    letterSpacing: Typography.letterSpacing.widest,
    textTransform: 'uppercase',
    marginBottom: Spacing[3],
  },
  card: {},
  listContent: {},
});
