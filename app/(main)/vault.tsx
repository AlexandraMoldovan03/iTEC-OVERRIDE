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
  ActivityIndicator, Platform, Modal, Vibration,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Defs, Pattern, Rect, Path, Circle, G, Text as SvgText } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useVaultStore } from '../../src/stores/vaultStore';
import { useAuthStore } from '../../src/stores/authStore';
import { supabase } from '../../src/lib/supabase';
import { Poster } from '../../src/types/poster';
import { Colors, Spacing, Typography } from '../../src/theme';
import { TEAM_COLORS } from '../../src/theme/colors';
import { PosterLayerItem, BrushStrokeItem, StickerItem, TeamStampItem } from '../../src/types/mural';
import { TeamId } from '../../src/types/team';
import { posterService } from '../../src/services/posterService';
import { ARPreviewModal } from '../../src/components/poster/ARPreviewModal';
import { LeaderAlert } from '../../src/components/poster/LeaderAlert';
import { computePlayerScores } from '../../src/utils/scoring';

const CAT_ALERT_1 = require('../_layout/cat1.png');
const CAT_ALERT_2 = require('../_layout/cat2.png');

// ─── Canvas constants ─────────────────────────────────────────────────────────

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const CANVAS_W = 3200;
const CANVAS_H = 3200;
const POSTER_W = 138;
const POSTER_H = 192;
const COL_GAP = 192;
const ROW_GAP = 250;
const COLS = 4;

const INIT_X = SCREEN_W / 2 - CANVAS_W / 2;
const INIT_Y = SCREEN_H / 2 - CANVAS_H / 2;
const MIN_X = SCREEN_W - CANVAS_W;
const MAX_X = 0;
const MIN_Y = SCREEN_H - CANVAS_H;
const MAX_Y = 0;

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
  } catch {
    return {};
  }
}

async function saveStoredPos(uid: string, pos: Record<string, { x: number; y: number }>) {
  try {
    await AsyncStorage.setItem(POS_KEY(uid), JSON.stringify(pos));
  } catch {}
}

// ─── Initial brick layout ─────────────────────────────────────────────────────

function defaultPositions(posters: Poster[]): Record<string, { x: number; y: number }> {
  const rows = Math.ceil(posters.length / COLS);
  const totalW = COLS * COL_GAP - (COL_GAP - POSTER_W);
  const totalH = rows * ROW_GAP - (ROW_GAP - POSTER_H);
  const startX = CANVAS_W / 2 - totalW / 2;
  const startY = CANVAS_H / 2 - totalH / 2;
  const out: Record<string, { x: number; y: number }> = {};

  posters.forEach((p, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const shift = (row % 2) * (COL_GAP / 2);
    out[p.id] = { x: startX + col * COL_GAP + shift, y: startY + row * ROW_GAP };
  });

  return out;
}

// ─── Wall background ──────────────────────────────────────────────────────────

const WallPattern = React.memo(function WallPattern() {
  return (
    <Svg width={CANVAS_W} height={CANVAS_H} style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <Defs>
        <Pattern id="bricks" x="0" y="0" width="200" height="64" patternUnits="userSpaceOnUse">
          <Rect x="1" y="1" width="97" height="30" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          <Rect x="101" y="1" width="97" height="30" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          <Rect x="-49" y="33" width="97" height="30" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          <Rect x="51" y="33" width="97" height="30" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          <Rect x="151" y="33" width="97" height="30" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        </Pattern>
      </Defs>
      <Rect width={CANVAS_W} height={CANVAS_H} fill="#09090C" />
      <Rect width={CANVAS_W} height={CANVAS_H} fill="url(#bricks)" />
    </Svg>
  );
});

// ─── Tile mural overlay ───────────────────────────────────────────────────────

const TILE_IMG_H = POSTER_H - 34;
const CANVAS_REF_W = 350;
const STROKE_SCALE = POSTER_W / CANVAS_REF_W;

interface OverlayProps {
  layers: PosterLayerItem[];
}

