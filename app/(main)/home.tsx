import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ImageBackground,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';

import { useAuthStore } from '../../src/stores/authStore';
import { useVaultStore } from '../../src/stores/vaultStore';
import { PosterCard } from '../../src/components/poster/PosterCard';
import { TeamBadge } from '../../src/components/ui/TeamBadge';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { posterService } from '../../src/services/posterService';
import { Poster } from '../../src/types/poster';
import { PosterLayerItem } from '../../src/types/mural';
import { supabase } from '../../src/lib/supabase';
import { Colors, Spacing, Typography, Radius } from '../../src/theme';
import {
  SCAN_POSTER_IMAGE,
  BACKGROUND2_IMAGE,
} from '../../src/constants/badges';

type PosterLiveStats = {
  layerCount: number;
  contributorsCount: number;
  myContributionCount: number;
  lastActivityAt: string | null;
  heat: number;
  isHot: boolean;
};

const LIVE_BATTLE_WINDOW_MS = 1000 * 60 * 60 * 6; // 6h
const HOT_THRESHOLD = 75;

function timeDiffMs(dateString?: string | null) {
  if (!dateString) return Number.POSITIVE_INFINITY;
  return Date.now() - new Date(dateString).getTime();
}

function deriveHeat(
  layerCount: number,
  contributorsCount: number,
  lastActivityAt: string | null,
) {
  const activityBonus = (() => {
    if (!lastActivityAt) return 0;
    const diff = Date.now() - new Date(lastActivityAt).getTime();

    if (diff <= 60 * 60 * 1000) return 28;
    if (diff <= 3 * 60 * 60 * 1000) return 22;
    if (diff <= 12 * 60 * 60 * 1000) return 14;
    if (diff <= 24 * 60 * 60 * 1000) return 8;
    return 0;
  })();

  return Math.min(100, layerCount * 2 + contributorsCount * 7 + activityBonus + 18);
}

