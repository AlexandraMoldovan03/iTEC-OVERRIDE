/**
 * app/(main)/home.tsx
 * Home screen — graffiti battle hub. Neon scan CTA + live poster feed.
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';
import { useVaultStore } from '../../src/stores/vaultStore';
import { PosterCard } from '../../src/components/poster/PosterCard';
import { TeamBadge } from '../../src/components/ui/TeamBadge';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
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
      {/* ── Header ─────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>
            {user?.username?.toUpperCase() ?? 'ARTIST'}
          </Text>
          <Text style={styles.subGreeting}>The walls are waiting.</Text>
        </View>
        {user && <TeamBadge teamId={user.teamId} />}
      </View>

      {/* ── Scan CTA ───────────────────────────────────── */}
      <View style={styles.scanSection}>
        <TouchableOpacity
          style={styles.scanBtn}
          onPress={handleScan}
          activeOpacity={0.8}
        >
          {/* Left glow bar */}
          <View style={styles.scanGlowBar} />

          <View style={styles.scanContent}>
            <Text style={styles.scanIcon}>📷</Text>
            <View style={styles.scanText}>
              <Text style={styles.scanTitle}>SCAN A POSTER</Text>
              <Text style={styles.scanSub}>Enter a live mural battle room</Text>
            </View>
          </View>

          <Text style={styles.scanArrow}>→</Text>
        </TouchableOpacity>
      </View>

      {/* ── Active battles ─────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionDot} />
          <Text style={styles.sectionTitle}>ACTIVE BATTLES</Text>
          <View style={[styles.sectionDot, styles.sectionDotRight]} />
        </View>
        <FlatList
          data={MOCK_POSTERS}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => (
            <PosterCard
              poster={item}
              onPress={handlePosterPress}
              style={styles.card}
            />
          )}
          scrollEnabled={false}
          contentContainerStyle={styles.listContent}
        />
      </View>

      {/* ── Recently visited ───────────────────────────── */}
      {vaultPosters.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionDot, { backgroundColor: Colors.accentCyan }]} />
            <Text style={[styles.sectionTitle, { color: Colors.accentCyan }]}>
              RECENTLY VISITED
            </Text>
            <View style={[styles.sectionDot, styles.sectionDotRight, { backgroundColor: Colors.accentCyan }]} />
          </View>
          {vaultPosters.slice(0, 3).map((p) => (
            <PosterCard
              key={p.id}
              poster={p}
              onPress={handlePosterPress}
              style={styles.card}
            />
          ))}
        </View>
      )}

      {/* Bottom spacer */}
      <View style={{ height: Spacing[8] }} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[6],
    paddingBottom: Spacing[5],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    gap: 2,
  },
  greeting: {
    fontSize: Typography.fontSizes['2xl'],
    fontWeight: Typography.fontWeights.black,
    color: Colors.textPrimary,
    letterSpacing: Typography.letterSpacing.wider,
    textShadowColor: Colors.accentPurple,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  subGreeting: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textMuted,
    letterSpacing: Typography.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  // ── Scan CTA ────────────────────────────────────────────
  scanSection: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[5],
    paddingBottom: Spacing[4],
  },
  scanBtn: {
    backgroundColor: Colors.bgCard,
    borderColor: Colors.accentPurple,
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    padding: Spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    shadowColor: Colors.accentPurple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  scanGlowBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: Colors.accentPurple,
    shadowColor: Colors.accentPurple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  scanContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    flex: 1,
    paddingLeft: Spacing[2],
  },
  scanIcon: {
    fontSize: 28,
  },
  scanText: {
    gap: 2,
  },
  scanTitle: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.black,
    color: Colors.accentPurple,
    letterSpacing: Typography.letterSpacing.wider,
  },
  scanSub: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textMuted,
    letterSpacing: Typography.letterSpacing.wide,
  },
  scanArrow: {
    fontSize: Typography.fontSizes.xl,
    color: Colors.accentPurple,
    fontWeight: Typography.fontWeights.black,
  },
  // ── Sections ────────────────────────────────────────────
  section: {
    paddingHorizontal: Spacing[4],
    marginBottom: Spacing[4],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    marginBottom: Spacing[4],
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.accentGreen,
    shadowColor: Colors.accentGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  sectionDotRight: {
    flex: 0,
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.black,
    color: Colors.accentGreen,
    letterSpacing: Typography.letterSpacing.widest,
    flex: 1,
  },
  card: {},
  listContent: {},
});
