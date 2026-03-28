/**
 * app/(main)/map.tsx
 * Tactical world map / control board for poster territories.
 *
 * Expo Go friendly:
 * - no native map dependency
 * - uses a stylized "radar / territory map" board
 * - deterministic node placement per poster
 * - node size/glow based on heat + activity
 * - selectable poster nodes with details panel
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';

import { posterService } from '../../src/services/posterService';
import { Poster } from '../../src/types/poster';
import { TeamBadge } from '../../src/components/ui/TeamBadge';
import { HeatBar } from '../../src/components/ui/HeatBar';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { TEAM_COLORS } from '../../src/theme/colors';
import { Colors, Spacing, Radius, Typography } from '../../src/theme';
import { TeamId } from '../../src/types/team';
import { timeAgo } from '../../src/utils/timeUtils';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

type SortMode = 'heat' | 'recent' | 'name';

const MAP_POINTS = [
  { top: '18%', left: '14%' },
  { top: '26%', left: '38%' },
  { top: '20%', left: '64%' },
  { top: '40%', left: '78%' },
  { top: '52%', left: '58%' },
  { top: '62%', left: '30%' },
  { top: '72%', left: '70%' },
  { top: '48%', left: '16%' },
  { top: '34%', left: '54%' },
  { top: '66%', left: '48%' },
];

function hashString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function getPosterPosition(poster: Poster) {
  const key = `${poster.id}-${poster.location?.label ?? poster.name}`;
  const index = hashString(key) % MAP_POINTS.length;
  return MAP_POINTS[index];
}

function getPosterTeamColor(poster: Poster) {
  if (!poster.territory.ownerTeamId) {
    return {
      primary: Colors.textMuted,
      glow: Colors.textMuted,
    };
  }
  return TEAM_COLORS[poster.territory.ownerTeamId as TeamId];
}

function getHeatValue(heat: string | number | undefined): number {
  if (typeof heat === 'number') return heat;

  switch (heat) {
    case 'low':
      return 0.3;
    case 'medium':
      return 0.6;
    case 'high':
      return 0.9;
    default:
      return 0.45;
  }
}

function getNodeSize(heat: string | number | undefined) {
  const h = getHeatValue(heat);
  if (h >= 0.8) return 32;
  if (h >= 0.55) return 26;
  return 22;
}

function getDominatedCount(posters: Poster[]) {
  return posters.filter((p) => !!p.territory.ownerTeamId).length;
}

function getHotCount(posters: Poster[]) {
  return posters.filter((p) => getHeatValue(p.territory.heat) >= 0.8).length;
}

function getLatestPoster(posters: Poster[]) {
  if (posters.length === 0) return null;
  return [...posters].sort(
    (a, b) =>
      new Date(b.territory.lastActivityAt).getTime() -
      new Date(a.territory.lastActivityAt).getTime()
  )[0];
}

function sortPosters(posters: Poster[], mode: SortMode) {
  const copy = [...posters];

  if (mode === 'heat') {
    return copy.sort(
      (a, b) => getHeatValue(b.territory.heat) - getHeatValue(a.territory.heat)
    );
  }

  if (mode === 'recent') {
    return copy.sort(
      (a, b) =>
        new Date(b.territory.lastActivityAt).getTime() -
        new Date(a.territory.lastActivityAt).getTime()
    );
  }

  return copy.sort((a, b) => a.name.localeCompare(b.name));
}

// ─────────────────────────────────────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────────────────────────────────────

export default function MapScreen() {
  const router = useRouter();

  const [posters, setPosters] = useState<Poster[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPosterId, setSelectedPosterId] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('heat');

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const data = await posterService.fetchAll();
        if (!mounted) return;

        setPosters(data);

        if (data.length > 0) {
          const hottest = sortPosters(data, 'heat')[0];
          setSelectedPosterId(hottest?.id ?? null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const sortedPosters = useMemo(() => sortPosters(posters, sortMode), [posters, sortMode]);

  const selectedPoster =
    posters.find((p) => p.id === selectedPosterId) ?? sortedPosters[0] ?? null;

  const dominatedCount = useMemo(() => getDominatedCount(posters), [posters]);
  const hotCount = useMemo(() => getHotCount(posters), [posters]);
  const latestPoster = useMemo(() => getLatestPoster(posters), [posters]);

  return (
    <ScreenContainer scrollable padded={false}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>TACTICAL NETWORK</Text>
        <Text style={styles.title}>World Map</Text>
        <Text style={styles.subtitle}>
          Monitor active poster zones, hot territories and real-time ownership shifts.
        </Text>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <StatCard label="TOTAL ZONES" value={String(posters.length)} />
        <StatCard label="CLAIMED" value={String(dominatedCount)} />
        <StatCard label="HOT" value={String(hotCount)} />
      </View>

      {/* Tactical board */}
      <View style={styles.mapWrap}>
        <View style={styles.mapHeaderRow}>
          <View>
            <Text style={styles.mapTitle}>TACTICAL GRID</Text>
            <Text style={styles.mapSub}>
              Select a node to inspect and enter its poster room.
            </Text>
          </View>

          <View style={styles.legendWrap}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.accentGreen }]} />
              <Text style={styles.legendText}>live</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.textMuted }]} />
              <Text style={styles.legendText}>neutral</Text>
            </View>
          </View>
        </View>

        <View style={styles.mapBoard}>
          {/* Decorative grid */}
          <View style={styles.gridOverlay}>
            {Array.from({ length: 7 }).map((_, i) => (
              <View key={`h-${i}`} style={[styles.gridLineH, { top: `${(i + 1) * 12}%` }]} />
            ))}
            {Array.from({ length: 5 }).map((_, i) => (
              <View key={`v-${i}`} style={[styles.gridLineV, { left: `${(i + 1) * 16}%` }]} />
            ))}
          </View>

          {/* Radar rings */}
          <View style={styles.ring1} />
          <View style={styles.ring2} />
          <View style={styles.ring3} />

          {/* Center marker */}
          <View style={styles.centerCross} />

          {/* Loading */}
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator color={Colors.accentPurple} size="large" />
              <Text style={styles.loadingMapText}>Scanning territories...</Text>
            </View>
          )}

          {/* Nodes */}
          {!loading &&
            posters.map((poster) => {
              const tc = getPosterTeamColor(poster);
              const pos = getPosterPosition(poster);
              const selected = selectedPosterId === poster.id;
              const heatValue = getHeatValue(poster.territory.heat);
              const size = getNodeSize(poster.territory.heat);
              const isVeryHot = heatValue >= 0.8;

              return (
                <TouchableOpacity
                  key={poster.id}
                  style={[
                    styles.mapNode,
                    pos as any,
                    {
                      width: size,
                      height: size,
                      borderRadius: size / 2,
                      borderColor: selected ? Colors.white : tc.primary,
                      shadowColor: tc.glow ?? tc.primary,
                    },
                    selected && styles.mapNodeSelected,
                    isVeryHot && styles.mapNodeHot,
                  ]}
                  onPress={() => setSelectedPosterId(poster.id)}
                  activeOpacity={0.85}
                >
                  <View
                    style={[
                      styles.nodeCore,
                      {
                        backgroundColor: tc.primary,
                        width: Math.max(8, size * 0.42),
                        height: Math.max(8, size * 0.42),
                        borderRadius: Math.max(4, size * 0.21),
                      },
                    ]}
                  />
                </TouchableOpacity>
              );
            })}
        </View>
      </View>

      {/* Selected poster detail */}
      {selectedPoster && (
        <View style={styles.focusCard}>
          <View style={styles.focusHeader}>
            <View style={styles.focusTitleWrap}>
              <Text style={styles.focusEyebrow}>SELECTED NODE</Text>
              <Text style={styles.focusTitle}>{selectedPoster.name}</Text>
              {selectedPoster.location && (
                <Text style={styles.focusLocation}>📍 {selectedPoster.location.label}</Text>
              )}
            </View>

            {selectedPoster.territory.ownerTeamId ? (
              <TeamBadge teamId={selectedPoster.territory.ownerTeamId} size="sm" />
            ) : (
              <View style={styles.contestedBadge}>
                <Text style={styles.contestedText}>CONTESTED</Text>
              </View>
            )}
          </View>

          <View style={styles.focusMetaRow}>
            <View style={styles.metaPill}>
              <Text style={styles.metaPillLabel}>Last activity</Text>
              <Text style={styles.metaPillValue}>
                {timeAgo(selectedPoster.territory.lastActivityAt)}
              </Text>
            </View>

            <View style={styles.metaPill}>
              <Text style={styles.metaPillLabel}>Heat</Text>
              <Text style={styles.metaPillValue}>
                {typeof selectedPoster.territory.heat === 'string'
                  ? selectedPoster.territory.heat.toUpperCase()
                  : `${Math.round(getHeatValue(selectedPoster.territory.heat) * 100)}%`}
              </Text>
            </View>
          </View>

          <HeatBar
            heat={selectedPoster.territory.heat}
            showLabel={false}
            style={styles.focusHeat}
          />

          <View style={styles.focusActions}>
            <TouchableOpacity
              style={styles.enterBtn}
              onPress={() => router.push(`/poster/${selectedPoster.id}`)}
              activeOpacity={0.85}
            >
              <Text style={styles.enterBtnText}>ENTER POSTER ROOM</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => setSortMode((m) => (m === 'heat' ? 'recent' : m === 'recent' ? 'name' : 'heat'))}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryBtnText}>SORT: {sortMode.toUpperCase()}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Recent activity */}
      {latestPoster && (
        <View style={styles.activityStrip}>
          <Text style={styles.activityLabel}>LATEST MOVEMENT</Text>
          <Text style={styles.activityText}>
            {latestPoster.name} updated {timeAgo(latestPoster.territory.lastActivityAt)}
          </Text>
        </View>
      )}

      {/* List */}
      <View style={styles.listSection}>
        <Text style={styles.listTitle}>ZONE DIRECTORY</Text>

        {sortedPosters.map((p) => {
          const selected = selectedPosterId === p.id;
          const tc = getPosterTeamColor(p);

          return (
            <TouchableOpacity
              key={p.id}
              style={[
                styles.listItem,
                selected && styles.listItemSelected,
              ]}
              onPress={() => setSelectedPosterId(p.id)}
              activeOpacity={0.85}
            >
              <View
                style={[
                  styles.listAccent,
                  { backgroundColor: tc.primary },
                ]}
              />

              <View style={styles.listItemLeft}>
                <Text style={styles.listItemName}>{p.name}</Text>

                {p.location && (
                  <Text style={styles.listItemLoc}>📍 {p.location.label}</Text>
                )}

                <View style={styles.listItemRow}>
                  {p.territory.ownerTeamId ? (
                    <TeamBadge teamId={p.territory.ownerTeamId} size="sm" />
                  ) : (
                    <Text style={styles.neutralLabel}>CONTESTED</Text>
                  )}
                  <Text style={styles.listItemTime}>
                    {timeAgo(p.territory.lastActivityAt)}
                  </Text>
                </View>
              </View>

              <View style={styles.listRight}>
                <HeatBar heat={p.territory.heat} showLabel={false} style={styles.heatBar} />
                <TouchableOpacity
                  style={styles.miniEnterBtn}
                  onPress={() => router.push(`/poster/${p.id}`)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.miniEnterBtnText}>OPEN</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScreenContainer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Small components
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[6],
    paddingBottom: Spacing[4],
    gap: Spacing[1],
  },
  eyebrow: {
    color: Colors.accentGreen,
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.black,
    letterSpacing: Typography.letterSpacing.widest,
  },
  title: {
    fontSize: Typography.fontSizes['2xl'],
    fontWeight: Typography.fontWeights.black,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textMuted,
    lineHeight: 20,
    maxWidth: 340,
  },

  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing[4],
    gap: Spacing[3],
    marginBottom: Spacing[5],
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.black,
  },
  statLabel: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.xs,
    letterSpacing: Typography.letterSpacing.widest,
    marginTop: 4,
  },

  mapWrap: {
    marginHorizontal: Spacing[4],
    marginBottom: Spacing[5],
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  mapHeaderRow: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[3],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing[3],
  },
  mapTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.black,
    letterSpacing: Typography.letterSpacing.wide,
  },
  mapSub: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.xs,
    marginTop: 4,
  },
  legendWrap: {
    alignItems: 'flex-end',
    gap: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: Colors.textMuted,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  mapBoard: {
    height: 280,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#0a0d12',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },

  ring1: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    top: '50%',
    left: '50%',
    marginTop: -45,
    marginLeft: -45,
  },
  ring2: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    top: '50%',
    left: '50%',
    marginTop: -80,
    marginLeft: -80,
  },
  ring3: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 115,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    top: '50%',
    left: '50%',
    marginTop: -115,
    marginLeft: -115,
  },
  centerCross: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 10,
    height: 10,
    marginLeft: -5,
    marginTop: -5,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[3],
    backgroundColor: 'rgba(5,6,8,0.45)',
  },
  loadingMapText: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.sm,
    letterSpacing: Typography.letterSpacing.wide,
  },

  mapNode: {
    position: 'absolute',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 6,
  },
  mapNodeSelected: {
    transform: [{ scale: 1.18 }],
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  mapNodeHot: {
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 8,
  },
  nodeCore: {
    opacity: 0.95,
  },

  focusCard: {
    marginHorizontal: Spacing[4],
    marginBottom: Spacing[4],
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[4],
    gap: Spacing[3],
  },
  focusHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing[3],
  },
  focusTitleWrap: {
    flex: 1,
  },
  focusEyebrow: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.black,
    letterSpacing: Typography.letterSpacing.widest,
    marginBottom: 4,
  },
  focusTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.black,
  },
  focusLocation: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.sm,
    marginTop: 4,
  },
  contestedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgSurface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  contestedText: {
    color: Colors.warning,
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.black,
    letterSpacing: Typography.letterSpacing.wide,
  },

  focusMetaRow: {
    flexDirection: 'row',
    gap: Spacing[3],
  },
  metaPill: {
    flex: 1,
    backgroundColor: Colors.bgSurface,
    borderRadius: Radius.lg,
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[3],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  metaPillLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 4,
  },
  metaPillValue: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
  },
  focusHeat: {
    marginTop: 2,
  },
  focusActions: {
    flexDirection: 'row',
    gap: Spacing[3],
  },
  enterBtn: {
    flex: 1,
    backgroundColor: Colors.accentPurple,
    borderRadius: Radius.full,
    paddingVertical: Spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
  },
  enterBtnText: {
    color: Colors.white,
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

  activityStrip: {
    marginHorizontal: Spacing[4],
    marginBottom: Spacing[4],
    backgroundColor: Colors.bgSurface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
  },
  activityLabel: {
    color: Colors.accentGreen,
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.black,
    letterSpacing: Typography.letterSpacing.widest,
    marginBottom: 4,
  },
  activityText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.sm,
  },

  listSection: {
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[8],
  },
  listTitle: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textMuted,
    letterSpacing: Typography.letterSpacing.widest,
    marginBottom: Spacing[3],
  },
  listItem: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing[3],
    flexDirection: 'row',
    alignItems: 'stretch',
    overflow: 'hidden',
  },
  listItemSelected: {
    borderColor: Colors.borderBright,
  },
  listAccent: {
    width: 4,
  },
  listItemLeft: {
    flex: 1,
    padding: Spacing[4],
    gap: Spacing[1],
  },
  listItemName: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.semibold,
  },
  listItemLoc: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.sm,
  },
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    marginTop: Spacing[1],
    flexWrap: 'wrap',
  },
  listItemTime: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.xs,
  },
  neutralLabel: {
    color: Colors.warning,
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
    letterSpacing: Typography.letterSpacing.wide,
  },
  listRight: {
    width: 88,
    padding: Spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[3],
    borderLeftWidth: 1,
    borderLeftColor: Colors.border,
  },
  heatBar: {
    width: 58,
  },
  miniEnterBtn: {
    backgroundColor: Colors.bgSurface,
    borderWidth: 1,
    borderColor: Colors.borderBright,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  miniEnterBtnText: {
    color: Colors.textPrimary,
    fontSize: 10,
    fontWeight: Typography.fontWeights.black,
    letterSpacing: 0.7,
  },
});