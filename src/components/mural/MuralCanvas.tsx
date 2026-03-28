/**
 * src/components/mural/MuralCanvas.tsx
 * Suprafața de desen cu randare live a stroke-urilor altor utilizatori.
 *
 * Straturi SVG (bottom → top):
 *  1. Layere permanente (salvate)
 *  2. Stroke-uri remote active (alți useri desenează live)
 *  3. Stroke-ul local activ (preview propriul desen, dashed)
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import Svg, { Path, Circle, Text as SvgText, G } from 'react-native-svg';
import { PosterLayerItem, BrushStrokeItem, StickerItem, TeamStampItem } from '../../types/mural';
import { RemoteStroke } from '../../stores/posterStore';
import { useMuralCanvas } from '../../hooks/useMuralCanvas';
import { usePosterStore } from '../../stores/posterStore';
import { useAuthStore }   from '../../stores/authStore';
import { useHaptics }     from '../../hooks/useHaptics';
import { TEAM_COLORS } from '../../theme/colors';
import { TeamId } from '../../types/team';

interface MuralCanvasProps {
  layers:       PosterLayerItem[];
  posterWidth:  number;
  posterHeight: number;
  posterX:      number;
  posterY:      number;
}

export function MuralCanvas({
  layers,
  posterWidth,
  posterHeight,
  posterX,
  posterY,
}: MuralCanvasProps) {
  const [canvasLayout, setCanvasLayout] = useState({
    width:  posterWidth,
    height: posterHeight,
  });

  const remoteStrokes = usePosterStore((s) => s.remoteStrokes);
  const currentUser   = useAuthStore((s) => s.user);
  const haptics       = useHaptics();

  // ── Detectează inamic care începe să deseneze ─────────────
  // Când apare un strokeId nou în remoteStrokes de la o echipă diferită,
  // declanșăm vibratia haptic enemyDrawing().
  const knownStrokeIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const currentIds = Object.keys(remoteStrokes);

    currentIds.forEach((sid) => {
      if (!knownStrokeIds.current.has(sid)) {
        // Stroke nou — verifică dacă e inamic (echipă diferită)
        const stroke = remoteStrokes[sid];
        if (stroke && currentUser?.teamId && stroke.teamId !== currentUser.teamId) {
          haptics.enemyDrawing();
        }
      }
    });

    // Actualizează set-ul cu ID-urile active
    knownStrokeIds.current = new Set(currentIds);
  }, [remoteStrokes]);

  const { activeStroke, onTouchStart, onTouchMove, onTouchEnd } = useMuralCanvas({
    width:   canvasLayout.width,
    height:  canvasLayout.height,
    offsetX: posterX,
    offsetY: posterY,
  });

  const onLayout = (e: LayoutChangeEvent) => {
    setCanvasLayout({
      width:  e.nativeEvent.layout.width,
      height: e.nativeEvent.layout.height,
    });
  };

  const toX = (nx: number) => nx * canvasLayout.width;
  const toY = (ny: number) => ny * canvasLayout.height;

  const toPath = (points: Array<{ x: number; y: number }>) => {
    if (points.length === 0) return '';
    const [first, ...rest] = points;
    const d = [`M ${toX(first.x)} ${toY(first.y)}`];
    rest.forEach((p) => d.push(`L ${toX(p.x)} ${toY(p.y)}`));
    return d.join(' ');
  };

  // ── Randare layer permanent ────────────────────────────────

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
          <Path
            d={pathD}
            stroke={teamColor.glow}
            strokeWidth={stroke.strokeWidth + (isGlow ? 8 : 4)}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity={0.5}
          />
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

  // ── Randare stroke remote live ─────────────────────────────
  // Stroke-ul altui utilizator apare cu culoarea echipei lui ca glow
  // și culoarea proprie ca linie principală — identic cu stroke-urile permanente.

  const renderRemoteStroke = (rs: RemoteStroke) => {
    const pathD = toPath(rs.points);
    if (!pathD || rs.points.length < 2) return null;

    const teamColor = TEAM_COLORS[rs.teamId as TeamId];
    const isGlow    = rs.toolType === 'glow';
    const isErase   = rs.toolType === 'erase';

    if (isErase) {
      return (
        <Path
          key={rs.strokeId}
          d={pathD}
          stroke="black"
          strokeWidth={rs.strokeWidth * 2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity={0.8}
        />
      );
    }

    return (
      <G key={rs.strokeId}>
        {/* Glow echipă — identitate vizuală clară */}
        <Path
          d={pathD}
          stroke={teamColor.glow}
          strokeWidth={rs.strokeWidth + (isGlow ? 10 : 5)}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity={0.45}
        />
        {/* Linia principală */}
        <Path
          d={pathD}
          stroke={rs.color}
          strokeWidth={rs.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity={rs.opacity * 0.9}
        />
      </G>
    );
  };

  // ── Preview local (stroke propriu, în curs) ────────────────

  const activePathD = activeStroke.length > 1 ? toPath(activeStroke) : undefined;

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

        {/* 1. Layere permanente */}
        {layers.map((layer) => renderLayer(layer))}

        {/* 2. Stroke-uri live de la alți utilizatori */}
        {Object.values(remoteStrokes).map((rs) => renderRemoteStroke(rs))}

        {/* 3. Preview stroke propriu (dashed) */}
        {activePathD && (
          <Path
            d={activePathD}
            stroke="rgba(255,255,255,0.85)"
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
    top:  0,
    left: 0,
  },
});
