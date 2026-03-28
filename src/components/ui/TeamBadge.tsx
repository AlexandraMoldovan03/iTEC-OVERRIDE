/**
 * src/components/ui/TeamBadge.tsx
 * Graffiti crew badge — bold tag with glow.
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
        {
          backgroundColor: teamColor.primary + '18',
          borderColor: teamColor.primary,
          shadowColor: teamColor.glow,
        },
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
    borderWidth: 1.5,
    borderRadius: Radius.sm,           // angular — like a sticker tag
    alignSelf: 'flex-start',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 4,
  },
  sm: {
    paddingHorizontal: Spacing[2],
    paddingVertical: 3,
  },
  md: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1] + 1,
  },
  label: {
    fontWeight: Typography.fontWeights.black,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wider,
  },
  smText: {
    fontSize: Typography.fontSizes.xs,
  },
  mdText: {
    fontSize: Typography.fontSizes.xs + 1,
  },
});
