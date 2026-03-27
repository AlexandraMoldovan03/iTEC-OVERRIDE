/**
 * src/components/ui/LiveIndicator.tsx
 * Pulsing "LIVE" dot shown when WebSocket is connected.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Spacing, Typography } from '../../theme';

interface LiveIndicatorProps {
  connected: boolean;
  style?: ViewStyle;
}

export function LiveIndicator({ connected, style }: LiveIndicatorProps) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!connected) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.5, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [connected]);

  return (
    <View style={[styles.container, style]}>
      <Animated.View
        style={[
          styles.dot,
          { transform: [{ scale: pulse }] },
          { backgroundColor: connected ? Colors.success : Colors.textMuted },
        ]}
      />
      <Text style={[styles.label, { color: connected ? Colors.success : Colors.textMuted }]}>
        {connected ? 'LIVE' : 'OFFLINE'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  label: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
    letterSpacing: Typography.letterSpacing.widest,
  },
});
