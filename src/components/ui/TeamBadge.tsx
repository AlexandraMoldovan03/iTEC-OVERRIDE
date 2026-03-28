/**
 * src/components/ui/TeamBadge.tsx
 * Graffiti crew badge — imagine PNG cu fallback colorat.
 *
 * mode="text"  → textul numelui echipei (compact, pentru HUD/liste)
 * mode="image" → imaginea badge PNG cu fallback colorat dacă nu se încarcă
 */

import React, { useState } from 'react';
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

// ─── Inițialele echipelor pentru fallback ─────────────────────────────────────

const TEAM_INITIALS: Record<TeamId, string> = {
  minimalist:    'M',
  perfectionist: 'P',
  chaotic:       'C',
};

// ─── Fallback colorat (dacă imaginea nu se încarcă) ───────────────────────────

function ImageFallback({ teamId, size }: { teamId: TeamId; size: 'sm' | 'md' | 'lg' }) {
  const tc      = TEAM_COLORS[teamId];
  const dim     = size === 'lg' ? 120 : size === 'md' ? 72 : 44;
  const fontSize = size === 'lg' ? 42 : size === 'md' ? 26 : 16;

  return (
    <View style={[
      styles.fallback,
      {
        width:           dim,
        height:          dim,
        borderRadius:    dim / 2,
        backgroundColor: tc.primary + '22',
        borderColor:     tc.primary,
        shadowColor:     tc.glow,
      },
    ]}>
      <Text style={[styles.fallbackText, { color: tc.primary, fontSize }]}>
        {TEAM_INITIALS[teamId]}
      </Text>
    </View>
  );
}

// ─── Component principal ──────────────────────────────────────────────────────

export function TeamBadge({
  teamId,
  size  = 'md',
  mode  = 'text',
  style,
}: TeamBadgeProps) {
  const team      = getTeamById(teamId);
  const teamColor = TEAM_COLORS[teamId];
  const badgeImg  = TEAM_BADGE_IMAGES[teamId];

  const [imgError, setImgError] = useState(false);

  // ── Varianta imagine cu fallback ───────────────────────────
  if (mode === 'image') {
    const dim = size === 'lg' ? 120 : size === 'md' ? 72 : 44;

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
        {imgError ? (
          <ImageFallback teamId={teamId} size={size} />
        ) : (
          <Image
            source={badgeImg}
            style={{ width: dim, height: dim }}
            resizeMode="contain"
            onError={() => setImgError(true)}
            fadeDuration={150}
          />
        )}
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
  // ── Text badge ─────────────────────────────────────────────
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

  // ── Fallback ───────────────────────────────────────────────
  fallback: {
    borderWidth:    2,
    alignItems:     'center',
    justifyContent: 'center',
    shadowOffset:   { width: 0, height: 0 },
    shadowOpacity:  0.5,
    shadowRadius:   8,
    elevation:      4,
  },
  fallbackText: {
    fontWeight: Typography.fontWeights.black,
  },
});
