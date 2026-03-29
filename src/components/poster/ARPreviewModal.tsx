/**
 * src/components/poster/ARPreviewModal.tsx
 *
 * Modal AR: camera vie full-screen + desenele muralului suprapuse transparent.
 * Utilizatorul îndreaptă telefonul spre posterul real și vede cum arată
 * cu toate straturile de graffiti desenate pe el.
 *
 * Overlay-ul SVG e centrat pe ecran la proporțiile unui poster real (2:3).
 * Un chenar animat pulsant ajută la aliniere.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Svg, { Path, Circle, G, Text as SvgText } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PosterLayerItem, BrushStrokeItem, StickerItem, TeamStampItem } from '../../types/mural';
import { TEAM_COLORS } from '../../theme/colors';
import { TeamId } from '../../types/team';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Poster overlay: lățime 72% din ecran, raport 2:3
const OVERLAY_W = SCREEN_W * 0.72;
const OVERLAY_H = OVERLAY_W * 1.5;
// Referința originală a canvas-ului când s-a desenat (~350px wide)
const CANVAS_REF_W = 350;

interface Props {
  visible:    boolean;
  posterName: string;
  layers:     PosterLayerItem[];
  onClose:    () => void;
}

// ─── Mini SVG mural renderer ──────────────────────────────────────────────────

function MuralOverlaySVG({ layers }: { layers: PosterLayerItem[] }) {
  const w = OVERLAY_W;
  const h = OVERLAY_H;
  const scale = w / CANVAS_REF_W;

  const toX = (nx: number) => nx * w;
  const toY = (ny: number) => ny * h;

  const toPath = (points: Array<{ x: number; y: number }>) => {
    if (points.length < 2) return '';
    const [first, ...rest] = points;
    const parts = [`M ${toX(first.x).toFixed(1)} ${toY(first.y).toFixed(1)}`];
    rest.forEach((p) => parts.push(`L ${toX(p.x).toFixed(1)} ${toY(p.y).toFixed(1)}`));
    return parts.join(' ');
  };

  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {layers.map((item) => {
        const d         = item.data;
        const teamColor = TEAM_COLORS[item.teamId as TeamId];
        const glowCol   = teamColor?.glow    ?? '#ffffff';
        const primCol   = teamColor?.primary ?? '#888888';

        if (d.type === 'brush' || d.type === 'spray' || d.type === 'glow') {
          const stroke = d as BrushStrokeItem;
          const pathD  = toPath(stroke.points);
          if (!pathD) return null;
          const isGlow  = d.type === 'glow';
          const glowW   = (stroke.strokeWidth + (isGlow ? 12 : 7)) * scale;
          const strokeW = Math.max(1, stroke.strokeWidth * scale);
          return (
            <G key={item.id}>
              {isGlow && (
                <Path
                  d={pathD}
                  stroke={glowCol}
                  strokeWidth={glowW + 10}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  opacity={0.18}
                />
              )}
              <Path
                d={pathD}
                stroke={glowCol}
                strokeWidth={glowW}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                opacity={isGlow ? 0.82 : 0.65}
              />
              <Path
                d={pathD}
                stroke={stroke.color}
                strokeWidth={strokeW}
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
              stroke="rgba(0,0,0,0.85)"
              strokeWidth={Math.max(1.5, d.strokeWidth * scale)}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
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
              fontSize={Math.max(10, 22 * s.scale * (w / CANVAS_REF_W))}
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
          const r  = Math.max(6, 14 * ts.scale);
          return (
            <G key={item.id}>
              <Circle
                cx={toX(ts.position.x)}
                cy={toY(ts.position.y)}
                r={r}
                fill={primCol + '55'}
                stroke={primCol}
                strokeWidth={1.5}
              />
            </G>
          );
        }

        return null;
      })}
    </Svg>
  );
}

// ─── Modal principal ──────────────────────────────────────────────────────────

export function ARPreviewModal({ visible, posterName, layers, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Animație pulsantă pe chenar — ajutor vizual de aliniere
  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.35, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [visible]);

  // Cere permisiune la prima deschidere
  useEffect(() => {
    if (visible && !permission?.granted) {
      requestPermission();
    }
  }, [visible]);

  if (!visible) return null;

  const noPermission = !permission?.granted;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>

        {/* ── Camera sau fallback permisiune ── */}
        {noPermission ? (
          <View style={styles.permWrap}>
            <Text style={styles.permIcon}>📷</Text>
            <Text style={styles.permTitle}>Camera access needed</Text>
            <Text style={styles.permSub}>Allow camera to preview the mural in AR.</Text>
            <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
              <Text style={styles.permBtnText}>ALLOW CAMERA</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <CameraView style={StyleSheet.absoluteFillObject} facing="back" />
        )}

        {/* ── Overlay SVG centrat ── */}
        {!noPermission && (
          <View style={styles.overlayWrap} pointerEvents="none">
            {/* Chenar pulsant de aliniere */}
            <Animated.View style={[styles.alignFrame, { opacity: pulseAnim }]} />
            {/* Desenele muralului */}
            <MuralOverlaySVG layers={layers} />
          </View>
        )}

        {/* ── Header ── */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
            <MaterialCommunityIcons name="close" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter} pointerEvents="none">
            <View style={styles.arBadge}>
              <MaterialCommunityIcons name="augmented-reality" size={13} color="#000" />
              <Text style={styles.arBadgeText}>AR PREVIEW</Text>
            </View>
            <Text style={styles.posterName} numberOfLines={1}>{posterName}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* ── Hint de aliniere ── */}
        {!noPermission && (
          <View
            style={[styles.hint, { bottom: insets.bottom + 24 }]}
            pointerEvents="none"
          >
            <Text style={styles.hintText}>
              Point the camera at the real poster to align
            </Text>
          </View>
        )}

      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: '#000',
  },

  // ── Camera fallback ──
  permWrap: {
    flex:            1,
    alignItems:      'center',
    justifyContent:  'center',
    paddingHorizontal: 40,
    gap:             16,
  },
  permIcon:    { fontSize: 52 },
  permTitle: {
    color:      '#fff',
    fontSize:   18,
    fontWeight: '800',
    textAlign:  'center',
  },
  permSub: {
    color:      'rgba(255,255,255,0.55)',
    fontSize:   14,
    textAlign:  'center',
    lineHeight: 20,
  },
  permBtn: {
    marginTop:         8,
    paddingHorizontal: 28,
    paddingVertical:   13,
    borderRadius:      999,
    backgroundColor:   '#00E5FF',
  },
  permBtnText: {
    color:         '#000',
    fontSize:      13,
    fontWeight:    '900',
    letterSpacing: 1.2,
  },

  // ── SVG overlay ──
  overlayWrap: {
    position:        'absolute',
    width:           OVERLAY_W,
    height:          OVERLAY_H,
    left:            (SCREEN_W - OVERLAY_W) / 2,
    top:             (SCREEN_H - OVERLAY_H) / 2,
  },
  alignFrame: {
    ...StyleSheet.absoluteFillObject,
    borderWidth:   2,
    borderColor:   'rgba(255,255,255,0.7)',
    borderRadius:  8,
    borderStyle:   'dashed',
  },

  // ── Header ──
  header: {
    position:          'absolute',
    top:               0,
    left:              0,
    right:             0,
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: 16,
    paddingBottom:     12,
    backgroundColor:   'rgba(0,0,0,0.55)',
  },
  closeBtn: {
    width:           40,
    height:          40,
    borderRadius:    20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems:      'center',
    justifyContent:  'center',
  },
  headerCenter: {
    flex:       1,
    alignItems: 'center',
    gap:        4,
  },
  arBadge: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               4,
    backgroundColor:   '#00E5FF',
    paddingHorizontal: 10,
    paddingVertical:   3,
    borderRadius:      999,
  },
  arBadgeText: {
    color:         '#000',
    fontSize:      10,
    fontWeight:    '900',
    letterSpacing: 1,
  },
  posterName: {
    color:         'rgba(255,255,255,0.9)',
    fontSize:      13,
    fontWeight:    '700',
    letterSpacing: 0.5,
  },

  // ── Hint ──
  hint: {
    position:   'absolute',
    left:       0,
    right:      0,
    alignItems: 'center',
  },
  hintText: {
    color:         'rgba(255,255,255,0.5)',
    fontSize:      12,
    letterSpacing: 0.4,
    textAlign:     'center',
  },
});
