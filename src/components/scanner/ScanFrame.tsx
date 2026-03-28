/**
 * src/components/scanner/ScanFrame.tsx
 * Overlay animat pentru camera scanner — colțuri neon + linie de scan pulsantă.
 *
 * Stări vizuale:
 *  idle       → colțuri albe statice, linie scan animată
 *  capturing  → flash alb + freeze
 *  processing → colțuri galbene pulsante + spinner text
 *  success    → colțuri verzi + glow burst
 *  failed     → colțuri roșii + shake
 *  candidates → colțuri galbene statice
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  Text,
  Dimensions,
} from 'react-native';
import { ScanPhase } from '../../types/scan';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme';

const { width: SCREEN_W } = Dimensions.get('window');

const FRAME_SIZE  = SCREEN_W * 0.78;
const CORNER_LEN  = 28;
const CORNER_W    = 3;

// Culori per stare
const PHASE_COLORS: Record<ScanPhase, string> = {
  idle:        '#FFFFFF',
  capturing:   '#FFFFFF',
  processing:  Colors.accentYellow,
  success:     Colors.accentGreen,
  candidates:  Colors.accentYellow,
  failed:      Colors.error,
  error:       Colors.error,
};

interface ScanFrameProps {
  phase: ScanPhase;
}

export function ScanFrame({ phase }: ScanFrameProps) {
  const cornerColor = PHASE_COLORS[phase];

  // ── Scan line animation ───────────────────────────────────
  const scanY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (phase !== 'idle') return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(scanY, {
          toValue:         1,
          duration:        2200,
          useNativeDriver: true,
        }),
        Animated.timing(scanY, {
          toValue:         0,
          duration:        2200,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [phase]);

  const scanLineY = scanY.interpolate({
    inputRange:  [0, 1],
    outputRange: [0, FRAME_SIZE - 4],
  });

  // ── Corner glow pulse ─────────────────────────────────────
  const glowAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (phase !== 'processing') {
      glowAnim.setValue(1);
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 0.3, duration: 500, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 1,   duration: 500, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [phase]);

  // ── Success scale burst ───────────────────────────────────
  const successScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (phase !== 'success') return;
    Animated.sequence([
      Animated.timing(successScale, { toValue: 1.04, duration: 120, useNativeDriver: true }),
      Animated.timing(successScale, { toValue: 1,    duration: 200, useNativeDriver: true }),
    ]).start();
  }, [phase]);

  // ── Failed shake ──────────────────────────────────────────
  const shakeX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (phase !== 'failed') return;
    Animated.sequence([
      Animated.timing(shakeX, { toValue:  8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue:  6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue:  0, duration: 60, useNativeDriver: true }),
    ]).start();
  }, [phase]);

  // ── Flash overlay la capture ──────────────────────────────
  const flashOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (phase !== 'capturing') return;
    Animated.sequence([
      Animated.timing(flashOpacity, { toValue: 0.9, duration: 50,  useNativeDriver: true }),
      Animated.timing(flashOpacity, { toValue: 0,   duration: 300, useNativeDriver: true }),
    ]).start();
  }, [phase]);

  return (
    <View style={styles.container} pointerEvents="none">

      {/* ── Dimming ai lateralelor (zona din afara frame-ului) ── */}
      <View style={styles.dimTop}    />
      <View style={styles.dimRow}>
        <View style={styles.dimSide} />
        <View style={[styles.frameBox, { width: FRAME_SIZE, height: FRAME_SIZE }]}>
          {/* Frame interior — transparent */}
        </View>
        <View style={styles.dimSide} />
      </View>
      <View style={styles.dimBottom} />

      {/* ── Overlay frame cu colțuri ────────────────────────── */}
      <Animated.View
        style={[
          styles.frame,
          {
            width:     FRAME_SIZE,
            height:    FRAME_SIZE,
            opacity:   glowAnim,
            transform: [
              { scale:       successScale },
              { translateX:  shakeX },
            ],
          },
        ]}
      >
        {/* Colțuri */}
        {[
          styles.cornerTL,
          styles.cornerTR,
          styles.cornerBL,
          styles.cornerBR,
        ].map((pos, i) => (
          <View
            key={i}
            style={[
              styles.corner,
              pos,
              {
                borderColor: cornerColor,
                shadowColor: cornerColor,
                shadowOpacity: phase === 'success' ? 1 : 0.6,
                shadowRadius:  phase === 'success' ? 12 : 4,
              },
            ]}
          />
        ))}

        {/* Linie de scan — vizibilă doar în idle */}
        {phase === 'idle' && (
          <Animated.View
            style={[
              styles.scanLine,
              { transform: [{ translateY: scanLineY }] },
            ]}
          />
        )}

        {/* Success glow inner */}
        {phase === 'success' && (
          <View style={[styles.successGlow, { borderColor: Colors.accentGreen }]} />
        )}
      </Animated.View>

      {/* ── Flash la capture ────────────────────────────────── */}
      <Animated.View
        style={[StyleSheet.absoluteFillObject, styles.flash, { opacity: flashOpacity }]}
        pointerEvents="none"
      />

      {/* ── Label stare ─────────────────────────────────────── */}
      <View style={styles.labelWrap}>
        <PhaseLabel phase={phase} />
      </View>

    </View>
  );
}

