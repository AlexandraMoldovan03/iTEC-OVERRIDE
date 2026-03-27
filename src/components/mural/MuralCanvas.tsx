/**
 * src/components/mural/MuralCanvas.tsx
 * The touch-responsive drawing surface overlaid on the poster.
 * Renders existing layers and the in-progress stroke.
 *
 * NOTE: For Expo Go compatibility we use React Native's built-in drawing
 * primitives via react-native-svg. All positions are stored in normalized
 * coordinates and scaled to the canvas dimensions at render time.
 */

import React, { useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import Svg, { Path, Circle, Text as SvgText, G } from 'react-native-svg';
import { PosterLayerItem, BrushStrokeItem, StickerItem, TeamStampItem } from '../../types/mural';
import { useMuralCanvas } from '../../hooks/useMuralCanvas';
import { TEAM_COLORS } from '../../theme/colors';
import { TeamId } from '../../types/team';

interface MuralCanvasProps {
  layers: PosterLayerItem[];
  posterWidth: number;
  posterHeight: number;
  posterX: number;
  posterY: number;
}

export function MuralCanvas({
  layers,
  posterWidth,
  posterHeight,
  posterX,
  posterY,
}: MuralCanvasProps) {
  const [canvasLayout, setCanvasLayout] = useState({
    width: posterWidth,
    height: posterHeight,
  });

  const { activeStroke, onTouchStart, onTouchMove, onTouchEnd } = useMuralCanvas({
    width: canvasLayout.width,
    height: canvasLayout.height,
    offsetX: posterX,
    offsetY: posterY,
  });

  const onLayout = (e: LayoutChangeEvent) => {
    setCanvasLayout({
      width: e.nativeEvent.layout.width,
      height: e.nativeEvent.layout.height,
    });
  };

  const toX = (nx: number) => nx * canvasLayout.width;
  const toY = (ny: number) => ny * canvasLayout.height;

  /** Convert a list of normalized points to an SVG path string */
  const toPath = (points: Array<{ x: number; y: number }>) => {
    if (points.length === 0) return '';
    const [first, ...rest] = points;
    const d = [`M ${toX(first.x)} ${toY(first.y)}`];
    rest.forEach((p) => d.push(`L ${toX(p.x)} ${toY(p.y)}`));
    return d.join(' ');
  };

  const renderLayer = (item: PosterLayerItem) => {
    const teamColor = TEAM_COLORS[item.teamId as TeamId];
    const d = item.data;

    if (d.type === 'brush' || d.type === 'spray' || d.type === 'glow') {
      const stroke = d as BrushStrokeItem;
      const pathD = toPath(stroke.points);
      if (!pathD) return null;
      const isGlow = d.type === 'glow';
      return (
        <G key={item.id}>
          {/* Team-colored outline/glow for visual identity */}
          <Path
            d={pathD}
            stroke={teamColor.glow}
            strokeWidth={stroke.strokeWidth + (isGlow ? 8 : 4)}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity={0.5}
          />
          {/* Main stroke */}
          <Path
            d={pathD}
            stroke={stroke.color}
            strokeWidth={stroke.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity={stroke.opacity}
          />
        </G>
      );
    }

    if (d.type === 'erase') {
      const pathD = toPath(d.points);
      if (!pathD) return null;
      return (
        <Path
          key={item.id}
          d={pathD}
          stroke="black"
          strokeWidth={d.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity={1}
        />
      );
    }

    if (d.type === 'sticker') {
      const s = d as StickerItem;
      return (
        <SvgText
          key={item.id}
          x={toX(s.position.x)}
          y={toY(s.position.y)}
          fontSize={28 * s.scale}
          textAnchor="middle"
          rotation={s.rotation}
          originX={toX(s.position.x)}
          originY={toY(s.position.y)}
        >
          {s.emoji}
        </SvgText>
      );
    }

    if (d.type === 'teamStamp') {
      const ts = d as TeamStampItem;
      const sz = 36 * ts.scale;
      return (
        <G key={item.id}>
          <Circle
            cx={toX(ts.position.x)}
            cy={toY(ts.position.y)}
            r={sz / 2}
            fill={teamColor.primary + '33'}
            stroke={teamColor.primary}
            strokeWidth={2}
          />
          <SvgText
            x={toX(ts.position.x)}
            y={toY(ts.position.y) + sz * 0.15}
            fontSize={sz * 0.5}
            fill={teamColor.primary}
            textAnchor="middle"
            fontWeight="bold"
          >
            ⬡
          </SvgText>
        </G>
      );
    }

    return null;
  };

  /** Active in-progress stroke preview */
  const activePathD =
    activeStroke.length > 1 ? toPath(activeStroke) : undefined;

  return (
    <View
      style={[styles.canvas, { width: posterWidth, height: posterHeight }]}
      onLayout={onLayout}
      onStartShouldSetResponder={() => true}
      onResponderGrant={onTouchStart}
      onResponderMove={onTouchMove}
      onResponderRelease={onTouchEnd}
    >
      <Svg width={canvasLayout.width} height={canvasLayout.height}>
        {layers.map((layer) => renderLayer(layer))}
        {activePathD && (
          <Path
            d={activePathD}
            stroke="rgba(255,255,255,0.8)"
            strokeWidth={6}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            strokeDasharray="4 4"
          />
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
