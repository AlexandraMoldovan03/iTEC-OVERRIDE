/**
 * app/(main)/vault.tsx  — Interactive Wall
 *
 * Gesture architecture:
 *  - PosterTile always claims touch on start
 *  - Starts a 500ms long-press timer on grant
 *  - Before timer fires: onPanResponderTerminationRequest=true
 *    → canvas can steal the gesture → canvas pans normally
 *  - After timer fires (long press detected): onPanResponderTerminationRequest=false
 *    → canvas cannot steal → poster drags
 *  - Short tap (no movement, <500ms): treated as navigation tap
 */

import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import {
  Animated, Dimensions, Image, PanResponder,
  StyleSheet, Text, TouchableOpacity, View,
  ActivityIndicator, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useVaultStore } from '../../src/stores/vaultStore';
import { useAuthStore }  from '../../src/stores/authStore';
import { supabase }      from '../../src/lib/supabase';
import { Poster }        from '../../src/types/poster';
import { Colors, Spacing, Typography } from '../../src/theme';
import { TEAM_COLORS }   from '../../src/theme/colors';

// ─── Canvas constants ─────────────────────────────────────────────────────────

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const CANVAS_W = 3200;
const CANVAS_H = 3200;
const POSTER_W = 138;
const POSTER_H = 192;
const COL_GAP  = 192;
const ROW_GAP  = 250;
const COLS     = 4;

const INIT_X = SCREEN_W / 2 - CANVAS_W / 2;
const INIT_Y = SCREEN_H / 2 - CANVAS_H / 2;
const MIN_X  = SCREEN_W - CANVAS_W;
const MAX_X  = 0;
const MIN_Y  = SCREEN_H - CANVAS_H;
const MAX_Y  = 0;

const LONG_PRESS_MS = 500;

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

// ─── AsyncStorage helpers ─────────────────────────────────────────────────────

const POS_KEY = (uid: string) => `wall_positions_v3_${uid}`;

