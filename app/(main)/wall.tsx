import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { TeamBadge } from '../../src/components/ui/TeamBadge';
import { useAuthStore } from '../../src/stores/authStore';
import { useVaultStore } from '../../src/stores/vaultStore';
import { Colors, Spacing, Typography, Radius } from '../../src/theme';
import { supabase } from '../../src/lib/supabase';
import { posterService } from '../../src/services/posterService';
import { Poster } from '../../src/types/poster';
import { PosterLayerItem } from '../../src/types/mural';
import { TeamId } from '../../src/types/team';
import { computePlayerScores, computeTeamScores } from '../../src/utils/scoring';

const { width } = Dimensions.get('window');
const CARD_GAP = 14;
const CARD_WIDTH = (width - Spacing[4] * 2 - CARD_GAP) / 2;

type FilterKey = 'all' | 'recent' | 'hot' | 'myTeam';

type WallPoster = {
  id: string;
  title: string;
  location: string;
  thumbnail?: string | number;
  scannedAtLabel: string;
  lastActivityLabel: string;
  layerCount: number;
  contributorsCount: number;
  dominantTeam: TeamId | null;
  heat: number;
  isHot: boolean;
  myContributionCount: number;
  lastActivityAt: string | null;
};

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'ALL WALLS' },
  { key: 'recent', label: 'RECENT' },
  { key: 'hot', label: 'HOT' },
  { key: 'myTeam', label: 'MY TEAM' },
];

const TEAM_ACCENTS: Record<TeamId, string> = {
  minimalist: '#EAEAEA',
  perfectionist: '#12D6FF',
  chaotic: '#FF2E6E',
};

