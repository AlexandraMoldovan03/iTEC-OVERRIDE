/**
 * app/(main)/map.tsx
 * World map screen showing discovered poster locations.
 * Uses a mock map grid since Expo Go requires no native map modules.
 * Replace with react-native-maps when ejecting from Expo Go.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
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

export default function MapScreen() {
  const router = useRouter();
  const [posters, setPosters] = useState<Poster[]>([]);

  useEffect(() => {
    posterService.fetchAll().then(setPosters);
  }, []);

  return (
    <ScreenContainer scrollable padded={false}>
      <View style={styles.header}>
        <Text style={styles.title}>World Map</Text>
        <Text style={styles.subtitle}>{posters.length} active zones</Text>
      </View>

      {/* Mock map grid — placeholder until real map integration */}
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapLabel}>🗺  MAP VIEW</Text>
        <Text style={styles.mapSub}>Tap a poster node below to enter</Text>

        {/* Scatter "nodes" on the fake map */}
        {posters.map((p, i) => {
          const tc = p.territory.ownerTeamId
            ? TEAM_COLORS[p.territory.ownerTeamId as TeamId]
            : { primary: Colors.textMuted, glow: Colors.textMuted };
          const positions = [
            { top: '25%', left: '20%' },
            { top: '55%', left: '60%' },
            { top: '35%', left: '75%' },
          ];
          const pos = positions[i % positions.length];

          return (
            <TouchableOpacity
              key={p.id}
              style={[styles.mapNode, pos as any, { borderColor: tc.primary, shadowColor: tc.primary }]}
              onPress={() => router.push(`/poster/${p.id}`)}
              activeOpacity={0.8}
            >
              <View style={[styles.nodeDot, { backgroundColor: tc.primary }]} />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List below map */}
      <View style={styles.listSection}>
        <Text style={styles.listTitle}>ALL POSTERS</Text>
        {posters.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={styles.listItem}
            onPress={() => router.push(`/poster/${p.id}`)}
            activeOpacity={0.8}
          >
            <View style={styles.listItemLeft}>
              <Text style={styles.listItemName}>{p.name}</Text>
              {p.location && (
                <Text style={styles.listItemLoc}>📍 {p.location.label}</Text>
              )}
              <View style={styles.listItemRow}>
                {p.territory.ownerTeamId && (
                  <TeamBadge teamId={p.territory.ownerTeamId} size="sm" />
                )}
                <Text style={styles.listItemTime}>{timeAgo(p.territory.lastActivityAt)}</Text>
              </View>
            </View>
            <HeatBar heat={p.territory.heat} showLabel={false} style={styles.heatBar} />
          </TouchableOpacity>
        ))}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[6],
    paddingBottom: Spacing[4],
  },
  title: {
    fontSize: Typography.fontSizes['2xl'],
    fontWeight: Typography.fontWeights.black,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textMuted,
  },
  mapPlaceholder: {
    marginHorizontal: Spacing[4],
    height: 220,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: Spacing[6],
  },
  mapLabel: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.xs,
    letterSpacing: Typography.letterSpacing.widest,
  },
  mapSub: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.xs,
    marginTop: Spacing[1],
  },
  mapNode: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  },
  nodeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  listSection: {
    paddingHorizontal: Spacing[4],
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
    padding: Spacing[4],
    marginBottom: Spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  listItemLeft: {
    flex: 1,
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
  },
  listItemTime: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.xs,
  },
  heatBar: {
    width: 60,
  },
});
