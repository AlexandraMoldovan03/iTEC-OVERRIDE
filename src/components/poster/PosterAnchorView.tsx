/**
 * src/components/poster/PosterAnchorView.tsx
 *
 * Afișează posterul real ca fundal, cu mural canvas SVG deasupra.
 *
 * Layout (bottom → top):
 *   1. Imaginea reală a posterului (referenceImageUrl)   ← CANVAS fundal
 *   2. MuralCanvas SVG — layere + stroke-uri live        ← DESEN deasupra
 *   3. Corner marks decorativi (subtili, semi-transparenți)
 *
 * Dacă referenceImageUrl lipsește → placeholder colorat (gradient fallback).
 * Posterul este scalat fit-to-width păstrând aspect ratio-ul fizic (mm).
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  useWindowDimensions,
  Image,
  ActivityIndicator,
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

// ─── Placeholder când nu există referenceImageUrl ─────────────────────────────
// Gradient simulat cu view-uri suprapuse — fără dependință de librărie externă.

const PLACEHOLDER_COLORS = [
  ['#1a1a2e', '#16213e'],   // albastru noapte
  ['#0d0d0d', '#1a1a1a'],   // negru
  ['#1a0a2e', '#0a1a2e'],   // violet întunecat
];

function PosterPlaceholder({
  posterId,
  width,
  height,
}: {
  posterId: string;
  width: number;
  height: number;
}) {
  // Pick culori deterministic după ID
  const idx     = posterId.charCodeAt(posterId.length - 1) % PLACEHOLDER_COLORS.length;
  const [c1, c2] = PLACEHOLDER_COLORS[idx];

  return (
    <View style={[styles.placeholder, { width, height, backgroundColor: c1 }]}>
      {/* Gradient simulat cu overlay semi-transparent */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: c2,
            opacity: 0.6,
          },
        ]}
      />
      {/* Pattern subtil */}
      <View style={styles.placeholderGrid}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.placeholderLine,
              { top: `${(i + 1) * 14}%` as any, opacity: 0.04 + i * 0.01 },
            ]}
          />
        ))}
      </View>
      {/* Label */}
      <Text style={styles.placeholderLabel}>POSTER</Text>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PosterAnchorView({ poster, layers }: PosterAnchorViewProps) {
  const { width: screenW, height: screenH } = useWindowDimensions();
  // Rezervă spațiu pentru HUD top + toolbar bottom
  const availableH = screenH * 0.55;

  const rect = computePosterRect(poster.dimensions, screenW, availableH, 16);

  const [imgLoading, setImgLoading] = useState(true);
  const [imgError,   setImgError]   = useState(false);

  const hasImage = !!poster.referenceImageUrl && !imgError;

  return (
    <View style={[styles.frame, { width: screenW, height: availableH }]}>

      {/* ── Fundal negru (vizibil în marginile din jurul posterului) ── */}
      <View style={styles.outerBg} />

      {/* ── Zona posterului ────────────────────────────────────────── */}
      <View
        style={[
          styles.posterArea,
          {
            left:   rect.x,
            top:    rect.y,
            width:  rect.width,
            height: rect.height,
          },
        ]}
      >
        {/* ── 1. Imaginea reală a posterului (sau placeholder) ──── */}
        {hasImage ? (
          <>
            <Image
              source={{ uri: poster.referenceImageUrl! }}
              style={styles.posterImage}
              resizeMode="cover"
              onLoadStart={() => setImgLoading(true)}
              onLoadEnd={()  => setImgLoading(false)}
              onError={()    => { setImgError(true); setImgLoading(false); }}
              fadeDuration={200}
            />
            {/* Spinner pe durata încărcării imaginii */}
            {imgLoading && (
              <View style={styles.imgLoader}>
                <ActivityIndicator color={Colors.accentPurple} size="small" />
              </View>
            )}
          </>
        ) : (
          <PosterPlaceholder
            posterId={poster.id}
            width={rect.width}
            height={rect.height}
          />
        )}

        {/* ── 2. Overlay semi-transparent peste poster ────────────
             Menține lizibilitatea strokeurilor clare pe orice imagine. */}
        <View style={styles.canvasOverlay} pointerEvents="none" />

        {/* ── 3. MuralCanvas SVG — desenele utilizatorilor ───────── */}
        <MuralCanvas
          layers={layers}
          posterWidth={rect.width}
          posterHeight={rect.height}
          posterX={rect.x}
          posterY={rect.y}
        />

        {/* ── 4. Corner marks decorativi ─────────────────────────── */}
        <View style={[styles.corner, styles.tl]} pointerEvents="none" />
        <View style={[styles.corner, styles.tr]} pointerEvents="none" />
        <View style={[styles.corner, styles.bl]} pointerEvents="none" />
        <View style={[styles.corner, styles.br]} pointerEvents="none" />
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CORNER = 16;
const BORDER = 1.5;

const styles = StyleSheet.create({
  frame: {
    position: 'relative',
    overflow: 'hidden',
  },
  outerBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#070709',
  },

  // ── Zona posterului ──────────────────────────────────────────
  posterArea: {
    position:        'absolute',
    borderRadius:    Radius.sm,
    overflow:        'hidden',
    // Umbră subtilă pentru a separa posterul de fundal
    shadowColor:     '#000',
    shadowOpacity:   0.8,
    shadowRadius:    16,
    shadowOffset:    { width: 0, height: 4 },
    elevation:       8,
  },

  // Imaginea reală a posterului — umple 100% din zonă
  posterImage: {
    ...StyleSheet.absoluteFillObject,
  },
  imgLoader: {
    ...StyleSheet.absoluteFillObject,
    alignItems:     'center',
    justifyContent: 'center',
    backgroundColor: '#0a0a10',
  },

  // Overlay semi-transparent peste poster — face desenele mai vizibile
  canvasOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
  },

  // ── Corner marks ────────────────────────────────────────────
  corner: {
    position: 'absolute',
    width:    CORNER,
    height:   CORNER,
    borderColor: 'rgba(255, 255, 255, 0.55)',
    borderWidth: BORDER,
  },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 2 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 2 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 2 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 2 },

  // ── Placeholder ──────────────────────────────────────────────
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems:     'center',
    justifyContent: 'center',
    overflow:       'hidden',
  },
  placeholderGrid: {
    ...StyleSheet.absoluteFillObject,
  },
  placeholderLine: {
    position:        'absolute',
    left:            0,
    right:           0,
    height:          1,
    backgroundColor: '#fff',
  },
  placeholderLabel: {
    color:         'rgba(255,255,255,0.08)',
    fontSize:      Typography.fontSizes.xs,
    fontWeight:    Typography.fontWeights.black,
    letterSpacing: Typography.letterSpacing.widest,
    textTransform: 'uppercase',
  },
});
