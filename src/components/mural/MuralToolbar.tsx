/**
 * src/components/mural/MuralToolbar.tsx
 * Bottom toolbar with drawing tool buttons for the poster room.
 * Highlights the active tool with team color.
 */

import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMuralToolStore } from '../../stores/muralToolStore';
import { useTeam } from '../../hooks/useTeam';
import { MURAL_TOOLS } from '../../constants/tools';
import { Colors, Spacing, Radius, Typography } from '../../theme';
import { MuralToolId } from '../../types/mural';

export function MuralToolbar() {
  const { activeTool, setTool } = useMuralToolStore();
  const team = useTeam();
  const activeColor = team?.color ?? Colors.accentPurple;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {MURAL_TOOLS.map((tool) => {
          const isActive = activeTool === tool.id;
          return (
            <TouchableOpacity
              key={tool.id}
              onPress={() => setTool(tool.id as MuralToolId)}
              style={[
                styles.toolBtn,
                isActive && { backgroundColor: activeColor + '33', borderColor: activeColor },
              ]}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={tool.icon as any}
                size={22}
                color={isActive ? activeColor : Colors.textSecondary}
              />
              <Text style={[styles.toolLabel, isActive && { color: activeColor }]}>
                {tool.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.bgSurface + 'EE',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingVertical: Spacing[2],
  },
  scroll: {
    paddingHorizontal: Spacing[3],
    gap: Spacing[2],
  },
  toolBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 60,
    gap: 3,
  },
  toolLabel: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textMuted,
    fontWeight: Typography.fontWeights.medium,
  },
});