const TileMuralOverlay = React.memo(function TileMuralOverlay({ layers }: OverlayProps) {
  if (!layers || layers.length === 0) return null;

  const w = POSTER_W;
  const h = TILE_IMG_H;

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
    <Svg
      width={w}
      height={h}
      style={StyleSheet.absoluteFillObject}
      pointerEvents="none"
    >
      {layers.map((item) => {
        const d = item.data;
        const teamColor = TEAM_COLORS[item.teamId as TeamId];
        const glowCol = teamColor?.glow ?? '#ffffff';
        const primCol = teamColor?.primary ?? '#888888';

        if (d.type === 'brush' || d.type === 'spray' || d.type === 'glow') {
          const stroke = d as BrushStrokeItem;
          const pathD = toPath(stroke.points);
          if (!pathD) return null;

          const isGlow = d.type === 'glow';
          const glowW = (stroke.strokeWidth + (isGlow ? 12 : 7)) * STROKE_SCALE;
          const strokeW = Math.max(0.8, stroke.strokeWidth * STROKE_SCALE);

          return (
            <G key={item.id}>
              <Path
                d={pathD}
                stroke={glowCol}
                strokeWidth={glowW}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                opacity={isGlow ? 0.75 : 0.62}
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
              stroke="#000000"
              strokeWidth={Math.max(1, d.strokeWidth * STROKE_SCALE)}
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
              fontSize={Math.max(6, 11 * s.scale)}
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
          const r = Math.max(4, 7 * ts.scale);

          return (
            <G key={item.id}>
              <Circle
                cx={toX(ts.position.x)}
                cy={toY(ts.position.y)}
                r={r}
                fill={primCol + '44'}
                stroke={primCol}
                strokeWidth={1}
              />
            </G>
          );
        }

        return null;
      })}
    </Svg>
  );
});

// ─── Poster tile ──────────────────────────────────────────────────────────────

interface TileProps {
  poster: Poster;
  initX: number;
  initY: number;
  posX: Animated.Value;
  posY: Animated.Value;
  scaleAnim: Animated.Value;
  layerCount: number;
  layers: PosterLayerItem[];
  pulseAnim: Animated.Value;
  onDragEnd: (id: string, x: number, y: number) => void;
  onTap: (id: string) => void;
}

