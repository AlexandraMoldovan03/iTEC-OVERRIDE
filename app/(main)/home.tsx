import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ImageBackground,
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
import {
  SCAN_POSTER_IMAGE,
  BACKGROUND2_IMAGE,
} from '../../src/constants/badges';

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { posters: vaultPosters, loadVault } = useVaultStore();

  useEffect(() => {
    loadVault();
  }, [loadVault]);

  const handlePosterPress = (poster: Poster) => {
    router.push(`/poster/${poster.id}`);
  };

  const featuredPoster = useMemo(() => MOCK_POSTERS[0], []);
  const liveCount = MOCK_POSTERS.length;
  const wallCount = vaultPosters.length;
  const hotCount = Math.max(1, Math.min(4, Math.floor(MOCK_POSTERS.length / 2)));

  const featuredPosterLabel = featuredPoster
    ? `POSTER #${featuredPoster.id}`
    : 'UNKNOWN POSTER';

  return (
    <ScreenContainer scrollable padded={false} style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerIdentity}>
            <Text style={styles.headerEyebrow}>MURAL WAR // CREATIVE TAKEOVER</Text>
            <Text style={styles.headerTitle}>
              {user?.username?.toUpperCase() ?? 'ARTIST'}
            </Text>
            <Text style={styles.headerSubtitle}>
              Scan real posters. Join live battles. Leave a mark the city remembers.
            </Text>
          </View>

          {user && (
            <View style={styles.headerBadgeWrap}>
              <TeamBadge teamId={user.teamId} />
            </View>
          )}
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={[styles.statDot, { backgroundColor: Colors.accentGreen }]} />
          <Text style={styles.statLabel}>LIVE BATTLES</Text>
          <Text style={styles.statValue}>{liveCount}</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statDot, { backgroundColor: Colors.accentPink }]} />
          <Text style={styles.statLabel}>HOT WALLS</Text>
          <Text style={styles.statValue}>{hotCount}</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statDot, { backgroundColor: Colors.accentCyan }]} />
          <Text style={styles.statLabel}>YOUR WALL</Text>
          <Text style={styles.statValue}>{wallCount}</Text>
        </View>
      </View>

      <ImageBackground
        source={BACKGROUND2_IMAGE}
        style={styles.hero}
        imageStyle={styles.heroImage}
      >
        <View style={styles.heroOverlay}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>LIVE CITY CANVAS</Text>
          </View>

          <Text style={styles.heroTitle}>SCAN. CREATE. TAKE OVER.</Text>

          <Text style={styles.heroSubtitle}>
            MuralWar turns city posters into shared creative battle zones where
            teams compete with style, speed, and presence.
          </Text>

          <View style={styles.heroActions}>
            <TouchableOpacity
              activeOpacity={0.88}
              style={styles.heroActionPrimary}
              onPress={() => router.push('/scanner')}
            >
              <Image
                source={SCAN_POSTER_IMAGE}
                style={styles.heroActionImage}
                resizeMode="contain"
              />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.88}
              style={styles.heroActionSecondary}
              onPress={() => router.push('/(main)/wall')}
            >
              <View style={styles.wallEntryCard}>
                <Text style={styles.wallEntryEyebrow}>ARCHIVE MODE</Text>
                <Text style={styles.wallEntryTitle}>OPEN YOUR WALL</Text>
                <Text style={styles.wallEntryText}>
                  See every scanned poster together with the layers and traces
                  left by other players.
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <Text style={styles.heroFooterText}>
            Real posters • Team territory • Live street energy
          </Text>
        </View>
      </ImageBackground>

      {featuredPoster && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionDot, { backgroundColor: Colors.accentYellow }]} />
            <Text style={[styles.sectionTitle, { color: Colors.accentYellow }]}>
              TONIGHT’S SPOTLIGHT
            </Text>
          </View>

          <TouchableOpacity
            style={styles.spotlightCard}
            activeOpacity={0.9}
            onPress={() => handlePosterPress(featuredPoster)}
          >
            <View style={styles.spotlightTopRow}>
              <View style={styles.spotlightPill}>
                <Text style={styles.spotlightPillText}>TRENDING WALL</Text>
              </View>
              <Text style={styles.spotlightLive}>LIVE NOW</Text>
            </View>

            <Text style={styles.spotlightTitle} numberOfLines={1}>
              {featuredPosterLabel}
            </Text>

            <Text style={styles.spotlightLocation} numberOfLines={1}>
              City territory currently under creative pressure
            </Text>

            <Text style={styles.spotlightText}>
              Biggest clash in the city right now. Jump in and help your crew
              leave the boldest mark on this wall.
            </Text>

            <View style={styles.spotlightStats}>
              <View style={styles.spotlightStat}>
                <Text style={styles.spotlightStatLabel}>HEAT</Text>
                <Text style={styles.spotlightStatValue}>92%</Text>
              </View>
              <View style={styles.spotlightStat}>
                <Text style={styles.spotlightStatLabel}>MODE</Text>
                <Text style={styles.spotlightStatValue}>OPEN</Text>
              </View>
              <View style={styles.spotlightStat}>
                <Text style={styles.spotlightStatLabel}>CREW PRESSURE</Text>
                <Text style={styles.spotlightStatValue}>HIGH</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionDot, { backgroundColor: Colors.accentGreen }]} />
          <Text style={[styles.sectionTitle, { color: Colors.accentGreen }]}>
            ACTIVE BATTLES
          </Text>
        </View>

        <Text style={styles.sectionDescription}>
          Jump into live posters, reinforce your crew’s presence, and watch walls
          evolve in real time.
        </Text>

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

      {vaultPosters.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionDot, { backgroundColor: Colors.accentCyan }]} />
            <Text style={[styles.sectionTitle, { color: Colors.accentCyan }]}>
              RECENTLY CAPTURED
            </Text>
          </View>

          <Text style={styles.sectionDescription}>
            Reopen your recent walls, continue the artwork, or defend them before
            another team takes over.
          </Text>

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

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionDot, { backgroundColor: Colors.accentPurple }]} />
          <Text style={[styles.sectionTitle, { color: Colors.accentPurple }]}>
            YOUR CREW STATUS
          </Text>
        </View>

        <View style={styles.crewCard}>
          <View style={styles.crewTopRow}>
            <Text style={styles.crewName}>
              {user?.username?.toUpperCase() ?? 'ARTIST'}
            </Text>
            {user && <TeamBadge teamId={user.teamId} />}
          </View>

          <Text style={styles.crewText}>
            Every poster you scan becomes part of your creative footprint in the city.
            Build presence, collect walls, and turn every battle into identity.
          </Text>

          <View style={styles.crewStatsRow}>
            <View style={styles.crewStatBox}>
              <Text style={styles.crewStatNumber}>{wallCount}</Text>
              <Text style={styles.crewStatLabel}>SCANNED WALLS</Text>
            </View>

            <View style={styles.crewStatBox}>
              <Text style={styles.crewStatNumber}>{liveCount}</Text>
              <Text style={styles.crewStatLabel}>ACTIVE BATTLES</Text>
            </View>

            <View style={styles.crewStatBox}>
              <Text style={styles.crewStatNumber}>A+</Text>
              <Text style={styles.crewStatLabel}>STYLE RANK</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={{ height: Spacing[8] }} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: Colors.bg,
  },

  header: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[6],
    paddingBottom: Spacing[3],
  },
  headerTopRow: {
    gap: Spacing[3],
  },
  headerIdentity: {
    gap: 6,
  },
  headerEyebrow: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.accentPink,
    fontWeight: Typography.fontWeights.black,
    letterSpacing: Typography.letterSpacing.widest,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: Typography.fontSizes['3xl'] + 6,
    fontWeight: Typography.fontWeights.black,
    color: Colors.textPrimary,
    letterSpacing: Typography.letterSpacing.wider,
    textTransform: 'uppercase',
    textShadowColor: Colors.accentPurple,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  headerSubtitle: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.sm,
    lineHeight: 21,
    maxWidth: '92%',
  },
  headerBadgeWrap: {
    alignSelf: 'flex-start',
    marginTop: Spacing[1],
  },

  statsRow: {
    flexDirection: 'row',
    gap: Spacing[2],
    paddingHorizontal: Spacing[4],
    marginBottom: Spacing[4],
  },
  statCard: {
    flex: 1,
    minHeight: 82,
    backgroundColor: '#0D0D10',
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginBottom: 4,
  },
  statLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: Typography.fontWeights.bold,
    letterSpacing: 1.15,
    textTransform: 'uppercase',
  },
  statValue: {
    color: Colors.white,
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.black,
    marginTop: 4,
  },

  hero: {
    marginHorizontal: Spacing[4],
    minHeight: 430,
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: Spacing[5],
  },
  heroImage: {
    opacity: 0.96,
  },
  heroOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.48)',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[4],
    justifyContent: 'space-between',
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.accentYellow,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  heroBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: Typography.fontWeights.black,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: Colors.white,
    fontSize: Typography.fontSizes['3xl'] + 4,
    fontWeight: Typography.fontWeights.black,
    letterSpacing: 1.4,
    lineHeight: 42,
    textTransform: 'uppercase',
    marginTop: Spacing[3],
    maxWidth: '95%',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: Typography.fontSizes.sm,
    lineHeight: 21,
    marginTop: Spacing[2],
    maxWidth: '95%',
  },
  heroActions: {
    gap: Spacing[3],
    marginTop: Spacing[4],
  },
  heroActionPrimary: {
    width: '100%',
  },
  heroActionSecondary: {
    width: '100%',
  },
  heroActionImage: {
    width: '100%',
    height: 96,
  },
  wallEntryCard: {
    backgroundColor: 'rgba(11,11,15,0.92)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(18,214,255,0.28)',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  wallEntryEyebrow: {
    color: Colors.accentCyan,
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.black,
    letterSpacing: Typography.letterSpacing.widest,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  wallEntryTitle: {
    color: Colors.white,
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.black,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  wallEntryText: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.sm,
    lineHeight: 20,
  },
  heroFooterText: {
    color: Colors.accentCyan,
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.black,
    letterSpacing: Typography.letterSpacing.widest,
    textTransform: 'uppercase',
    marginTop: Spacing[2],
  },

  section: {
    paddingHorizontal: Spacing[4],
    marginBottom: Spacing[5],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    marginBottom: Spacing[2],
  },
  sectionDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  sectionTitle: {
    flex: 1,
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.black,
    letterSpacing: Typography.letterSpacing.widest,
    textTransform: 'uppercase',
  },
  sectionDescription: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.sm,
    lineHeight: 20,
    marginBottom: Spacing[3],
  },

  spotlightCard: {
    backgroundColor: '#0D0D10',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: Spacing[4],
  },
  spotlightTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  spotlightPill: {
    backgroundColor: Colors.accentPink,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  spotlightPillText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: Typography.fontWeights.black,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  spotlightLive: {
    color: Colors.accentGreen,
    fontSize: 11,
    fontWeight: Typography.fontWeights.black,
    letterSpacing: 1,
  },
  spotlightTitle: {
    color: Colors.white,
    fontSize: Typography.fontSizes['2xl'],
    fontWeight: Typography.fontWeights.black,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: Spacing[3],
  },
  spotlightLocation: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.sm,
    marginTop: Spacing[1],
  },
  spotlightText: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.sm,
    lineHeight: 21,
    marginTop: Spacing[3],
  },
  spotlightStats: {
    flexDirection: 'row',
    gap: Spacing[2],
    marginTop: Spacing[4],
  },
  spotlightStat: {
    flex: 1,
    backgroundColor: '#151519',
    borderRadius: 16,
    padding: 12,
  },
  spotlightStatLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: Typography.fontWeights.bold,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  spotlightStatValue: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: Typography.fontWeights.black,
    marginTop: 6,
  },

  card: {
    marginBottom: Spacing[3],
  },
  listContent: {
    paddingTop: Spacing[1],
  },

  crewCard: {
    backgroundColor: '#0D0D10',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: Spacing[4],
  },
  crewTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing[3],
  },
  crewName: {
    flex: 1,
    color: Colors.white,
    fontSize: Typography.fontSizes['2xl'],
    fontWeight: Typography.fontWeights.black,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  crewText: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.sm,
    lineHeight: 21,
    marginTop: Spacing[3],
    marginBottom: Spacing[4],
  },
  crewStatsRow: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  crewStatBox: {
    flex: 1,
    backgroundColor: '#151519',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  crewStatNumber: {
    color: Colors.white,
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.black,
  },
  crewStatLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: Typography.fontWeights.bold,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 5,
    textAlign: 'center',
  },
});
