/**
 * app/(main)/map.tsx
 * Floor treasure hunt map.
 *
 * Features:
 * - real floor image background
 * - 10 numbered hunt points
 * - locked/unlocked state based on vaultStore.hasScanned(poster.id)
 * - locked points show lock icon
 * - unlocked points show check icon
 * - selected point pulses
 * - unlocked points open poster room
 * - locked points redirect to scanner
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';

import { posterService } from '../../src/services/posterService';
import { Poster } from '../../src/types/poster';
import { useVaultStore } from '../../src/stores/vaultStore';
import { Colors, Spacing, Radius, Typography } from '../../src/theme';
import { TeamBadge } from '../../src/components/ui/TeamBadge';
import { HeatBar } from '../../src/components/ui/HeatBar';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { TeamId } from '../../src/types/team';
import { TEAM_COLORS } from '../../src/theme/colors';
import { timeAgo } from '../../src/utils/timeUtils';

const FLOOR_MAP = require('../_layout/floorMap.png');

type HuntPointLayout = {
  slot: number;
  x: number; // 0..1
  y: number; // 0..1
};

type HuntPoint = HuntPointLayout & {
  poster: Poster;
};

const POINT_LAYOUTS: HuntPointLayout[] = [
  { slot: 1, x: 0.16, y: 0.34 },
  { slot: 2, x: 0.19, y: 0.76 },
  { slot: 3, x: 0.35, y: 0.69 },
  { slot: 4, x: 0.49, y: 0.70 },
  { slot: 5, x: 0.67, y: 0.60 },
  { slot: 6, x: 0.80, y: 0.73 },
  { slot: 7, x: 0.78, y: 0.22 },
  { slot: 8, x: 0.90, y: 0.42 },
  { slot: 9, x: 0.77, y: 0.54 },
  { slot: 10, x: 0.27, y: 0.53 },
];

function formatSlot(slot: number) {
  return slot.toString().padStart(2, '0');
}

function sortPostersForMap(posters: Poster[]) {
  return [...posters].sort((a, b) => a.name.localeCompare(b.name));
}

function getTeamAccent(poster: Poster, unlocked: boolean) {
  if (!unlocked) {
    return {
      primary: '#555e6f',
      border: '#8e98aa',
      glow: '#555e6f',
      text: '#dfe4ec',
    };
  }

  if (!poster.territory.ownerTeamId) {
    return {
      primary: '#1fdc72',
      border: '#98f4bc',
      glow: '#1fdc72',
      text: '#ffffff',
    };
  }

  const tc = TEAM_COLORS[poster.territory.ownerTeamId as TeamId];

  return {
    primary: tc.primary,
    border: tc.primary,
    glow: tc.glow ?? tc.primary,
    text: '#ffffff',
  };
}

function HuntNode({
  point,
  selected,
  unlocked,
  onPress,
}: {
  point: HuntPoint;
  selected: boolean;
  unlocked: boolean;
  onPress: () => void;
}) {
  const pulse = useRef(new Animated.Value(1)).current;
  const accent = getTeamAccent(point.poster, unlocked);

  useEffect(() => {
    if (!selected) {
      pulse.setValue(1);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.12,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [selected, pulse]);

  return (
    <Animated.View
      style={[
        styles.nodeWrap,
        {
          left: `${point.x * 100}%`,
          top: `${point.y * 100}%`,
          transform: [{ scale: pulse }],
        },
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        style={[
          styles.node,
          {
            backgroundColor: unlocked ? accent.primary : 'rgba(58, 64, 78, 0.96)',
            borderColor: selected ? '#ffffff' : accent.border,
            shadowColor: accent.glow,
          },
          unlocked && styles.nodeUnlocked,
          selected && styles.nodeSelected,
        ]}
      >
        <Text style={styles.nodeNumber}>{formatSlot(point.slot)}</Text>

        <View style={styles.nodeIconWrap}>
          <Text style={styles.nodeIcon}>{unlocked ? '✓' : '🔒'}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function MapScreen() {
  const router = useRouter();
  const vaultStore = useVaultStore();

  const [posters, setPosters] = useState<Poster[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPosterId, setSelectedPosterId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const data = await posterService.fetchAll();
        if (!mounted) return;

        const firstTen = sortPostersForMap(data).slice(0, 10);
        setPosters(firstTen);

        if (firstTen.length > 0) {
          setSelectedPosterId(firstTen[0].id);
        }
      } catch (err) {
        console.warn('[map] failed to load posters', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const huntPoints: HuntPoint[] = useMemo(() => {
    return posters.slice(0, 10).map((poster, index) => ({
      ...POINT_LAYOUTS[index],
      poster,
    }));
  }, [posters]);

  const unlockedCount = useMemo(() => {
    return huntPoints.filter((point) => vaultStore.hasScanned(point.poster.id)).length;
  }, [huntPoints, vaultStore]);

  const selectedPoint =
    huntPoints.find((point) => point.poster.id === selectedPosterId) ?? huntPoints[0] ?? null;

  const selectedUnlocked = selectedPoint
    ? vaultStore.hasScanned(selectedPoint.poster.id)
    : false;

  return (
    <ScreenContainer scrollable padded={false}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>TREASURE HUNT</Text>
          <Text style={styles.title}>Floor Map</Text>
          <Text style={styles.subtitle}>
            Find and scan the real posters to unlock all 10 points on the map.
          </Text>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressTopRow}>
            <Text style={styles.progressLabel}>HUNT PROGRESS</Text>
            <Text style={styles.progressValue}>{unlockedCount} / 10</Text>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${(unlockedCount / 10) * 100}%` },
              ]}
            />
          </View>

          <Text style={styles.progressHint}>
            Scan a poster in the real world to unlock its point here.
          </Text>
        </View>

        <View style={styles.mapWrap}>
          <Image source={FLOOR_MAP} style={styles.mapImage} resizeMode="cover" />
          <View style={styles.mapOverlayShade} />

          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator color={Colors.accentPurple} size="large" />
              <Text style={styles.loadingText}>Loading hunt map...</Text>
            </View>
          )}

          {!loading &&
            huntPoints.map((point) => {
              const unlocked = vaultStore.hasScanned(point.poster.id);
              const selected = selectedPosterId === point.poster.id;

              return (
                <HuntNode
                  key={point.poster.id}
                  point={point}
                  unlocked={unlocked}
                  selected={selected}
                  onPress={() => setSelectedPosterId(point.poster.id)}
                />
              );
            })}

          {!loading && huntPoints.length === 0 && (
            <View style={styles.emptyOverlay}>
              <Text style={styles.emptyTitle}>No posters found</Text>
              <Text style={styles.emptyText}>
                Add at least 10 posters in your data source to build the treasure hunt.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: 'rgba(58, 64, 78, 0.96)' }]} />
            <Text style={styles.legendText}>Locked</Text>
          </View>

          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: '#1fdc72' }]} />
            <Text style={styles.legendText}>Unlocked</Text>
          </View>

          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendSwatch,
                {
                  backgroundColor: '#1fdc72',
                  borderWidth: 2,
                  borderColor: '#ffffff',
                },
              ]}
            />
            <Text style={styles.legendText}>Selected</Text>
          </View>
        </View>

        {selectedPoint && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Text style={styles.cardEyebrow}>POINT {formatSlot(selectedPoint.slot)}</Text>
                <Text style={styles.cardTitle}>{selectedPoint.poster.name}</Text>

                {selectedPoint.poster.location && (
                  <Text style={styles.cardLocation}>
                    📍 {selectedPoint.poster.location.label}
                  </Text>
                )}
              </View>

              {selectedUnlocked && selectedPoint.poster.territory.ownerTeamId ? (
                <TeamBadge
                  teamId={selectedPoint.poster.territory.ownerTeamId}
                  size="sm"
                />
              ) : (
                <View
                  style={[
                    styles.statusBadge,
                    selectedUnlocked ? styles.unlockedBadge : styles.lockedBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      selectedUnlocked ? styles.unlockedBadgeText : styles.lockedBadgeText,
                    ]}
                  >
                    {selectedUnlocked ? 'UNLOCKED' : 'LOCKED'}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.metaRow}>
              <View style={styles.metaBox}>
                <Text style={styles.metaLabel}>Status</Text>
                <Text style={styles.metaValue}>
                  {selectedUnlocked ? 'Discovered' : 'Needs scan'}
                </Text>
              </View>

              <View style={styles.metaBox}>
                <Text style={styles.metaLabel}>Last activity</Text>
                <Text style={styles.metaValue}>
                  {timeAgo(selectedPoint.poster.territory.lastActivityAt)}
                </Text>
              </View>
            </View>

            <HeatBar
              heat={selectedPoint.poster.territory.heat}
              showLabel={false}
              style={styles.heatBar}
            />

            <View style={styles.actionRow}>
              {selectedUnlocked ? (
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => router.push(`/poster/${selectedPoint.poster.id}`)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryBtnText}>ENTER POSTER ROOM</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => router.push('/scanner')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryBtnText}>SCAN TO UNLOCK</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => setSelectedPosterId(null)}
                activeOpacity={0.85}
              >
                <Text style={styles.secondaryBtnText}>CLEAR</Text>
              </TouchableOpacity>
            </View>

            {!selectedUnlocked && (
              <View style={styles.hintBox}>
                <Text style={styles.hintText}>
                  This point is still locked. Scan its real poster to unlock it on the treasure map.
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bg,
    padding: Spacing[4],
    paddingBottom: Spacing[8],
  },

  header: {
    marginBottom: Spacing[4],
    gap: Spacing[1],
  },
  eyebrow: {
    color: Colors.accentGreen,
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.black,
    letterSpacing: Typography.letterSpacing.widest,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes['2xl'],
    fontWeight: Typography.fontWeights.black,
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.sm,
    lineHeight: 20,
    maxWidth: 340,
  },

  progressCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[4],
    marginBottom: Spacing[4],
    gap: Spacing[2],
  },
  progressTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressLabel: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.black,
    letterSpacing: Typography.letterSpacing.widest,
  },
  progressValue: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.black,
  },
  progressTrack: {
    height: 10,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgSurface,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radius.full,
    backgroundColor: Colors.accentGreen,
  },
  progressHint: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs,
  },

  mapWrap: {
    position: 'relative',
    height: 470,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing[3],
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  mapOverlayShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 10, 14, 0.12)',
  },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[3],
    backgroundColor: 'rgba(8, 10, 14, 0.35)',
  },
  loadingText: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
  },

  emptyOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing[6],
    backgroundColor: 'rgba(8, 10, 14, 0.45)',
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.black,
    marginBottom: Spacing[2],
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.sm,
    textAlign: 'center',
    lineHeight: 20,
  },

  nodeWrap: {
    position: 'absolute',
    marginLeft: -18,
    marginTop: -18,
  },
  node: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  nodeUnlocked: {
    shadowRadius: 14,
    elevation: 10,
  },
  nodeSelected: {
    borderWidth: 2.4,
  },
  nodeNumber: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  nodeIconWrap: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#0f1319',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeIcon: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 12,
  },

  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[4],
    marginBottom: Spacing[3],
    paddingHorizontal: Spacing[1],
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  legendSwatch: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderColor: 'transparent',
  },
  legendText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.sm,
  },

  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[4],
    gap: Spacing[3],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing[3],
  },
  cardHeaderLeft: {
    flex: 1,
  },
  cardEyebrow: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.black,
    letterSpacing: Typography.letterSpacing.widest,
    marginBottom: 4,
  },
  cardTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.black,
  },
  cardLocation: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.sm,
    marginTop: 4,
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  lockedBadge: {
    backgroundColor: 'rgba(70, 76, 88, 0.16)',
    borderColor: '#70798a',
  },
  unlockedBadge: {
    backgroundColor: 'rgba(31, 220, 114, 0.12)',
    borderColor: '#1fdc72',
  },
  statusBadgeText: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.black,
    letterSpacing: Typography.letterSpacing.wide,
  },
  lockedBadgeText: {
    color: '#c3c9d4',
  },
  unlockedBadgeText: {
    color: '#1fdc72',
  },

  metaRow: {
    flexDirection: 'row',
    gap: Spacing[3],
  },
  metaBox: {
    flex: 1,
    backgroundColor: Colors.bgSurface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[3],
  },
  metaLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 4,
  },
  metaValue: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
  },
  heatBar: {
    marginTop: 2,
  },

  actionRow: {
    flexDirection: 'row',
    gap: Spacing[3],
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: Colors.accentPurple,
    paddingVertical: Spacing[3],
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.black,
    letterSpacing: Typography.letterSpacing.wide,
  },
  secondaryBtn: {
    paddingHorizontal: Spacing[4],
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.borderBright,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bgSurface,
  },
  secondaryBtnText: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.black,
    letterSpacing: Typography.letterSpacing.wide,
  },

  hintBox: {
    backgroundColor: Colors.bgSurface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[3],
  },
  hintText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.sm,
    lineHeight: 20,
  },
});