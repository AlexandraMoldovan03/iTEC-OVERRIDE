/**
 * src/components/ui/TeamBadge.tsx
 * Graffiti crew badge — text tag sau imagine badge, cu glow neon.
 *
 * mode="text"  → textul numelui echipei (default, compact, pentru HUD/liste)
 * mode="image" → imaginea badge PNG (pentru profile hero, poster room etc.)
 */

import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';
import { TeamId } from '../../types/team';
import { TEAM_COLORS } from '../../theme/colors';
import { Radius, Spacing, Typography } from '../../theme';
import { getTeamById } from '../../constants/teams';
import { TEAM_BADGE_IMAGES } from '../../constants/badges';

interface TeamBadgeProps {
  teamId:  TeamId;
  size?:   'sm' | 'md' | 'lg';
  mode?:   'text' | 'image';
  style?:  ViewStyle;
}

export function TeamBadge({
  teamId,
  size  = 'md',
  mode  = 'text',
  style,
}: TeamBadgeProps) {
  const team      = getTeamById(teamId);
  const teamColor = TEAM_COLORS[teamId];
  const badgeImg  = TEAM_BADGE_IMAGES[teamId];

  // ── Varianta imagine ────────────────────────────────────────
  if (mode === 'image') {
    const imgSize = size === 'lg' ? 120 : size === 'md' ? 72 : 44;
    return (
      <View
        style={[
          {
            shadowColor:   teamColor.glow,
            shadowOffset:  { width: 0, height: 0 },
            shadowOpacity: 0.7,
            shadowRadius:  12,
            elevation:     6,
          },
          style,
        ]}
      >
        <Image
          source={badgeImg}
          style={{ width: imgSize, height: imgSize }}
          resizeMode="contain"
        />
      </View>
    );
  }

  // ── Varianta text (default) ─────────────────────────────────
  return (
    <View
      style={[
        styles.badge,
        size === 'sm' ? styles.sm : styles.md,
        {
          backgroundColor: teamColor.primary + '18',
          borderColor:     teamColor.primary,
          shadowColor:     teamColor.glow,
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
    borderWidth:   1.5,
    borderRadius:  Radius.sm,
    alignSelf:     'flex-start',
    shadowOffset:  { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius:  6,
    elevation:     4,
  },
  sm: {
    paddingHorizontal: Spacing[2],
    paddingVertical:   3,
  },
  md: {
    paddingHorizontal: Spacing[3],
    paddingVertical:   Spacing[1] + 1,
  },
  label: {
    fontWeight:    Typography.fontWeights.black,
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
