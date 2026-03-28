/**
 * src/components/poster/LeaderboardPanel.tsx
 * Clasament în timp real — echipe + jucători individuali.
 *
 * Citește direct din posterStore (teamScores, playerScores)
 * care se recalculează la fiecare layer:add/remove.
 *
 * Layout:
 *   [LEADERBOARD ▲ / ▼]   ← header colapsabil
 *   ─────────────────────
 *   TEAMS   │ PLAYERS
 *   #1 Team │ #1 Player 12pt
 *   #2 Team │ #2 Player  8pt
 *   #3 Team │ #3 Player  4pt
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { usePosterStore } from '../../stores/posterStore';
import { TeamScore, PlayerScore } from '../../utils/scoring';
import { TEAM_COLORS } from '../../theme/colors';
import { Colors, Spacing, Typography, Radius } from '../../theme';
import { TeamId } from '../../types/team';

// ─── Etichetă echipă ──────────────────────────────────────────────────────────

const TEAM_LABELS: Record<TeamId, string> = {
  minimalist: 'MIN',
  perfectionist: 'PERF',
  chaotic: 'CHAO',
};

const RANK_COLORS = ['#FFE600', '#AAAAAA', '#FF6B00'];

// ─── Rând echipă ──────────────────────────────────────────────────────────────

function TeamRow({
  ts,
  myTeamId,
}: {
  ts: TeamScore;
  myTeamId?: TeamId | null;
}) {
  const tc = TEAM_COLORS[ts.teamId as TeamId];
  const rankColor = RANK_COLORS[ts.rank - 1] ?? Colors.textMuted;
  const isLeader = ts.rank === 1;
  const isMyTeam = myTeamId === ts.teamId;

  return (
    <View
      style={[
        styles.row,
        isLeader && styles.rowLeader,
        isMyTeam && styles.rowMyTeam,
      ]}
    >
      <View style={[styles.rankBadge, { backgroundColor: rankColor + '22', borderColor: rankColor }]}>
        <Text style={[styles.rankText, { color: rankColor }]}>#{ts.rank}</Text>
      </View>

      <View
        style={[
          styles.teamDot,
          {
            backgroundColor: tc.primary + '33',
            borderColor: tc.primary,
            shadowColor: tc.glow,
          },
        ]}
      >
        <Text style={[styles.teamDotText, { color: tc.primary }]}>
          {TEAM_LABELS[ts.teamId] ?? ts.teamId.slice(0, 4).toUpperCase()}
        </Text>
      </View>

      <View style={styles.rowRight}>
        <Text style={[styles.points, { color: isLeader ? Colors.accentYellow : Colors.textPrimary }]}>
          {ts.points}
          <Text style={styles.ptSuffix}>pt</Text>
        </Text>
        <Text style={styles.layers}>{ts.layerCount}×</Text>
      </View>
    </View>
  );
}

// ─── Rând jucător ─────────────────────────────────────────────────────────────

function PlayerRow({ ps }: { ps: PlayerScore }) {
  const tc = TEAM_COLORS[ps.teamId as TeamId];
  const rankColor = RANK_COLORS[ps.rank - 1] ?? Colors.textMuted;
  const isLeader = ps.rank === 1;
  const initial = (ps.username?.[0] ?? '?').toUpperCase();

  return (
    <View style={[styles.row, isLeader && styles.rowLeader]}>
      <View style={[styles.rankBadge, { backgroundColor: rankColor + '22', borderColor: rankColor }]}>
        <Text style={[styles.rankText, { color: rankColor }]}>#{ps.rank}</Text>
      </View>

      <View
        style={[
          styles.playerAvatar,
          {
            backgroundColor: tc.primary + '22',
            borderColor: tc.primary,
            shadowColor: tc.glow,
          },
        ]}
      >
        <Text style={[styles.playerInitial, { color: tc.primary }]}>{initial}</Text>
      </View>

      <Text style={styles.playerName} numberOfLines={1}>
        {ps.username}
      </Text>

      <View style={styles.rowRight}>
        <Text style={[styles.points, { color: isLeader ? Colors.accentYellow : Colors.textPrimary }]}>
          {ps.points}
          <Text style={styles.ptSuffix}>pt</Text>
        </Text>
      </View>
    </View>
  );
}

// ─── Panel principal ──────────────────────────────────────────────────────────

interface LeaderboardPanelProps {
  myTeamId?: TeamId | null;
}

export function LeaderboardPanel({ myTeamId = null }: LeaderboardPanelProps) {
  const teamScores = usePosterStore((s) => s.teamScores);
  const playerScores = usePosterStore((s) => s.playerScores);

  const [collapsed, setCollapsed] = useState(false);
  const animHeight = useRef(new Animated.Value(1)).current;

  const toggle = () => {
    const toValue = collapsed ? 1 : 0;
    Animated.spring(animHeight, {
      toValue,
      tension: 80,
      friction: 12,
      useNativeDriver: false,
    }).start();
    setCollapsed(!collapsed);
  };

  const topTeams = teamScores.slice(0, 3);
  const topPlayers = playerScores.slice(0, 5);

  const hasData = topTeams.length > 0 || topPlayers.length > 0;

  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  if (!hasData) return null;

  const maxBodyHeight = animHeight.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 400],
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.header} onPress={toggle} activeOpacity={0.8}>
        <View style={styles.headerLeft}>
          <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />
          <Text style={styles.headerTitle}>LEADERBOARD</Text>
        </View>

        {topTeams[0] && (
          <View style={styles.headerScore}>
            <View
              style={[
                styles.leaderDot,
                {
                  backgroundColor: TEAM_COLORS[topTeams[0].teamId as TeamId].primary + '44',
                  borderColor: TEAM_COLORS[topTeams[0].teamId as TeamId].primary,
                },
              ]}
            >
              <Text
                style={[
                  styles.leaderDotText,
                  { color: TEAM_COLORS[topTeams[0].teamId as TeamId].primary },
                ]}
              >
                {TEAM_LABELS[topTeams[0].teamId] ?? '?'}
              </Text>
            </View>
            <Text style={styles.leaderPoints}>{topTeams[0].points}pt</Text>
          </View>
        )}

        <Text style={styles.chevron}>{collapsed ? '▼' : '▲'}</Text>
      </TouchableOpacity>

      <Animated.View style={[styles.body, { maxHeight: maxBodyHeight, overflow: 'hidden' }]}>
        <View style={styles.columns}>
          <View style={styles.column}>
            <Text style={styles.columnTitle}>TEAMS</Text>
            {topTeams.map((ts) => (
              <TeamRow key={ts.teamId} ts={ts} myTeamId={myTeamId} />
            ))}
            {topTeams.length === 0 && (
              <Text style={styles.emptyText}>No team score yet</Text>
            )}
          </View>

          <View style={styles.separator} />

          <View style={[styles.column, { flex: 1.3 }]}>
            <Text style={styles.columnTitle}>PLAYERS</Text>
            {topPlayers.map((ps) => (
              <PlayerRow key={ps.userId} ps={ps} />
            ))}
            {topPlayers.length === 0 && (
              <Text style={styles.emptyText}>No players yet</Text>
            )}
          </View>
        </View>

        <View style={styles.legend}>
          <Text style={styles.legendText}>
            brush=1pt · spray=2pt · glow=3pt · stamp=2pt · sticker=1pt
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

// ─── Stiluri ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    gap: Spacing[2],
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.accentGreen,
    shadowColor: Colors.accentGreen,
    shadowOpacity: 0.9,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  headerTitle: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.black,
    color: Colors.accentGreen,
    letterSpacing: Typography.letterSpacing.widest,
    textShadowColor: Colors.accentGreen,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  headerScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
  },
  leaderDot: {
    width: 36,
    height: 18,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderDotText: {
    fontSize: 9,
    fontWeight: Typography.fontWeights.black,
    letterSpacing: 0.5,
  },
  leaderPoints: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.black,
    color: Colors.accentYellow,
  },
  chevron: {
    fontSize: 10,
    color: Colors.textMuted,
    width: 14,
    textAlign: 'center',
  },

  body: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  columns: {
    flexDirection: 'row',
    padding: Spacing[2],
    gap: Spacing[2],
  },
  column: {
    flex: 1,
    gap: Spacing[1],
  },
  columnTitle: {
    fontSize: 9,
    fontWeight: Typography.fontWeights.black,
    color: Colors.textMuted,
    letterSpacing: Typography.letterSpacing.widest,
    marginBottom: 2,
  },
  separator: {
    width: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing[1],
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
    paddingVertical: 3,
    paddingHorizontal: 4,
    borderRadius: Radius.sm,
  },
  rowLeader: {
    backgroundColor: Colors.accentYellow + '08',
    borderWidth: 1,
    borderColor: Colors.accentYellow + '33',
  },
  rowMyTeam: {
    backgroundColor: Colors.accentPurple + '12',
    borderWidth: 1,
    borderColor: Colors.accentPurple + '33',
  },
  rankBadge: {
    width: 24,
    height: 16,
    borderRadius: 3,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 8,
    fontWeight: Typography.fontWeights.black,
  },
  rowRight: {
    marginLeft: 'auto',
    alignItems: 'flex-end',
  },
  points: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.black,
  },
  ptSuffix: {
    fontSize: 8,
    fontWeight: Typography.fontWeights.regular,
    color: Colors.textMuted,
  },
  layers: {
    fontSize: 8,
    color: Colors.textMuted,
  },

  teamDot: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    borderWidth: 1,
    shadowOpacity: 0.5,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  teamDotText: {
    fontSize: 8,
    fontWeight: Typography.fontWeights.black,
    letterSpacing: 0.5,
  },

  playerAvatar: {
    width: 20,
    height: 20,
    borderRadius: 3,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.4,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 0 },
  },
  playerInitial: {
    fontSize: 8,
    fontWeight: Typography.fontWeights.black,
  },
  playerName: {
    flex: 1,
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeights.bold,
    letterSpacing: 0.3,
  },

  legend: {
    paddingHorizontal: Spacing[3],
    paddingBottom: Spacing[2],
  },
  legendText: {
    fontSize: 8,
    color: Colors.textMuted,
    letterSpacing: 0.3,
  },

  emptyText: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
});