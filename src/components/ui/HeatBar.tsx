/**
 * src/components/ui/HeatBar.tsx
 * Visual heat/activity indicator — a glowing progress bar showing poster activity.
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Spacing, Radius, Typography } from '../../theme';

interface HeatBarProps {
  heat: number; // 0-100
  style?: ViewStyle;
  showLabel?: boolean;
}

function getHeatColor(heat: number): string {
  if (heat > 70) return '#FF3D00';
  if (heat > 40) return '#FFD740';
  return '#00E676';
}

export function HeatBar({ heat, style, showLabel = true }: HeatBarProps) {
  const color = getHeatColor(heat);
  const clamped = Math.max(0, Math.min(100, heat));

  return (
    <View style={[styles.container, style]}>
      {showLabel && (
        <Text style={[styles.label, { color }]}>
          🔥 {clamped}% heat
        </Text>
      )}
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              width: `${clamped}%`,
              backgroundColor: color,
              shadowColor: color,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  label: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
    marginBottom: Spacing[1],
    letterSpacing: Typography.letterSpacing.wide,
  },
  track: {
    height: 4,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.full,
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
});