const PosterTile = React.memo(function PosterTile({
  poster, initX, initY, posX, posY, scaleAnim,
  layerCount, layers, pulseAnim, onDragEnd, onTap,
}: TileProps) {
  const onDragEndRef = useRef(onDragEnd);
  const onTapRef = useRef(onTap);
  onDragEndRef.current = onDragEnd;
  onTapRef.current = onTap;

  const curX = useRef(initX);
  const curY = useRef(initY);
  const dragStart = useRef({ x: initX, y: initY });
  const longActive = useRef(false);
  const longTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    curX.current = initX;
    curY.current = initY;
    posX.setValue(initX);
    posY.setValue(initY);
  }, [initX, initY, posX, posY]);

  const dragPR = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => false,
      onPanResponderTerminationRequest: () => !longActive.current,

      onPanResponderGrant: () => {
        longActive.current = false;
        dragStart.current = { x: curX.current, y: curY.current };

        longTimer.current = setTimeout(() => {
          longActive.current = true;
          Animated.spring(scaleAnim, {
            toValue: 1.08,
            useNativeDriver: true,
            tension: 300,
            friction: 7,
          }).start();
        }, LONG_PRESS_MS);
      },

      onPanResponderMove: (_, g) => {
        if (!longActive.current) return;
        const nx = dragStart.current.x + g.dx;
        const ny = dragStart.current.y + g.dy;
        posX.setValue(nx);
        posY.setValue(ny);
        curX.current = nx;
        curY.current = ny;
      },

      onPanResponderRelease: (_, g) => {
        if (longTimer.current) {
          clearTimeout(longTimer.current);
          longTimer.current = null;
        }

        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 200,
          friction: 7,
        }).start();

        if (longActive.current) {
          const nx = dragStart.current.x + g.dx;
          const ny = dragStart.current.y + g.dy;
          posX.setValue(nx);
          posY.setValue(ny);
          curX.current = nx;
          curY.current = ny;
          onDragEndRef.current(poster.id, nx, ny);
          longActive.current = false;
        } else if (Math.abs(g.dx) < 6 && Math.abs(g.dy) < 6) {
          onTapRef.current(poster.id);
        }
      },

      onPanResponderTerminate: () => {
        if (longTimer.current) {
          clearTimeout(longTimer.current);
          longTimer.current = null;
        }
        longActive.current = false;
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 200,
          friction: 7,
        }).start();
      },
    }),
  ).current;

  const teamColor = poster.territory?.ownerTeamId
    ? TEAM_COLORS[poster.territory.ownerTeamId]?.primary
    : null;

  return (
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
      <View
        style={[
          styles.tile,
          { borderColor: teamColor ?? 'rgba(255,255,255,0.13)' },
        ]}
      >
        <View style={styles.tileImageWrap}>
          {poster.referenceImageUrl ? (
            <Image
              source={{ uri: poster.referenceImageUrl }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.tilePlaceholder}>
              <Text style={styles.tilePlaceholderIcon}>🖼</Text>
            </View>
          )}

          <TileMuralOverlay layers={layers} />
        </View>

        <View style={styles.tileInfo}>
          <Text style={styles.tileName} numberOfLines={1}>{poster.name}</Text>
          {teamColor && <View style={[styles.teamDot, { backgroundColor: teamColor }]} />}
        </View>
      </View>

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
  const user = useAuthStore((s) => s.user);
  const { posters, isLoading, loadVault } = useVaultStore();

  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [layerCounts, setLayerCounts] = useState<Record<string, number>>({});
  const [layersMap, setLayersMap] = useState<Record<string, PosterLayerItem[]>>({});
  const [posReady, setPosReady] = useState(false);
  const [selectedPosterId, setSelected] = useState<string | null>(null);
  const [arPosterId, setArPosterId] = useState<string | null>(null);

  const [showLeaderLost, setShowLeaderLost] = useState(false);
  const [catVariant, setCatVariant] = useState<1 | 2>(1);
  const alertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaderMapRef = useRef<Record<string, string | null>>({});

  const canvasX = useMemo(() => new Animated.Value(INIT_X), []);
  const canvasY = useMemo(() => new Animated.Value(INIT_Y), []);
  const canvasOff = useRef({ x: INIT_X, y: INIT_Y });
  const panStart = useRef({ x: INIT_X, y: INIT_Y });

  const posAnims = useRef<Record<string, { x: Animated.Value; y: Animated.Value; scale: Animated.Value }>>({});
  const pulseAnims = useRef<Record<string, Animated.Value>>({});

  // ── Load vault ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (user?.id) loadVault(user.id);
  }, [user?.id, loadVault]);

  useEffect(() => {
    if (!user?.id || posters.length === 0) return;

    loadStoredPos(user.id).then((stored) => {
      const defaults = defaultPositions(posters);
      const merged: Record<string, { x: number; y: number }> = {};

      posters.forEach((p) => {
        merged[p.id] = stored[p.id] ?? defaults[p.id];
        const pos = merged[p.id];

        if (!posAnims.current[p.id]) {
          posAnims.current[p.id] = {
            x: new Animated.Value(pos.x),
            y: new Animated.Value(pos.y),
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
  }, [posters, user?.id]);

  // ── Alert helper ───────────────────────────────────────────────────────────

  const triggerLeaderLostAlert = useCallback(() => {
    setCatVariant((v) => (v === 1 ? 2 : 1));
    setShowLeaderLost(true);
    Vibration.vibrate([0, 140, 90, 180]);

    if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
    alertTimerRef.current = setTimeout(() => setShowLeaderLost(false), 3000);
  }, []);

  // ── Sync one poster fully from DB ──────────────────────────────────────────

  const syncPosterLayers = useCallback(
    async (posterId: string) => {
      try {
        const freshLayers = await posterService
          .fetchLayers(posterId)
          .catch(() => [] as PosterLayerItem[]);

        setLayersMap((prev) => {
          const prevLayers = prev[posterId] ?? [];

          const prevLeader = computePlayerScores(prevLayers)[0]?.userId ?? null;
          const newLeader = computePlayerScores(freshLayers)[0]?.userId ?? null;

          leaderMapRef.current[posterId] = newLeader;

          if (prevLeader === user?.id && newLeader !== user?.id) {
            triggerLeaderLostAlert();
          }

          return {
            ...prev,
            [posterId]: freshLayers,
          };
        });

        setLayerCounts((prev) => ({
          ...prev,
          [posterId]: freshLayers.length,
        }));
      } catch {
        // silent fail
      }
    },
    [user?.id, triggerLeaderLostAlert],
  );

  // ── Câte postere conduc? ──────────────────────────────────────────────────

  const leaderCount = useMemo(() => {
    if (!user?.id) return 0;

    return posters.filter((p) => {
      const layers = layersMap[p.id];
      if (!layers || layers.length === 0) return false;
      return computePlayerScores(layers)[0]?.userId === user.id;
    }).length;
  }, [layersMap, posters, user?.id]);

  // ── Initial full fetch of layers ───────────────────────────────────────────

  useEffect(() => {
    if (posters.length === 0) return;

    let cancelled = false;

    (async () => {
      try {
        const results = await Promise.all(
          posters.map((p) =>
            posterService.fetchLayers(p.id).catch(() => [] as PosterLayerItem[])
          )
        );

        if (cancelled) return;

        const nextLayersMap: Record<string, PosterLayerItem[]> = {};
        const nextCounts: Record<string, number> = {};
        const nextLeaderMap: Record<string, string | null> = {};

        posters.forEach((p, i) => {
          const layers = results[i] ?? [];
          nextLayersMap[p.id] = layers;
          nextCounts[p.id] = layers.length;
          nextLeaderMap[p.id] = computePlayerScores(layers)[0]?.userId ?? null;
        });

        setLayersMap(nextLayersMap);
        setLayerCounts(nextCounts);
        leaderMapRef.current = nextLeaderMap;
      } catch {
        // silent fail
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [posters]);

  // ── Realtime sync ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (posters.length === 0) return;

    const ids = posters.map((p) => p.id);

    const runPulse = (posterId: string) => {
      const anim = pulseAnims.current[posterId];
      if (!anim) return;

      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1.5,
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.spring(anim, {
          toValue: 1,
          useNativeDriver: true,
          bounciness: 14,
        }),
      ]).start();
    };

    const handleRealtimeChange = async (payload: any) => {
      const pid =
        (payload?.new?.poster_id as string | undefined) ??
        (payload?.old?.poster_id as string | undefined);

      if (!pid || !ids.includes(pid)) return;

      runPulse(pid);
      await syncPosterLayers(pid);
    };

    const ch = supabase
      .channel('vault_layers_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mural_layers' },
        handleRealtimeChange,
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'mural_layers' },
        handleRealtimeChange,
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'mural_layers' },
        handleRealtimeChange,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [posters, syncPosterLayers]);

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

  useEffect(() => {
    return () => {
      if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
      Vibration.cancel();
    };
  }, []);

  const handleTap = useCallback((id: string) => {
    setSelected(id);
  }, []);

  // ── Canvas PanResponder ───────────────────────────────────────────────────

  const canvasPR = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => false,

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
        <TouchableOpacity
          style={styles.scanBtn}
          onPress={() => router.push('/scanner')}
          activeOpacity={0.85}
        >
          <Text style={styles.scanBtnText}>SCAN NOW</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <LeaderAlert
        visible={showLeaderLost}
        imageSource={catVariant === 1 ? CAT_ALERT_1 : CAT_ALERT_2}
        title="Sorry..."
        subtitle="Someone just took your #1 spot on a poster!"
      />

      <View style={styles.canvasWrap} {...canvasPR.panHandlers}>
        <Animated.View
          style={[
            styles.canvas,
            { transform: [{ translateX: canvasX }, { translateY: canvasY }] },
          ]}
        >
          <WallPattern />

          {posReady && posters.map((poster) => {
            const anim = posAnims.current[poster.id];
            const pulse = pulseAnims.current[poster.id];
            const pos = positions[poster.id];
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
                layers={layersMap[poster.id] ?? []}
                pulseAnim={pulse}
                onDragEnd={handleDragEnd}
                onTap={handleTap}
              />
            );
          })}
        </Animated.View>
      </View>

      <View style={[styles.header, { paddingTop: insets.top + 6 }]} pointerEvents="box-none">
        <View style={styles.headerRow} pointerEvents="none">
          <View>
            <Text style={styles.headerTitle}>YOUR WALL</Text>
            <Text style={styles.headerSub}>
              {posters.length} poster{posters.length !== 1 ? 's' : ''}
              {'  •  hold to move'}
            </Text>
          </View>

          {leaderCount > 0 && (
            <View style={styles.leaderBadge}>
              <Text style={styles.leaderBadgeIcon}>👑</Text>
              <Text style={styles.leaderBadgeText}>
                {leaderCount} leader{leaderCount !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 20 }]}
        onPress={() => router.push('/scanner')}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons name="scan-helper" size={20} color="#000" />
        <Text style={styles.fabTxt}>SCAN</Text>
      </TouchableOpacity>

      <Modal
        visible={!!selectedPosterId}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setSelected(null)}
      >
        <TouchableOpacity
          style={styles.sheetBackdrop}
          activeOpacity={1}
          onPress={() => setSelected(null)}
        />

        {(() => {
          const sel = posters.find((p) => p.id === selectedPosterId);
          if (!sel) return null;

          const tc = sel.territory?.ownerTeamId
            ? TEAM_COLORS[sel.territory.ownerTeamId]?.primary
            : null;

          return (
            <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
              <View style={styles.sheetHandle} />

              <View style={styles.sheetHeader}>
                {tc && <View style={[styles.sheetTeamDot, { backgroundColor: tc }]} />}
                <Text style={styles.sheetTitle} numberOfLines={1}>{sel.name}</Text>
              </View>

              <TouchableOpacity
                style={styles.sheetBtn}
                activeOpacity={0.82}
                onPress={() => {
                  setSelected(null);
                  router.push(`/poster/${sel.id}`);
                }}
              >
                <MaterialCommunityIcons name="sword-cross" size={20} color="#000" />
                <Text style={styles.sheetBtnText}>ENTER BATTLE ROOM</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sheetBtn, styles.sheetBtnAR]}
                activeOpacity={0.82}
                onPress={() => {
                  setSelected(null);
                  setArPosterId(sel.id);
                }}
              >
                <MaterialCommunityIcons name="augmented-reality" size={20} color="#00E5FF" />
                <Text style={[styles.sheetBtnText, { color: '#00E5FF' }]}>AR PREVIEW</Text>
              </TouchableOpacity>
            </View>
          );
        })()}
      </Modal>

      {arPosterId && (() => {
        const arPoster = posters.find((p) => p.id === arPosterId);
        return (
          <ARPreviewModal
            visible
            posterName={arPoster?.name ?? ''}
            layers={layersMap[arPosterId] ?? []}
            onClose={() => setArPosterId(null)}
          />
        );
      })()}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#09090C' },

  canvasWrap: { flex: 1, overflow: 'hidden' },
  canvas: {
    position: 'absolute',
    width: CANVAS_W,
    height: CANVAS_H,
  },

  tileOuter: {
    position: 'absolute',
    width: POSTER_W,
    height: POSTER_H,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.7,
        shadowRadius: 10,
      },
    }),
  },
  tile: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#111115',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
  },
  tileImageWrap: {
    width: '100%',
    height: TILE_IMG_H,
    overflow: 'hidden',
    position: 'relative',
  },
  tilePlaceholder: {
    width: '100%',
    height: TILE_IMG_H,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1A20',
  },
  tilePlaceholderIcon: { fontSize: 30 },
  tileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.9)',
    gap: 5,
  },
  tileName: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  teamDot: { width: 7, height: 7, borderRadius: 999 },

  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#111115',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 10,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sheetTeamDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  sheetTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.4,
    flex: 1,
  },
  sheetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#00E5FF',
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  sheetBtnAR: {
    backgroundColor: 'rgba(0,229,255,0.08)',
    borderWidth: 1.5,
    borderColor: '#00E5FF',
  },
  sheetBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.1,
  },

  badge: {
    position: 'absolute',
    top: -7,
    left: -7,
    minWidth: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: Colors.accentPink,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderWidth: 1.5,
    borderColor: '#09090C',
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.3,
  },

  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing[4],
    paddingBottom: 10,
    backgroundColor: 'rgba(9,9,12,0.82)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,215,0,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.4)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  leaderBadgeIcon: { fontSize: 13 },
  leaderBadgeText: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  headerTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.black,
    letterSpacing: Typography.letterSpacing.widest,
    textTransform: 'uppercase',
  },
  headerSub: {
    color: Colors.textMuted,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 2,
  },

  fab: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: Colors.accentCyan,
    ...Platform.select({
      ios: {
        shadowColor: Colors.accentCyan,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.55,
        shadowRadius: 12,
      },
    }),
  },
  fabTxt: {
    color: '#000',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#09090C',
    gap: Spacing[3],
    paddingHorizontal: Spacing[8],
  },
  loadingText: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.sm,
    letterSpacing: 0.5,
    marginTop: Spacing[2],
  },
  emptyIcon: { fontSize: 64, marginBottom: Spacing[2] },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.black,
    letterSpacing: Typography.letterSpacing.wider,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  emptyBody: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  scanBtn: {
    marginTop: Spacing[4],
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 999,
    backgroundColor: Colors.accentCyan,
  },
  scanBtnText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
});