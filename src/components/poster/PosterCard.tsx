/**
 * src/components/poster/PosterCard.tsx
 * Card shown in vault/home lists. Displays thumbnail, name, territory info.
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
import { timeAgo } from '../../utils/timeUtils';

interface PosterCardProps {
  poster: Poster;
  onPress: (poster: Poster) => void;
  style?: ViewStyle;
}

export function PosterCard({ poster, onPress, style }: PosterCardProps) {
  const { territory } = poster;

  return (
    <TouchableOpacity
      onPress={() => onPress(poster)}
      activeOpacity={0.8}
      style={[styles.card, style]}
    >
      {/* Thumbnail */}
      <View style={styles.thumb}>
        <Text style={styles.thumbPlaceholder}>🖼</Text>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{poster.name}</Text>
        {poster.location && (
          <Text style={styles.location} numberOfLines={1}>📍 {poster.location.label}</Text>
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
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: Spacing[3],
  },
  thumb: {
    width: 80,
    height: 90,
    backgroundColor: Colors.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbPlaceholder: {
    fontSize: 32,
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
    fontWeight: Typography.fontWeights.semibold,
  },
  location: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.sm,
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
  },
  heat: {
    marginTop: Spacing[2],
  },
});
