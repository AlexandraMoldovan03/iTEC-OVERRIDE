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

  // ── Haptic în timp real cât timp alții desenează ──────────
  // Urmărim creșterea numărului de puncte per stroke (= deget care se mișcă).
  // Light haptic pentru coechipieri, medium pentru inamici.
  // Throttle 160ms ca să nu spameze la fiecare frame de mișcare.

  const strokePointCounts = useRef<Map<string, number>>(new Map());
  const knownStrokeIds    = useRef<Set<string>>(new Set());
  const lastHapticMs      = useRef<number>(0);
  const HAPTIC_INTERVAL   = 160; // ms

  useEffect(() => {
    const now        = Date.now();
    const currentIds = new Set(Object.keys(remoteStrokes));
    let hasActivity  = false;
    let hasEnemy     = false;

    currentIds.forEach((sid) => {
      const stroke = remoteStrokes[sid];
      if (!stroke) return;
      if (stroke.userId === currentUser?.id) return; // ignoră propriul stroke

      const prevCount = strokePointCounts.current.get(sid) ?? -1;
      const currCount = stroke.points.length;

      if (currCount > prevCount) {
        // Puncte noi → degetul se mișcă activ
        hasActivity = true;
        if (currentUser?.teamId && stroke.teamId !== currentUser.teamId) {
          hasEnemy = true;
        }
      }

      strokePointCounts.current.set(sid, currCount);
    });

    // Curăță tracking-ul stroke-urilor terminate
    knownStrokeIds.current.forEach((sid) => {
      if (!currentIds.has(sid)) {
        strokePointCounts.current.delete(sid);
      }
    });
    knownStrokeIds.current = currentIds;

    // Declanșează haptic dacă a trecut destul timp de la ultimul
    if (hasActivity && now - lastHapticMs.current >= HAPTIC_INTERVAL) {
      lastHapticMs.current = now;
      if (hasEnemy) {
        haptics.enemyDrawing(); // medium — simți inamicul
      } else {
        haptics.allyDrawing();  // light — simți coechipierul
      }
    }
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
          {/* Bloom exterior — strat larg, vizibil mai ales la tool glow */}
          {isGlow && (
            <Path
              d={pathD}
              stroke={teamColor.glow}
              strokeWidth={stroke.strokeWidth + 22}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity={0.22}
            />
          )}
          {/* Glow halo principal — culoarea echipei */}
          <Path
            d={pathD}
            stroke={teamColor.glow}
            strokeWidth={stroke.strokeWidth + (isGlow ? 12 : 7)}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity={isGlow ? 0.85 : 0.72}
          />
          {/* Linia de desen propriu-zisă */}
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
        {/* Bloom exterior (doar la glow tool) */}
        {isGlow && (
          <Path
            d={pathD}
            stroke={teamColor.glow}
            strokeWidth={rs.strokeWidth + 24}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity={0.2}
          />
        )}
        {/* Glow halo principal */}
        <Path
          d={pathD}
          stroke={teamColor.glow}
          strokeWidth={rs.strokeWidth + (isGlow ? 14 : 8)}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity={isGlow ? 0.88 : 0.75}
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