function timeAgoShort(dateString?: string | null) {
  if (!dateString) return 'just now';

  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = Math.max(0, now - then);

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return 'now';
  if (diffMs < hour) return `${Math.floor(diffMs / minute)}m ago`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)}h ago`;
  return `${Math.floor(diffMs / day)}d ago`;
}

function deriveHeat(layerCount: number, contributorsCount: number, lastActivityAt: string | null) {
  const activityBonus = (() => {
    if (!lastActivityAt) return 0;
    const diff = Date.now() - new Date(lastActivityAt).getTime();
    if (diff <= 60 * 60 * 1000) return 28;
    if (diff <= 3 * 60 * 60 * 1000) return 22;
    if (diff <= 12 * 60 * 60 * 1000) return 14;
    if (diff <= 24 * 60 * 60 * 1000) return 8;
    return 0;
  })();

  const raw = Math.min(
    100,
    layerCount * 2 + contributorsCount * 7 + activityBonus + 18
  );

  return raw;
}

function getDominantTeam(layers: PosterLayerItem[]): TeamId | null {
  if (!layers.length) return null;
  const scores = computeTeamScores(layers);
  return (scores[0]?.teamId as TeamId | undefined) ?? null;
}

function buildWallPoster(
  poster: Poster,
  layers: PosterLayerItem[],
  currentUserId?: string | null,
): WallPoster {
  const uniqueAuthors = new Set(
    layers
      .map((l) => l.authorId)
      .filter(Boolean)
  );

  const myContributionCount = currentUserId
    ? layers.filter((l) => l.authorId === currentUserId).length
    : 0;

  const lastActivityAt =
    layers.length > 0
      ? [...layers]
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )[0]?.createdAt ?? poster.territory?.lastActivityAt ?? null
      : poster.territory?.lastActivityAt ?? null;

  const layerCount = layers.length;
  const contributorsCount = uniqueAuthors.size;
  const dominantTeam = getDominantTeam(layers);
  const heat = deriveHeat(layerCount, contributorsCount, lastActivityAt);
  const isHot = heat >= 75;

  return {
    id: poster.id,
    title: poster.name ?? 'Untitled poster',
    location: poster.location?.label ?? 'Unknown location',
    thumbnail: poster.referenceImageUrl ?? poster.thumbnailUri ?? undefined,
    scannedAtLabel: 'Unlocked',
    lastActivityLabel: timeAgoShort(lastActivityAt),
    layerCount,
    contributorsCount,
    dominantTeam,
    heat,
    isHot,
    myContributionCount,
    lastActivityAt,
  };
}

export default function WallScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { posters: vaultPosters, loadVault } = useVaultStore();

  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [layersMap, setLayersMap] = useState<Record<string, PosterLayerItem[]>>({});
  const [loadingLive, setLoadingLive] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadVault(user.id);
    }
  }, [user?.id, loadVault]);

  const syncPosterLayers = useCallback(async (posterId: string) => {
    try {
      const layers = await posterService.fetchLayers(posterId).catch(() => [] as PosterLayerItem[]);
      setLayersMap((prev) => ({
        ...prev,
        [posterId]: layers,
      }));
    } catch {
      // silent fail
    }
  }, []);

  useEffect(() => {
    if (vaultPosters.length === 0) {
      setLayersMap({});
      setLoadingLive(false);
      return;
    }

    let cancelled = false;
    setLoadingLive(true);

    (async () => {
      try {
        const results = await Promise.all(
          vaultPosters.map((poster) =>
            posterService.fetchLayers(poster.id).catch(() => [] as PosterLayerItem[])
          )
        );

        if (cancelled) return;

        const nextMap: Record<string, PosterLayerItem[]> = {};
        vaultPosters.forEach((poster, index) => {
          nextMap[poster.id] = results[index] ?? [];
        });

        setLayersMap(nextMap);
      } finally {
        if (!cancelled) setLoadingLive(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [vaultPosters]);

  useEffect(() => {
    if (vaultPosters.length === 0) return;

    const posterIds = vaultPosters.map((p) => p.id);

    const handleRealtime = async (payload: any) => {
      const posterId =
        (payload?.new?.poster_id as string | undefined) ??
        (payload?.old?.poster_id as string | undefined);

      if (!posterId || !posterIds.includes(posterId)) return;
      await syncPosterLayers(posterId);
    };

    const channel = supabase
      .channel('wall_live_layers')
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
  }, [vaultPosters, syncPosterLayers]);

  const rawPosters = useMemo(() => {
    return vaultPosters.map((poster) =>
      buildWallPoster(poster, layersMap[poster.id] ?? [], user?.id)
    );
  }, [vaultPosters, layersMap, user?.id]);

  const filteredPosters = useMemo(() => {
    switch (activeFilter) {
      case 'recent':
        return [...rawPosters].sort((a, b) => {
          const aTime = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
          const bTime = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
          return bTime - aTime;
        });

      case 'hot':
        return rawPosters
          .filter((p) => p.isHot)
          .sort((a, b) => b.heat - a.heat);

      case 'myTeam':
        return rawPosters.filter((p) => p.dominantTeam === user?.teamId);

      case 'all':
      default:
        return rawPosters;
    }
  }, [activeFilter, rawPosters, user?.teamId]);

  const totalLayers = rawPosters.reduce((sum, p) => sum + p.layerCount, 0);
  const totalArtists = rawPosters.reduce((sum, p) => sum + p.contributorsCount, 0);
  const hotWalls = rawPosters.filter((p) => p.isHot).length;
  const totalMyTags = rawPosters.reduce((sum, p) => sum + p.myContributionCount, 0);

  const handleOpenPoster = (posterId: string) => {
    router.push(`/poster/${posterId}`);
  };

  return (
    <ScreenContainer scrollable padded={false} style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>CITY ARCHIVE // LIVE WALL DATA</Text>
        <Text style={styles.title}>YOUR WALL</Text>
        <Text style={styles.subtitle}>
          Every scanned poster is tracked here with live layers, contributors,
          team dominance, and recent wall activity.
        </Text>

        {user?.teamId && (
          <View style={styles.teamBadgeWrap}>
            <TeamBadge teamId={user.teamId} />
          </View>
        )}
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, styles.statCardWide]}>
          <Text style={styles.statLabel}>SCANNED WALLS</Text>
          <Text style={styles.statValue}>{rawPosters.length}</Text>
          <Text style={styles.statHint}>Unlocked by your scans</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>LAYERS</Text>
          <Text style={styles.statValue}>{totalLayers}</Text>
          <Text style={styles.statHint}>Live mural layers</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>ARTISTS</Text>
          <Text style={styles.statValue}>{totalArtists}</Text>
          <Text style={styles.statHint}>Unique contributors</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>HOT WALLS</Text>
          <Text style={styles.statValue}>{hotWalls}</Text>
          <Text style={styles.statHint}>High activity zones</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, styles.statCardWide]}>
          <Text style={styles.statLabel}>YOUR TAGS</Text>
          <Text style={styles.statValue}>{totalMyTags}</Text>
          <Text style={styles.statHint}>Your visible contribution count</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>SYNC</Text>
          <Text style={[styles.statValue, { fontSize: Typography.fontSizes.lg }]}>
            {loadingLive ? 'LIVE...' : 'LIVE'}
          </Text>
          <Text style={styles.statHint}>Realtime updates enabled</Text>
        </View>
      </View>

      <View style={styles.filtersWrap}>
        <FlatList
          horizontal
          data={FILTERS}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
          renderItem={({ item }) => {
            const active = item.key === activeFilter;
            return (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setActiveFilter(item.key)}
                style={[
                  styles.filterChip,
                  active && styles.filterChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    active && styles.filterChipTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      <View style={styles.infoStrip}>
        <View style={styles.infoDot} />
        <Text style={styles.infoText}>
          This page updates from live mural data. Tap a poster to jump back into the battle room.
        </Text>
      </View>

      {loadingLive && rawPosters.length === 0 ? (
        <View style={styles.loadingBlock}>
          <ActivityIndicator color={Colors.accentPurple} size="large" />
          <Text style={styles.loadingBlockText}>Loading wall intelligence...</Text>
        </View>
      ) : (
        <View style={styles.gridWrap}>
          <FlatList
            data={filteredPosters}
            keyExtractor={(item) => item.id}
            numColumns={2}
            scrollEnabled={false}
            columnWrapperStyle={styles.column}
            contentContainerStyle={styles.gridContent}
            renderItem={({ item, index }) => (
              <WallPosterTile
                poster={item}
                index={index}
                onPress={() => handleOpenPoster(item.id)}
              />
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>NO WALLS HERE YET</Text>
                <Text style={styles.emptyText}>
                  Scan your first poster and start building your archive.
                </Text>
                <TouchableOpacity
                  style={styles.emptyBtn}
                  onPress={() => router.push('/scanner')}
                >
                  <Text style={styles.emptyBtnText}>SCAN A POSTER</Text>
                </TouchableOpacity>
              </View>
            }
          />
        </View>
      )}

      <View style={{ height: Spacing[8] }} />
    </ScreenContainer>
  );
}

function WallPosterTile({
  poster,
  index,
  onPress,
}: {
  poster: WallPoster;
  index: number;
  onPress: () => void;
}) {
  const accent = poster.dominantTeam ? TEAM_ACCENTS[poster.dominantTeam] : '#8A93A3';
  const rotated = index % 2 === 0 ? '-2deg' : '2deg';

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={[
        styles.tile,
        {
          borderColor: `${accent}55`,
          transform: [{ rotate: rotated }],
        },
      ]}
    >
      <View style={[styles.tileGlow, { backgroundColor: `${accent}18` }]} />

      <View style={styles.tileTop}>
        <View style={[styles.statusPill, { borderColor: accent }]}>
          <Text style={[styles.statusPillText, { color: accent }]}>
            {poster.isHot ? 'HOT WALL' : 'LIVE ARCHIVE'}
          </Text>
        </View>
        <Text style={styles.tileTime}>{poster.lastActivityLabel}</Text>
      </View>

      <View style={styles.thumbnailWrap}>
        {poster.thumbnail ? (
          <Image
            source={
              typeof poster.thumbnail === 'string'
                ? { uri: poster.thumbnail }
                : poster.thumbnail
            }
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.fakePoster}>
            <Text style={styles.fakePosterText}>POSTER</Text>
            <View style={styles.fakeTagsRow}>
              <View style={[styles.fakeTag, { backgroundColor: accent }]} />
              <View style={[styles.fakeTag, { backgroundColor: Colors.accentPurple }]} />
              <View style={[styles.fakeTag, { backgroundColor: Colors.accentGreen }]} />
            </View>
          </View>
        )}

        <View style={styles.layersPreview}>
          <Text style={styles.layersPreviewText}>{poster.layerCount} layers</Text>
        </View>
      </View>

      <Text style={styles.tileTitle} numberOfLines={2}>
        {poster.title}
      </Text>

      <Text style={styles.tileLocation} numberOfLines={1}>
        {poster.location}
      </Text>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Text style={styles.metaValue}>{poster.contributorsCount}</Text>
          <Text style={styles.metaLabel}>artists</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaValue}>{poster.myContributionCount}</Text>
          <Text style={styles.metaLabel}>your tags</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaValue}>{poster.heat}%</Text>
          <Text style={styles.metaLabel}>heat</Text>
        </View>
      </View>

      <View style={styles.teamRow}>
        <View style={[styles.teamLine, { backgroundColor: accent }]} />
        <Text style={[styles.teamText, { color: accent }]}>
          {poster.dominantTeam ? poster.dominantTeam.toUpperCase() : 'CONTESTED'}
        </Text>
      </View>

      <Text style={styles.tileFooter}>
        Last active {poster.lastActivityLabel}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: Colors.bg,
  },

  header: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[6],
    paddingBottom: Spacing[4],
  },
  eyebrow: {
    color: Colors.accentPink,
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.black,
    letterSpacing: Typography.letterSpacing.widest,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    color: Colors.white,
    fontSize: Typography.fontSizes['4xl'],
    fontWeight: Typography.fontWeights.black,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    textShadowColor: Colors.accentPurple,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.sm,
    lineHeight: 21,
    marginTop: 10,
    maxWidth: '95%',
  },
  teamBadgeWrap: {
    marginTop: Spacing[3],
    alignSelf: 'flex-start',
  },

  statsRow: {
    flexDirection: 'row',
    gap: Spacing[3],
    paddingHorizontal: Spacing[4],
    marginBottom: Spacing[3],
  },
  statCard: {
    flex: 1,
    minHeight: 96,
    backgroundColor: '#0D0D10',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 22,
    padding: 14,
  },
  statCardWide: {
    flex: 1.3,
  },
  statLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: Typography.fontWeights.bold,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  statValue: {
    color: Colors.white,
    fontSize: Typography.fontSizes['2xl'],
    fontWeight: Typography.fontWeights.black,
    marginTop: 8,
  },
  statHint: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 6,
  },

  filtersWrap: {
    marginTop: Spacing[1],
    marginBottom: Spacing[3],
  },
  filtersContent: {
    paddingHorizontal: Spacing[4],
    gap: 10,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#111114',
  },
  filterChipActive: {
    backgroundColor: Colors.accentPurple,
    borderColor: Colors.accentPurple,
    shadowColor: Colors.accentPurple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
  },
  filterChipText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: Typography.fontWeights.black,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  filterChipTextActive: {
    color: Colors.white,
  },

  infoStrip: {
    marginHorizontal: Spacing[4],
    marginBottom: Spacing[4],
    borderRadius: 18,
    backgroundColor: '#0F1114',
    borderWidth: 1,
    borderColor: 'rgba(18,214,255,0.18)',
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: Colors.accentCyan,
    shadowColor: Colors.accentCyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  infoText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },

  loadingBlock: {
    marginHorizontal: Spacing[4],
    marginTop: 20,
    backgroundColor: '#0D0D10',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 24,
    alignItems: 'center',
    gap: 14,
  },
  loadingBlockText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.sm,
  },

  gridWrap: {
    paddingHorizontal: Spacing[4],
  },
  gridContent: {
    paddingBottom: 8,
  },
  column: {
    justifyContent: 'space-between',
    marginBottom: CARD_GAP,
  },

  tile: {
    width: CARD_WIDTH,
    backgroundColor: '#0B0B0E',
    borderRadius: 24,
    borderWidth: 1,
    padding: 12,
    overflow: 'hidden',
  },
  tileGlow: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 999,
    top: -34,
    right: -26,
  },
  tileTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusPill: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: Typography.fontWeights.black,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  tileTime: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: Typography.fontWeights.bold,
  },

  thumbnailWrap: {
    marginTop: 12,
    marginBottom: 12,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: 124,
    borderRadius: 18,
  },
  fakePoster: {
    height: 124,
    borderRadius: 18,
    backgroundColor: '#141419',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  fakePosterText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: Typography.fontWeights.black,
    letterSpacing: 1.4,
  },
  fakeTagsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  fakeTag: {
    width: 22,
    height: 8,
    borderRadius: 999,
  },
  layersPreview: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  layersPreviewText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: Typography.fontWeights.black,
    letterSpacing: 0.8,
  },

  tileTitle: {
    color: Colors.white,
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.black,
    lineHeight: 22,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    minHeight: 44,
  },
  tileLocation: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 6,
    marginBottom: 12,
  },

  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  metaItem: {
    flex: 1,
    backgroundColor: '#131319',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  metaValue: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: Typography.fontWeights.black,
  },
  metaLabel: {
    color: Colors.textMuted,
    fontSize: 9,
    textTransform: 'uppercase',
    marginTop: 4,
    letterSpacing: 0.8,
  },

  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  teamLine: {
    width: 18,
    height: 4,
    borderRadius: 999,
  },
  teamText: {
    fontSize: 11,
    fontWeight: Typography.fontWeights.black,
    letterSpacing: 1,
  },

  tileFooter: {
    color: Colors.textMuted,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  emptyState: {
    marginTop: 30,
    backgroundColor: '#0D0D10',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 20,
    alignItems: 'center',
  },
  emptyTitle: {
    color: Colors.white,
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.black,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  emptyText: {
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
  },
  emptyBtn: {
    marginTop: 16,
    backgroundColor: Colors.accentPurple,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  emptyBtnText: {
    color: Colors.white,
    fontWeight: Typography.fontWeights.black,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});