async function loadStoredPos(uid: string): Promise<Record<string, { x: number; y: number }>> {
  try {
    const raw = await AsyncStorage.getItem(POS_KEY(uid));
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

async function saveStoredPos(uid: string, pos: Record<string, { x: number; y: number }>) {
  try { await AsyncStorage.setItem(POS_KEY(uid), JSON.stringify(pos)); } catch {}
}

// ─── Initial brick layout ─────────────────────────────────────────────────────

function defaultPositions(posters: Poster[]): Record<string, { x: number; y: number }> {
  const rows   = Math.ceil(posters.length / COLS);
  const totalW = COLS * COL_GAP - (COL_GAP - POSTER_W);
  const totalH = rows  * ROW_GAP - (ROW_GAP - POSTER_H);
  const startX = CANVAS_W / 2 - totalW / 2;
  const startY = CANVAS_H / 2 - totalH / 2;
  const out: Record<string, { x: number; y: number }> = {};
  posters.forEach((p, i) => {
    const col   = i % COLS;
    const row   = Math.floor(i / COLS);
    const shift = (row % 2) * (COL_GAP / 2);
    out[p.id]   = { x: startX + col * COL_GAP + shift, y: startY + row * ROW_GAP };
  });
  return out;
}

// ─── Wall background ──────────────────────────────────────────────────────────

const WallPattern = React.memo(function WallPattern() {
  return (
    <Svg width={CANVAS_W} height={CANVAS_H} style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <Defs>
        <Pattern id="bricks" x="0" y="0" width="200" height="64" patternUnits="userSpaceOnUse">
          <Rect x="1"   y="1"  width="97"  height="30" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          <Rect x="101" y="1"  width="97"  height="30" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          <Rect x="-49" y="33" width="97"  height="30" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          <Rect x="51"  y="33" width="97"  height="30" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          <Rect x="151" y="33" width="97"  height="30" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        </Pattern>
      </Defs>
      <Rect width={CANVAS_W} height={CANVAS_H} fill="#09090C" />
      <Rect width={CANVAS_W} height={CANVAS_H} fill="url(#bricks)" />
    </Svg>
  );
});

// ─── Poster tile ──────────────────────────────────────────────────────────────

interface TileProps {
  poster:      Poster;
  initX:       number;
  initY:       number;
  posX:        Animated.Value;
  posY:        Animated.Value;
  scaleAnim:   Animated.Value;
  layerCount:  number;
  pulseAnim:   Animated.Value;
  onDragEnd:   (id: string, x: number, y: number) => void;
  onTap:       (id: string) => void;
}

const PosterTile = React.memo(function PosterTile({
  poster, initX, initY, posX, posY, scaleAnim,
  layerCount, pulseAnim, onDragEnd, onTap,
}: TileProps) {

  // Always-current refs (updated inline during render)
  const onDragEndRef = useRef(onDragEnd);
  const onTapRef     = useRef(onTap);
  onDragEndRef.current = onDragEnd;
  onTapRef.current     = onTap;

  const curX          = useRef(initX);
  const curY          = useRef(initY);
  const dragStart     = useRef({ x: initX, y: initY });
  const longActive    = useRef(false);   // true once long-press threshold reached
  const longTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep curX/curY in sync when position is reset externally
  useEffect(() => {
    curX.current = initX;
    curY.current = initY;
    posX.setValue(initX);
    posY.setValue(initY);
  }, [initX, initY]);

  // ── PanResponder ────────────────────────────────────────────────────────────
  const dragPR = useRef(
    PanResponder.create({

      // Always claim on start so we can detect long-press
      onStartShouldSetPanResponder:        () => true,
      onStartShouldSetPanResponderCapture: () => false,

      // KEY: allow canvas to steal while long-press hasn't fired yet;
      //      once longActive=true the poster keeps the gesture.
      onPanResponderTerminationRequest: () => !longActive.current,

      onPanResponderGrant: () => {
        longActive.current  = false;
        dragStart.current   = { x: curX.current, y: curY.current };

        // Start long-press countdown
        longTimer.current = setTimeout(() => {
          longActive.current = true;
          // Pop animation when drag mode activates
          Animated.sequence([
            Animated.spring(scaleAnim, {
              toValue: 1.08, useNativeDriver: true, tension: 300, friction: 7,
            }),
          ]).start();
        }, LONG_PRESS_MS);
      },

      onPanResponderMove: (_, g) => {
        if (!longActive.current) return; // not yet in drag mode
        const nx = dragStart.current.x + g.dx;
        const ny = dragStart.current.y + g.dy;
        posX.setValue(nx);
        posY.setValue(ny);
        curX.current = nx;
        curY.current = ny;
      },

      onPanResponderRelease: (_, g) => {
        if (longTimer.current) { clearTimeout(longTimer.current); longTimer.current = null; }

        Animated.spring(scaleAnim, {
          toValue: 1, useNativeDriver: true, tension: 200, friction: 7,
        }).start();

        if (longActive.current) {
          // Save final position
          const nx = dragStart.current.x + g.dx;
          const ny = dragStart.current.y + g.dy;
          posX.setValue(nx);
          posY.setValue(ny);
          curX.current = nx;
          curY.current = ny;
          onDragEndRef.current(poster.id, nx, ny);
          longActive.current = false;
        } else {
          // Short tap: navigate only if barely moved
          if (Math.abs(g.dx) < 6 && Math.abs(g.dy) < 6) {
            onTapRef.current(poster.id);
          }
        }
      },

      onPanResponderTerminate: () => {
        // Canvas (or OS) stole the gesture — cancel everything, snap back
        if (longTimer.current) { clearTimeout(longTimer.current); longTimer.current = null; }
        longActive.current = false;
        Animated.spring(scaleAnim, {
          toValue: 1, useNativeDriver: true, tension: 200, friction: 7,
        }).start();
      },
    }),
  ).current;

  const teamColor = poster.territory?.ownerTeamId
    ? TEAM_COLORS[poster.territory.ownerTeamId]?.primary
    : null;

  return (
    // Outer: no overflow:hidden so badge can bleed outside
    <Animated.View
      {...dragPR.panHandlers}
      style={[
        styles.tileOuter,
        {
          transform: [
            { translateX: posX },
            { translateY: posY },
            { scale: scaleAnim },
          ],
        },
      ]}
    >
      {/* Inner: clips image, shows border */}
      <View
        style={[
          styles.tile,
          { borderColor: teamColor ?? 'rgba(255,255,255,0.13)' },
        ]}
      >
        {poster.referenceImageUrl ? (
          <Image
            source={{ uri: poster.referenceImageUrl }}
            style={styles.tileImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.tilePlaceholder}>
            <Text style={styles.tilePlaceholderIcon}>🖼</Text>
          </View>
        )}

        <View style={styles.tileInfo}>
          <Text style={styles.tileName} numberOfLines={1}>{poster.name}</Text>
          {teamColor && <View style={[styles.teamDot, { backgroundColor: teamColor }]} />}
        </View>
      </View>

      {/* Layer count badge — outside overflow:hidden area */}
      {layerCount > 0 && (
        <Animated.View
          style={[styles.badge, { transform: [{ scale: pulseAnim }] }]}
          pointerEvents="none"
        >
          <Text style={styles.badgeText}>{layerCount > 99 ? '99+' : layerCount}</Text>
        </Animated.View>
      )}
    </Animated.View>
  );
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function VaultScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user   = useAuthStore((s) => s.user);
  const { posters, isLoading, loadVault } = useVaultStore();

  const [positions, setPositions]     = useState<Record<string, { x: number; y: number }>>({});
  const [layerCounts, setLayerCounts] = useState<Record<string, number>>({});
  const [posReady, setPosReady]       = useState(false);

  // ── Animated values ───────────────────────────────────────────────────────

  const canvasX   = useMemo(() => new Animated.Value(INIT_X), []);
  const canvasY   = useMemo(() => new Animated.Value(INIT_Y), []);
  const canvasOff = useRef({ x: INIT_X, y: INIT_Y });
  const panStart  = useRef({ x: INIT_X, y: INIT_Y });

  // Per-poster Animated values
  const posAnims   = useRef<Record<string, { x: Animated.Value; y: Animated.Value; scale: Animated.Value }>>({});
  const pulseAnims = useRef<Record<string, Animated.Value>>({});

  // ── Load vault ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (user?.id) loadVault(user.id);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || posters.length === 0) return;

    loadStoredPos(user.id).then((stored) => {
      const defaults = defaultPositions(posters);
      const merged: Record<string, { x: number; y: number }> = {};

      posters.forEach((p) => {
        merged[p.id] = stored[p.id] ?? defaults[p.id];
        const pos    = merged[p.id];

        if (!posAnims.current[p.id]) {
          posAnims.current[p.id] = {
            x:     new Animated.Value(pos.x),
            y:     new Animated.Value(pos.y),
            scale: new Animated.Value(1),
          };
        }
        if (!pulseAnims.current[p.id]) {
          pulseAnims.current[p.id] = new Animated.Value(1);
        }
      });

      setPositions(merged);
      setPosReady(true);
    });
  }, [posters.length, user?.id]);

  // ── Realtime layer counts ─────────────────────────────────────────────────

  useEffect(() => {
    if (posters.length === 0) return;
    const ids = posters.map((p) => p.id);

    supabase
      .from('mural_layers')
      .select('poster_id')
      .in('poster_id', ids)
      .then(({ data }) => {
        if (!data) return;
        const counts: Record<string, number> = {};
        data.forEach((row) => { counts[row.poster_id] = (counts[row.poster_id] ?? 0) + 1; });
        setLayerCounts(counts);
      });

    const ch = supabase
      .channel('vault_layers')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mural_layers' },
        (payload) => {
          const pid = payload.new?.poster_id as string | undefined;
          if (!pid || !ids.includes(pid)) return;
          setLayerCounts((prev) => ({ ...prev, [pid]: (prev[pid] ?? 0) + 1 }));
          const anim = pulseAnims.current[pid];
          if (anim) {
            Animated.sequence([
              Animated.timing(anim, { toValue: 1.5, duration: 140, useNativeDriver: true }),
              Animated.spring(anim,  { toValue: 1, useNativeDriver: true, bounciness: 14 }),
            ]).start();
          }
        })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [posters.map((p) => p.id).join(',')]);

  // ── Drag end handler ──────────────────────────────────────────────────────

  const handleDragEnd = useCallback(
    (id: string, x: number, y: number) => {
      setPositions((prev) => {
        const updated = { ...prev, [id]: { x, y } };
        if (user?.id) saveStoredPos(user.id, updated);
        return updated;
      });
    },
    [user?.id],
  );

  const handleTap = useCallback(
    (id: string) => { router.push(`/poster/${id}`); },
    [router],
  );

  // ── Canvas PanResponder ───────────────────────────────────────────────────
  // onStart=false → only claims on move; poster long-press takes priority
  // because onPanResponderTerminationRequest on the poster returns false once
  // the long-press fires, blocking the canvas from stealing.

  const canvasPR = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder:        () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder:         () => true,
      onMoveShouldSetPanResponderCapture:  () => false,

      onPanResponderGrant: () => {
        panStart.current = { ...canvasOff.current };
      },

      onPanResponderMove: (_, g) => {
        canvasX.setValue(clamp(panStart.current.x + g.dx, MIN_X, MAX_X));
        canvasY.setValue(clamp(panStart.current.y + g.dy, MIN_Y, MAX_Y));
      },

      onPanResponderRelease: (_, g) => {
        const nx = clamp(panStart.current.x + g.dx, MIN_X, MAX_X);
        const ny = clamp(panStart.current.y + g.dy, MIN_Y, MAX_Y);
        canvasX.setValue(nx);
        canvasY.setValue(ny);
        canvasOff.current = { x: nx, y: ny };
      },
    }),
  ).current;

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading && !posReady) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.accentPurple} size="large" />
        <Text style={styles.loadingText}>Loading your wall…</Text>
      </View>
    );
  }

  if (!isLoading && posters.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyIcon}>🧱</Text>
        <Text style={styles.emptyTitle}>Your wall is empty</Text>
        <Text style={styles.emptyBody}>Scan a real poster to add it to your wall.</Text>
        <TouchableOpacity style={styles.scanBtn} onPress={() => router.push('/scanner')} activeOpacity={0.85}>
          <Text style={styles.scanBtnText}>SCAN NOW</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screen}>

      {/* ── Pannable canvas ── */}
      <View style={styles.canvasWrap} {...canvasPR.panHandlers}>
        <Animated.View
          style={[styles.canvas, { transform: [{ translateX: canvasX }, { translateY: canvasY }] }]}
        >
          <WallPattern />

          {posReady && posters.map((poster) => {
            const anim  = posAnims.current[poster.id];
            const pulse = pulseAnims.current[poster.id];
            const pos   = positions[poster.id];
            if (!anim || !pulse || !pos) return null;

            return (
              <PosterTile
                key={poster.id}
                poster={poster}
                initX={pos.x}
                initY={pos.y}
                posX={anim.x}
                posY={anim.y}
                scaleAnim={anim.scale}
                layerCount={layerCounts[poster.id] ?? 0}
                pulseAnim={pulse}
                onDragEnd={handleDragEnd}
                onTap={handleTap}
              />
            );
          })}
        </Animated.View>
      </View>

      {/* ── Header overlay ── */}
      <View style={[styles.header, { paddingTop: insets.top + 6 }]} pointerEvents="box-none">
        <View style={styles.headerRow} pointerEvents="none">
          <View>
            <Text style={styles.headerTitle}>YOUR WALL</Text>
            <Text style={styles.headerSub}>
              {posters.length} poster{posters.length !== 1 ? 's' : ''}
              {'  •  hold a poster to move it'}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Scan FAB ── */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 20 }]}
        onPress={() => router.push('/scanner')}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons name="scan-helper" size={20} color="#000" />
        <Text style={styles.fabTxt}>SCAN</Text>
      </TouchableOpacity>

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#09090C' },

  canvasWrap: { flex: 1, overflow: 'hidden' },
  canvas: {
    position: 'absolute',
    width:    CANVAS_W,
    height:   CANVAS_H,
  },

  // ── Tile ──────────────────────────────────────────────────────────────────
  tileOuter: {
    position: 'absolute',
    width:    POSTER_W,
    height:   POSTER_H,
    ...Platform.select({
      ios: {
        shadowColor:   '#000',
        shadowOffset:  { width: 0, height: 6 },
        shadowOpacity: 0.7,
        shadowRadius:  10,
      },
    }),
  },
  tile: {
    flex:            1,
    borderRadius:    10,
    overflow:        'hidden',
    backgroundColor: '#111115',
    borderWidth:     1,
    borderColor:     'rgba(255,255,255,0.13)',
  },
  tileImage: {
    width:  '100%',
    height: POSTER_H - 34,
  },
  tilePlaceholder: {
    width:           '100%',
    height:          POSTER_H - 34,
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: '#1A1A20',
  },
  tilePlaceholderIcon: { fontSize: 30 },
  tileInfo: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: 7,
    paddingVertical:   6,
    backgroundColor:   'rgba(0,0,0,0.9)',
    gap:               5,
  },
  tileName: {
    flex:          1,
    color:         Colors.textPrimary,
    fontSize:      9,
    fontWeight:    '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  teamDot: { width: 7, height: 7, borderRadius: 999 },

  badge: {
    position:          'absolute',
    top:               -7,
    left:              -7,
    minWidth:          22,
    height:            22,
    borderRadius:      999,
    backgroundColor:   Colors.accentPink,
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: 5,
    borderWidth:       1.5,
    borderColor:       '#09090C',
  },
  badgeText: {
    color:         '#fff',
    fontSize:      9,
    fontWeight:    '900',
    letterSpacing: 0.3,
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    position:          'absolute',
    top: 0, left: 0, right: 0,
    paddingHorizontal: Spacing[4],
    paddingBottom:     10,
    backgroundColor:   'rgba(9,9,12,0.82)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  headerRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color:         Colors.textPrimary,
    fontSize:      Typography.fontSizes.lg,
    fontWeight:    Typography.fontWeights.black,
    letterSpacing: Typography.letterSpacing.widest,
    textTransform: 'uppercase',
  },
  headerSub: {
    color:         Colors.textMuted,
    fontSize:      10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop:     2,
  },

  // ── FAB ───────────────────────────────────────────────────────────────────
  fab: {
    position:          'absolute',
    right:             20,
    flexDirection:     'row',
    alignItems:        'center',
    gap:               6,
    paddingHorizontal: 18,
    paddingVertical:   12,
    borderRadius:      999,
    backgroundColor:   Colors.accentCyan,
    ...Platform.select({
      ios: {
        shadowColor:   Colors.accentCyan,
        shadowOffset:  { width: 0, height: 0 },
        shadowOpacity: 0.55,
        shadowRadius:  12,
      },
    }),
  },
  fabTxt: {
    color:         '#000',
    fontSize:      12,
    fontWeight:    '900',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },

  // ── Empty / loading ───────────────────────────────────────────────────────
  center: {
    flex:              1,
    alignItems:        'center',
    justifyContent:    'center',
    backgroundColor:   '#09090C',
    gap:               Spacing[3],
    paddingHorizontal: Spacing[8],
  },
  loadingText: {
    color:         Colors.textMuted,
    fontSize:      Typography.fontSizes.sm,
    letterSpacing: 0.5,
    marginTop:     Spacing[2],
  },
  emptyIcon:  { fontSize: 64, marginBottom: Spacing[2] },
  emptyTitle: {
    color:         Colors.textPrimary,
    fontSize:      Typography.fontSizes.xl,
    fontWeight:    Typography.fontWeights.black,
    letterSpacing: Typography.letterSpacing.wider,
    textTransform: 'uppercase',
    textAlign:     'center',
  },
  emptyBody: {
    color:      Colors.textMuted,
    fontSize:   Typography.fontSizes.sm,
    textAlign:  'center',
    lineHeight: 20,
  },
  scanBtn: {
    marginTop:         Spacing[4],
    paddingHorizontal: 28,
    paddingVertical:   13,
    borderRadius:      999,
    backgroundColor:   Colors.accentCyan,
  },
  scanBtnText: {
    color:         '#000',
    fontSize:      13,
    fontWeight:    '900',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
});
