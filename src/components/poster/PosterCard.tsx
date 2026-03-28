/**
 * src/components/poster/PosterCard.tsx
 * Graffiti-style card — dark slab with team color slash accent.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  Image,
} from 'react-native';
import { Poster } from '../../types/poster';
import { TeamBadge } from '../ui/TeamBadge';
import { HeatBar } from '../ui/HeatBar';
import { Colors, Spacing, Radius, Typography } from '../../theme';
import { TEAM_COLORS } from '../../theme/colors';
import { timeAgo } from '../../utils/timeUtils';

interface PosterCardProps {
  poster: Poster;
  onPress: (poster: Poster) => void;
  style?: ViewStyle;
}

export function PosterCard({ poster, onPress, style }: PosterCardProps) {
  const { territory } = poster;
  const teamColor = territory.ownerTeamId
    ? TEAM_COLORS[territory.ownerTeamId]
    : null;

  return (
    <TouchableOpacity
      onPress={() => onPress(poster)}
      activeOpacity={0.75}
      style={[styles.card, style]}
    >
      {/* Team color slash — left edge accent */}
      <View
        style={[
          styles.slash,
          { backgroundColor: teamColor?.primary ?? Colors.borderBright },
        ]}
      />

      {/* Thumbnail */}
      <View style={styles.thumb}>
        {poster.referenceImageUrl ? (
          <Image
            source={{ uri: poster.referenceImageUrl }}
            style={styles.thumbImage}
            resizeMode="cover"
          />
        ) : (
          <Text style={styles.thumbPlaceholder}>🖼</Text>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{poster.name}</Text>
        {poster.location && (
          <Text style={styles.location} numberOfLines={1}>
            📍 {poster.location.label}
          </Text>
        )}

        <View style={styles.row}>
          {territory.ownerTeamId && (
            <TeamBadge teamId={territory.ownerTeamId} size="sm" />
          )}
          <Text style={styles.time}>{timeAgo(territory.lastActivityAt)}</Text>
        </View>

        <HeatBar heat={territory.heat} showLabel={false} style={styles.heat} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: Spacing[3],
  },
  slash: {
    width: 4,
    minHeight: 90,
  },
  thumb: {
    width: 76,
    height: 90,
    backgroundColor: Colors.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    fontSize: 28,
  },
  info: {
    flex: 1,
    padding: Spacing[3],
    gap: Spacing[1],
    justifyContent: 'center',
  },
  name: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.black,
    letterSpacing: Typography.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  location: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.xs,
    letterSpacing: Typography.letterSpacing.normal,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    marginTop: Spacing[1],
  },
  time: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.medium,
  },
  heat: {
    marginTop: Spacing[2],
  },
});