// ─── Label per stare ─────────────────────────────────────────────────────────

function PhaseLabel({ phase }: { phase: ScanPhase }) {
  const map: Partial<Record<ScanPhase, { text: string; color: string }>> = {
    idle:        { text: 'POINT AT A POSTER',   color: 'rgba(255,255,255,0.7)' },
    capturing:   { text: 'CAPTURING...',        color: Colors.accentYellow },
    processing:  { text: 'IDENTIFYING...',      color: Colors.accentYellow },
    success:     { text: '✓  POSTER FOUND',     color: Colors.accentGreen },
    candidates:  { text: 'MULTIPLE MATCHES',    color: Colors.accentYellow },
    failed:      { text: '✕  NOT RECOGNIZED',   color: Colors.error },
    error:       { text: '⚠  CONNECTION ERROR', color: Colors.error },
  };

  const info = map[phase];
  if (!info) return null;

  return (
    <Text style={[styles.label, { color: info.color }]}>
      {info.text}
    </Text>
  );
}

// ─── Stiluri ──────────────────────────────────────────────────────────────────

const DIM_COLOR = 'rgba(0,0,0,0.55)';

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Dimming
  dimTop: {
    position:        'absolute',
    top:             0,
    left:            0,
    right:           0,
    height:          '50%',
    backgroundColor: DIM_COLOR,
    // Clippath-like via top positioning
    marginBottom:    FRAME_SIZE / 2,
  },
  dimRow: {
    position:  'absolute',
    flexDirection: 'row',
    alignItems:    'center',
  },
  dimSide: {
    width:           (SCREEN_W - FRAME_SIZE) / 2,
    height:          FRAME_SIZE,
    backgroundColor: DIM_COLOR,
  },
  frameBox: {
    backgroundColor: 'transparent',
  },
  dimBottom: {
    position:        'absolute',
    bottom:          0,
    left:            0,
    right:           0,
    height:          '50%',
    backgroundColor: DIM_COLOR,
    marginTop:       FRAME_SIZE / 2,
  },

  // Frame
  frame: {
    position: 'absolute',
  },
  corner: {
    position:    'absolute',
    width:       CORNER_LEN,
    height:      CORNER_LEN,
    borderWidth: CORNER_W,
    shadowOffset: { width: 0, height: 0 },
    elevation:   4,
  },
  cornerTL: {
    top:             0,
    left:            0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  cornerTR: {
    top:             0,
    right:           0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  cornerBL: {
    bottom:          0,
    left:            0,
    borderRightWidth: 0,
    borderTopWidth:  0,
  },
  cornerBR: {
    bottom:          0,
    right:           0,
    borderLeftWidth: 0,
    borderTopWidth:  0,
  },

  // Scan line
  scanLine: {
    position:        'absolute',
    left:            4,
    right:           4,
    height:          2,
    backgroundColor: 'rgba(57,255,20,0.7)',
    shadowColor:     Colors.accentGreen,
    shadowOffset:    { width: 0, height: 0 },
    shadowOpacity:   0.9,
    shadowRadius:    6,
  },

  // Success inner glow
  successGlow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth:  1.5,
    borderRadius: 2,
    opacity:      0.3,
  },

  // Flash
  flash: {
    backgroundColor: '#FFFFFF',
  },

  // Label
  labelWrap: {
    position:  'absolute',
    bottom:    FRAME_SIZE / 2 + 24,
    left:      0,
    right:     0,
    alignItems: 'center',
  },
  label: {
    fontSize:      Typography.fontSizes.xs,
    fontWeight:    Typography.fontWeights.black,
    letterSpacing: Typography.letterSpacing.widest,
    textTransform: 'uppercase',
    textShadowColor:  'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