function buildLiveStats(
  poster: Poster,
  layers: PosterLayerItem[],
  currentUserId?: string | null,
): PosterLiveStats {
  const uniqueAuthors = new Set(
    layers.map((l) => l.authorId).filter(Boolean)
  );

  const myContributionCount = currentUserId
    ? layers.filter((l) => l.authorId === currentUserId).length
    : 0;

  const latestLayerAt =
    layers.length > 0
      ? [...layers].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0]?.createdAt ?? null
      : null;

  const lastActivityAt = latestLayerAt ?? poster.territory?.lastActivityAt ?? null;
  const layerCount = layers.length;
  const contributorsCount = uniqueAuthors.size;
  const heat = deriveHeat(layerCount, contributorsCount, lastActivityAt);

  return {
    layerCount,
    contributorsCount,
    myContributionCount,
    lastActivityAt,
    heat,
    isHot: heat >= HOT_THRESHOLD,
  };
}

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { posters: vaultPosters, loadVault } = useVaultStore();

  const [allPosters, setAllPosters] = useState<Poster[]>([]);
  const [postersLoading, setPostersLoading] = useState(true);
  const [layersMap, setLayersMap] = useState<Record<string, PosterLayerItem[]>>({});
  const [liveLoading, setLiveLoading] = useState(true);

  const OPEN_YOUR_WALL_IMAGE = require('../_layout/OpenYourWall.png');

  const fetchAll = useCallback(async () => {
    setPostersLoading(true);
    try {
      const data = await posterService.fetchAll();
      setAllPosters(data);
    } catch (e) {
      console.warn('[home] fetchAll error:', e);
    } finally {
      setPostersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (user?.id) loadVault(user.id);
  }, [user?.id, loadVault]);

  const relevantPosterIds = useMemo(() => {
    const ids = new Set<string>();
    allPosters.forEach((p) => ids.add(p.id));
    vaultPosters.forEach((p) => ids.add(p.id));
    return Array.from(ids);
  }, [allPosters, vaultPosters]);

  const syncPosterLayers = useCallback(async (posterId: string) => {
    try {
      const freshLayers = await posterService.fetchLayers(posterId).catch(() => [] as PosterLayerItem[]);
      setLayersMap((prev) => ({
        ...prev,
        [posterId]: freshLayers,
      }));
    } catch {
      // silent fail
    }
  }, []);

  useEffect(() => {
    if (relevantPosterIds.length === 0) {
      setLayersMap({});
      setLiveLoading(false);
      return;
    }

    let cancelled = false;
    setLiveLoading(true);

    (async () => {
      try {
        const results = await Promise.all(
          relevantPosterIds.map((posterId) =>
            posterService.fetchLayers(posterId).catch(() => [] as PosterLayerItem[])
          )
        );

        if (cancelled) return;

        const nextMap: Record<string, PosterLayerItem[]> = {};
        relevantPosterIds.forEach((posterId, index) => {
          nextMap[posterId] = results[index] ?? [];
        });

        setLayersMap(nextMap);
      } finally {
        if (!cancelled) setLiveLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [relevantPosterIds]);

  useEffect(() => {
    if (relevantPosterIds.length === 0) return;

    const handleRealtime = async (payload: any) => {
      const posterId =
        (payload?.new?.poster_id as string | undefined) ??
        (payload?.old?.poster_id as string | undefined);

      if (!posterId || !relevantPosterIds.includes(posterId)) return;
      await syncPosterLayers(posterId);
    };

    const channel = supabase
      .channel('home_live_layers')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mural_layers' },
        handleRealtime,
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'mural_layers' },
        handleRealtime,
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'mural_layers' },
        handleRealtime,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [relevantPosterIds, syncPosterLayers]);

  const posterStatsMap = useMemo(() => {
    const map: Record<string, PosterLiveStats> = {};

    allPosters.forEach((poster) => {
      map[poster.id] = buildLiveStats(
        poster,
        layersMap[poster.id] ?? [],
        user?.id
      );
    });

    return map;
  }, [allPosters, layersMap, user?.id]);

  const liveBattles = useMemo(() => {
    return allPosters.filter((poster) => {
      const stats = posterStatsMap[poster.id];
      if (!stats?.lastActivityAt) return false;
      return timeDiffMs(stats.lastActivityAt) <= LIVE_BATTLE_WINDOW_MS;
    });
  }, [allPosters, posterStatsMap]);

  const hotWalls = useMemo(() => {
    return allPosters.filter((poster) => posterStatsMap[poster.id]?.isHot);
  }, [allPosters, posterStatsMap]);

  const featuredPoster = useMemo(() => {
    if (vaultPosters.length > 0) {
      return [...vaultPosters].sort((a, b) => {
        const aTime = posterStatsMap[a.id]?.lastActivityAt
          ? new Date(posterStatsMap[a.id].lastActivityAt!).getTime()
          : 0;
        const bTime = posterStatsMap[b.id]?.lastActivityAt
          ? new Date(posterStatsMap[b.id].lastActivityAt!).getTime()
          : 0;
        return bTime - aTime;
      })[0] ?? null;
    }

    return [...allPosters].sort((a, b) => {
      const aHeat = posterStatsMap[a.id]?.heat ?? 0;
      const bHeat = posterStatsMap[b.id]?.heat ?? 0;
      return bHeat - aHeat;
    })[0] ?? null;
  }, [vaultPosters, allPosters, posterStatsMap]);

  const activeBattlePosters = useMemo(() => {
    return [...allPosters]
      .sort((a, b) => {
        const aHeat = posterStatsMap[a.id]?.heat ?? 0;
        const bHeat = posterStatsMap[b.id]?.heat ?? 0;
        return bHeat - aHeat;
      })
      .slice(0, 6);
  }, [allPosters, posterStatsMap]);

  const recentCapturedPosters = useMemo(() => {
    return [...vaultPosters]
      .sort((a, b) => {
        const aTime = posterStatsMap[a.id]?.lastActivityAt
          ? new Date(posterStatsMap[a.id].lastActivityAt!).getTime()
          : 0;
        const bTime = posterStatsMap[b.id]?.lastActivityAt
          ? new Date(posterStatsMap[b.id].lastActivityAt!).getTime()
          : 0;
        return bTime - aTime;
      })
      .slice(0, 3);
  }, [vaultPosters, posterStatsMap]);

  const liveCount = liveBattles.length;
  const wallCount = vaultPosters.length;
  const hotCount = hotWalls.length;

  const handlePosterPress = (poster: Poster) => {
    router.push(`/poster/${poster.id}`);
  };

  const featuredPosterLabel = featuredPoster?.name
    ? featuredPoster.name.toUpperCase()
    : 'UNKNOWN POSTER';

  const featuredHeat = featuredPoster
    ? posterStatsMap[featuredPoster.id]?.heat ?? 0
    : 0;

  return (
    <ScreenContainer scrollable padded={false} style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerIdentity}>
            <Text style={styles.headerEyebrow}>MAKE IT SEEN // CREATIVE TAKEOVER</Text>
            <Text style={styles.headerTitle}>
              Hello, {user?.username?.toUpperCase() ?? 'ARTIST'}
            </Text>
            <Text style={styles.headerSubtitle}>
              Scan real posters. Join live battles. Leave a mark the city remembers.
            </Text>
          </View>
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
          <Text style={styles.heroTitle}>SCAN. CREATE. TAKE OVER.</Text>

          <Text style={styles.heroSubtitle}>
            Make It Seen turns city posters into shared creative battle zones where
            teams compete with style, speed, and presence.
          </Text>

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

          <View style={styles.heroActions}>
            <TouchableOpacity
              activeOpacity={0.88}
              style={styles.heroActionPrimary}
              onPress={() => router.push('/(main)/vault')}
            >
              <Image
                source={OPEN_YOUR_WALL_IMAGE}
                style={styles.heroActionImage}
                resizeMode="contain"
              />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.88}
              style={styles.heroActionSecondary}
              onPress={() => router.push('/(main)/vault')}
            />
          </View>
        </View>
      </ImageBackground>

      {featuredPoster && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionDot, { backgroundColor: Colors.accentYellow }]} />
            <Text style={[styles.sectionTitle, { color: Colors.accentYellow }]}>
              {wallCount > 0 ? 'LAST ACTIVE ON YOUR WALL' : "CITY SPOTLIGHT"}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.spotlightCard}
            activeOpacity={0.9}
            onPress={() => handlePosterPress(featuredPoster)}
          >
            <View style={styles.spotlightTopRow}>
              <View style={styles.spotlightPill}>
                <Text style={styles.spotlightPillText}>
                  {wallCount > 0 ? 'YOUR WALL' : 'TRENDING WALL'}
                </Text>
              </View>
              <Text style={styles.spotlightLive}>
                {posterStatsMap[featuredPoster.id]?.isHot ? 'HOT NOW' : 'LIVE'}
              </Text>
            </View>

            <Text style={styles.spotlightTitle} numberOfLines={1}>
              {featuredPosterLabel}
            </Text>

            {featuredPoster.location?.label ? (
              <Text style={styles.spotlightLocation} numberOfLines={1}>
                📍 {featuredPoster.location.label}
              </Text>
            ) : null}

            <Text style={styles.spotlightText}>
              {wallCount > 0
                ? 'Reopen the most active wall from your collection, keep painting, or defend it before another team pushes harder.'
                : 'This is one of the strongest active walls in the city right now. Jump in and help your crew take over.'}
            </Text>

            <View style={styles.spotlightStats}>
              <View style={styles.spotlightStat}>
                <Text style={styles.spotlightStatLabel}>HEAT</Text>
                <Text style={styles.spotlightStatValue}>{featuredHeat}%</Text>
              </View>
              <View style={styles.spotlightStat}>
                <Text style={styles.spotlightStatLabel}>LAYERS</Text>
                <Text style={styles.spotlightStatValue}>
                  {posterStatsMap[featuredPoster.id]?.layerCount ?? 0}
                </Text>
              </View>
              <View style={styles.spotlightStat}>
                <Text style={styles.spotlightStatLabel}>YOUR SCANS</Text>
                <Text style={styles.spotlightStatValue}>{wallCount}</Text>
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
          These are the most active posters right now based on real layers, contributors,
          and recent wall activity.
        </Text>

        {(postersLoading || liveLoading) && allPosters.length === 0 ? (
          <ActivityIndicator color={Colors.accentGreen} style={{ marginTop: Spacing[4] }} />
        ) : activeBattlePosters.length === 0 ? (
          <View style={styles.emptyBattles}>
            <Text style={styles.emptyBattlesText}>No active battles detected right now.</Text>
            <TouchableOpacity onPress={() => router.push('/scanner')}>
              <Text style={[styles.emptyBattlesText, { color: Colors.accentCyan, marginTop: 6 }]}>
                Start one by scanning a poster →
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={activeBattlePosters}
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
        )}
      </View>

      {recentCapturedPosters.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionDot, { backgroundColor: Colors.accentCyan }]} />
            <Text style={[styles.sectionTitle, { color: Colors.accentCyan }]}>
              RECENTLY CAPTURED
            </Text>
          </View>

          <Text style={styles.sectionDescription}>
            Your scanned posters, ordered by live activity and recent movement.
          </Text>

          {recentCapturedPosters.map((p) => (
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
            {user?.teamId && <TeamBadge teamId={user.teamId} />}
          </View>

          <Text style={styles.crewText}>
            Your presence grows with every scan and every layer your team leaves behind.
            The home screen now reflects live wall pressure across the city.
          </Text>

          <View style={styles.crewStatsRow}>
            <View style={styles.crewStatBox}>
              <Text style={styles.crewStatNumber}>{wallCount}</Text>
              <Text style={styles.crewStatLabel}>SCANNED WALLS</Text>
            </View>

            <View style={styles.crewStatBox}>
              <Text style={styles.crewStatNumber}>{liveCount}</Text>
              <Text style={styles.crewStatLabel}>LIVE BATTLES</Text>
            </View>

            <View style={styles.crewStatBox}>
              <Text style={styles.crewStatNumber}>{hotCount}</Text>
              <Text style={styles.crewStatLabel}>HOT ZONES</Text>
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
    fontSize: Typography.fontSizes['2xl'] + 8,
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
    fontSize: Typography.fontSizes.lg,
    lineHeight: 21,
    maxWidth: '92%',
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
    alignItems: 'center',
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
    fontSize: Typography.fontSizes.md,
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
    height: 160,
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
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.black,
    letterSpacing: Typography.letterSpacing.wider,
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
  emptyBattles: {
    paddingVertical: Spacing[5],
    alignItems: 'center',
  },
  emptyBattlesText: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.sm,
    textAlign: 'center',
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