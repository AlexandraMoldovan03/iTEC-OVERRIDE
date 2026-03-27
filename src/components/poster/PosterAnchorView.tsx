/**
 * src/components/poster/PosterAnchorView.tsx
 * The simulated poster "anchor" frame — the visible poster bounding rect
 * with the mural canvas overlaid on top.
 *
 * Since Expo Go can't run heavy AR, we render a stylised mock camera frame
 * with a clearly-delineated poster area. Dimensions are derived from the
 * Poster's physical dimensions (mm → aspect ratio) scaled to the screen.
 */

import React from 'react';
import {
  View,
  StyleSheet,
  useWindowDimensions,
  Text,
} from 'react-native';
import { Poster } from '../../types/poster';
import { PosterLayerItem } from '../../types/mural';
import { MuralCanvas } from '../mural/MuralCanvas';
import { computePosterRect } from '../../utils/posterUtils';
import { Colors, Spacing, Radius, Typography } from '../../theme';

interface PosterAnchorViewProps {
  poster: Poster;
  layers: PosterLayerItem[];
}

export function PosterAnchorView({ poster, layers }: PosterAnchorViewProps) {
  const { width: screenW, height: screenH } = useWindowDimensions();
  // Reserve space for top/bottom UI
  const availableH = screenH * 0.55;

  const rect = computePosterRect(poster.dimensions, screenW, availableH, 16);

  return (
    <View style={[styles.frame, { width: screenW, height: availableH }]}>
      {/* Mock camera feed background */}
      <View style={styles.cameraBg}>
        <Text style={styles.cameraLabel}>📷  POSTER LOCKED</Text>
      </View>

      {/* Poster bounding area */}
      <View
        style={[
          styles.posterArea,
          {
            left: rect.x,
            top: rect.y,
            width: rect.width,
            height: rect.height,
          },
        ]}
      >
        {/* Corner marks */}
        <View style={[styles.corner, styles.tl]} />
        <View style={[styles.corner, styles.tr]} />
        <View style={[styles.corner, styles.bl]} />
        <View style={[styles.corner, styles.br]} />

        {/* Mural content */}
        <MuralCanvas
          layers={layers}
          posterWidth={rect.width}
          posterHeight={rect.height}
          posterX={rect.x}
          posterY={rect.y}
        />
      </View>
    </View>
  );
}

const CORNER = 18;
const BORDER = 2;

const styles = StyleSheet.create({
  frame: {
    position: 'relative',
    overflow: 'hidden',
  },
  cameraBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0A0A0F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraLabel: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.xs,
    letterSpacing: Typography.letterSpacing.widest,
  },
  posterArea: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: Colors.accentPurple + '88',
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderColor: Colors.white,
    borderWidth: BORDER,
  },
  tl: { top: -1, left: -1, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 2 },
  tr: { top: -1, right: -1, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 2 },
  bl: { bottom: -1, left: -1, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 2 },
  br: { bottom: -1, right: -1, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 2 },
});
