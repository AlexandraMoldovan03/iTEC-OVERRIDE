import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { TeamBadge } from '../../src/components/ui/TeamBadge';
import { useAuthStore } from '../../src/stores/authStore';
import { useVaultStore } from '../../src/stores/vaultStore';
import { MOCK_POSTERS } from '../../src/mock/posters';
import { Colors, Spacing, Typography, Radius } from '../../src/theme';

const { width } = Dimensions.get('window');
const CARD_GAP = 14;
const CARD_WIDTH = (width - Spacing[4] * 2 - CARD_GAP) / 2;

type TeamId = 'minimalist' | 'perfectionist' | 'chaotic';
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
  dominantTeam: TeamId;
  heat: number;
  isHot: boolean;
  myContributionCount: number;
};

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'ALL WALLS' },
  { key: 'recent', label: 'RECENT' },
  { key: 'hot', label: 'HOT' },
  { key: 'myTeam', label: 'MY TEAM' },
];

const TEAM_COLORS: Record<TeamId, string> = {
  minimalist: '#EAEAEA',
  perfectionist: '#12D6FF',
  chaotic: '#FF2E6E',
};

function buildWallPosters(source: any[]): WallPoster[] {
  return source.map((poster: any, index: number) => {
    const dominantTeams: TeamId[] = ['chaotic', 'perfectionist', 'minimalist'];
    const dominantTeam = dominantTeams[index % dominantTeams.length];
    const layerCount = 8 + ((index * 7) % 38);
    const contributorsCount = 2 + (index % 6);
    const heat = 45 + ((index * 13) % 55);

    return {
      id: poster.id,
      title: poster.title ?? poster.name ?? `Poster ${index + 1}`,
      location:
        poster.location?.address ??
        poster.location?.name ??
        'Unknown location',
      thumbnail: poster.thumbnailUri ?? poster.thumbnail ?? undefined,
      scannedAtLabel: `${(index % 6) + 1}d ago`,
      lastActivityLabel: `${(index % 5) + 1}h ago`,
      layerCount,
      contributorsCount,
      dominantTeam,
      heat,
      isHot: heat >= 75,
      myContributionCount: 1 + (index % 5),
    };
  });
}

export default function WallScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { posters: vaultPosters, loadVault } = useVaultStore();

  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  useEffect(() => {
    loadVault();
  }, []);

  const rawPosters = useMemo(() => {
    const source = vaultPosters.length > 0 ? vaultPosters : MOCK_POSTERS;
    return buildWallPosters(source);
  }, [vaultPosters]);

  const filteredPosters = useMemo(() => {
    switch (activeFilter) {
      case 'recent':
        return [...rawPosters].sort((a, b) => b.myContributionCount - a.myContributionCount);
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

  const handleOpenPoster = (posterId: string) => {
    router.push(`/poster/${posterId}`);
  };

  return (
    <ScreenContainer scrollable padded={false} style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.eyebrow}>CITY ARCHIVE // YOUR TAG HISTORY</Text>
        <Text style={styles.title}>YOUR WALL</Text>
        <Text style={styles.subtitle}>
          Every scanned poster lives here with the traces, layers, and chaos
          left behind by everyone who entered the battle.
        </Text>

        {user && (
          <View style={styles.teamBadgeWrap}>
            <TeamBadge teamId={user.teamId} />
          </View>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, styles.statCardWide]}>
          <Text style={styles.statLabel}>SCANNED WALLS</Text>
          <Text style={styles.statValue}>{rawPosters.length}</Text>
          <Text style={styles.statHint}>Your personal city archive</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>LAYERS</Text>
          <Text style={styles.statValue}>{totalLayers}</Text>
          <Text style={styles.statHint}>Marks on the wall</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>ARTISTS</Text>
          <Text style={styles.statValue}>{totalArtists}</Text>
          <Text style={styles.statHint}>Seen in your scans</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>HOT WALLS</Text>
          <Text style={styles.statValue}>{hotWalls}</Text>
          <Text style={styles.statHint}>Still under attack</Text>
        </View>
      </View>

      {/* Filters */}
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

      {/* Intro strip */}
      <View style={styles.infoStrip}>
        <View style={styles.infoDot} />
        <Text style={styles.infoText}>
          Tap any poster to reopen the battle and see what people left on it.
        </Text>
      </View>

      {/* Grid */}
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
  const accent = TEAM_COLORS[poster.dominantTeam];
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
            {poster.isHot ? 'HOT WALL' : 'ARCHIVED'}
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
          <Text style={styles.layersPreviewText}>+{poster.layerCount} layers</Text>
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
          {poster.dominantTeam.toUpperCase()}
        </Text>
      </View>

      <Text style={styles.tileFooter}>
        Scanned {poster.scannedAtLabel}
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