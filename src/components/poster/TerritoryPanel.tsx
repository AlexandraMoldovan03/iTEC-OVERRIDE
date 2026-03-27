/**
 * src/components/poster/TerritoryPanel.tsx
 * Collapsed overlay panel showing poster territory state inside the poster room.
 * Shows current owner, team scores, and heat.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { TerritoryState } from '../../types/poster';
import { TeamBadge } from '../ui/TeamBadge';
import { HeatBar } from '../ui/HeatBar';
import { LiveIndicator } from '../ui/LiveIndicator';
import { TEAMS } from '../../constants/teams';
import { TEAM_COLORS } from '../../theme/colors';
import { Colors, Spacing, Radius, Typography } from '../../theme';
import { TeamId } from '../../types/team';

interface TerritoryPanelProps {
  territory: TerritoryState;
  wsConnected: boolean;
  recentContributorUsernames?: string[];
}

export function TerritoryPanel({
  territory,
  wsConnected,
  recentContributorUsernames = [],
}: TerritoryPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const totalScore = Object.values(territory.scores).reduce((a, b) => a + b, 0) || 1;

  return (
    <View style={styles.container}>
      {/* Header row — always visible */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.85}
      >
        <View style={styles.headerLeft}>
          {territory.ownerTeamId ? (
            <TeamBadge teamId={territory.ownerTeamId} size="sm" />
          ) : (
            <Text style={styles.noOwner}>CONTESTED</Text>
          )}
          <HeatBar heat={territory.heat} showLabel={false} style={styles.inlineHeat} />
        </View>
        <View style={styles.headerRight}>
          <LiveIndicator connected={wsConnected} />
          <Text style={styles.chevron}>{expanded ? '▾' : '▸'}</Text>
        </View>
      </TouchableOpacity>

      {/* Expanded detail */}
      {expanded && (
        <View style={styles.detail}>
          {/* Score bars */}
          {TEAMS.map((team) => {
            const score = territory.scores[team.id as TeamId] ?? 0;
            const pct = (score / totalScore) * 100;
            const tc = TEAM_COLORS[team.id as TeamId];
            return (
              <View key={team.id} style={styles.scoreRow}>
                <Text style={[styles.teamName, { color: tc.primary }]}>{team.name}</Text>
                <View style={styles.scoreTrack}>
                  <View style={[styles.scoreFill, { width: `${pct}%`, backgroundColor: tc.primary }]} />
                </View>
                <Text style={[styles.scoreNum, { color: tc.primary }]}>{score}</Text>
              </View>
            );
          })}

          {/* Recent contributors */}
          {recentContributorUsernames.length > 0 && (
            <View style={styles.contributors}>
              <Text style={styles.contributorLabel}>RECENT</Text>
              <Text style={styles.contributorNames}>
                {recentContributorUsernames.join(' · ')}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.bgOverlay,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing[3],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  inlineHeat: {
    flex: 1,
  },
  noOwner: {
    color: Colors.warning,
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
    letterSpacing: Typography.letterSpacing.wider,
  },
  chevron: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.sm,
  },
  detail: {
    padding: Spacing[3],
    paddingTop: 0,
    gap: Spacing[2],
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  teamName: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
    width: 90,
    letterSpacing: Typography.letterSpacing.wide,
  },
  scoreTrack: {
    flex: 1,
    height: 5,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  scoreFill: {
    height: '100%',
    borderRadius: Radius.full,
  },
  scoreNum: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
    width: 36,
    textAlign: 'right',
  },
  contributors: {
    marginTop: Spacing[1],
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  contributorLabel: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textMuted,
    fontWeight: Typography.fontWeights.bold,
    letterSpacing: Typography.letterSpacing.widest,
  },
  contributorNames: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
    flex: 1,
  },
});
