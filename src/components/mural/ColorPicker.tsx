/**
 * src/components/mural/ColorPicker.tsx
 * Horizontal color swatch picker used alongside the mural toolbar.
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useMuralToolStore } from '../../stores/muralToolStore';
import { Spacing, Radius } from '../../theme';

const PALETTE = [
  '#FFFFFF', '#FF3D00', '#FF8A65', '#FFD740',
  '#00E676', '#40C4FF', '#4A90E2', '#7C5CBF',
  '#E040FB', '#FF1744', '#000000', '#78909C',
];

export function ColorPicker() {
  const { color, setColor } = useMuralToolStore();

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {PALETTE.map((c) => (
          <TouchableOpacity
            key={c}
            onPress={() => setColor(c)}
            style={[
              styles.swatch,
              { backgroundColor: c },
              color === c && styles.selected,
            ]}
            activeOpacity={0.8}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[2],
  },
  scroll: {
    gap: Spacing[2],
    alignItems: 'center',
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  selected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.2 }],
  },
});
