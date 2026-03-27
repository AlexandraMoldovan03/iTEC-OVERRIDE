/**
 * src/components/ui/TeamBadge.tsx
 * Small pill/badge showing a team name with its brand color.
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { TeamId } from '../../types/team';
import { TEAM_COLORS } from '../../theme/colors';
import { Radius, Spacing, Typography } from '../../theme';
import { getTeamById } from '../../constants/teams';

interface TeamBadgeProps {
  teamId: TeamId;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export function TeamBadge({ teamId, size = 'md', style }: TeamBadgeProps) {
  const team = getTeamById(teamId);
  const teamColor = TEAM_COLORS[teamId];

  return (
    <View
      style={[
        styles.badge,
        size === 'sm' ? styles.sm : styles.md,
        { backgroundColor: teamColor.primary + '33', borderColor: teamColor.primary },
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          size === 'sm' ? styles.smText : styles.mdText,
          { color: teamColor.primary },
        ]}
      >
        {team?.name ?? teamId}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  sm: {
    paddingHorizontal: Spacing[2],
    paddingVertical: 2,
  },
  md: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
  },
  label: {
    fontWeight: Typography.fontWeights.bold,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wide,
  },
  smText: {
    fontSize: Typography.fontSizes.xs,
  },
  mdText: {
    fontSize: Typography.fontSizes.sm,
  },
});
