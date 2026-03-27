/**
 * src/components/mural/StickerPicker.tsx
 * Emoji sticker selector shown when the sticker tool is active.
 */

import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ScrollView } from 'react-native';
import { useMuralToolStore } from '../../stores/muralToolStore';
import { DEFAULT_STICKERS } from '../../constants/tools';
import { Colors, Spacing, Radius } from '../../theme';

export function StickerPicker() {
  const { selectedEmoji, setEmoji } = useMuralToolStore();

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {DEFAULT_STICKERS.map((emoji) => (
          <TouchableOpacity
            key={emoji}
            onPress={() => setEmoji(emoji)}
            style={[
              styles.btn,
              selectedEmoji === emoji && styles.selected,
            ]}
            activeOpacity={0.7}
          >
            <Text style={styles.emoji}>{emoji}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing[1],
    paddingHorizontal: Spacing[2],
  },
  scroll: {
    gap: Spacing[2],
    alignItems: 'center',
  },
  btn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selected: {
    borderColor: Colors.accentPurple,
    backgroundColor: Colors.accentPurple + '33',
  },
  emoji: {
    fontSize: 22,
  },
});
