/**
 * src/hooks/useMuralCanvas.ts
 * Touch drawing cu live broadcast în timp real + sunet spray.
 *
 * Sunet spray:
 *  - Se încarcă o singură dată la mount cu expo-av (Audio.Sound)
 *  - Pornește în loop la onTouchStart
 *  - Se oprește imediat la onTouchEnd
 *
 * Fluxul live:
 *  onTouchStart → stroke:live phase:'start' broadcast imediat
 *  onTouchMove  → stroke:live phase:'move' broadcast throttled la 50ms
 *  onTouchEnd   → stroke:live phase:'end' + addLayerItem
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import { GestureResponderEvent } from 'react-native';
import { StrokePoint } from '../types/mural';
import { useMuralToolStore } from '../stores/muralToolStore';
import { usePosterStore } from '../stores/posterStore';
import { useAuthStore } from '../stores/authStore';
import { wsService } from '../services/wsService';

// expo-av — deja instalat în SDK 54 (deprecation warning ignorat)
let AVAudio: typeof import('expo-av').Audio | null = null;
try {
  AVAudio = require('expo-av').Audio;
} catch {
  // nu e disponibil — sunet dezactivat silențios
}

interface CanvasDimensions {
  width:   number;
  height:  number;
  offsetX: number;
  offsetY: number;
}

const THROTTLE_MS  = 50;
const MIN_POINTS   = 2;
const SPRAY_VOLUME = 0.6;

export function useMuralCanvas(canvasDimensions: CanvasDimensions) {
  const [activeStroke, setActiveStroke] = useState<StrokePoint[]>([]);
  const isDrawing        = useRef(false);
  const strokeIdRef      = useRef('');
  const lastBroadcastRef = useRef(0);
  const pendingPointsRef = useRef<StrokePoint[]>([]);

  // ── Spray sound ──────────────────────────────────────────────────────────────
  const soundRef     = useRef<InstanceType<typeof import('expo-av').Audio.Sound> | null>(null);
  const soundReady   = useRef(false);
  const soundPlaying = useRef(false);

  useEffect(() => {
    if (!AVAudio) return;
    let cancelled = false;

    (async () => {
      try {
        await AVAudio!.setAudioModeAsync({ playsInSilentModeIOS: true });
        const { sound } = await AVAudio!.Sound.createAsync(
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          require('../../app/_layout/spray.mp3'),
          { isLooping: true, volume: SPRAY_VOLUME, shouldPlay: false }
        );
        if (!cancelled) {
          soundRef.current  = sound;
          soundReady.current = true;
        } else {
          sound.unloadAsync();
        }
      } catch { /* fișier lipsă sau permisiune */ }
    })();

    return () => {
      cancelled = true;
      soundRef.current?.unloadAsync();
      soundRef.current   = null;
      soundReady.current = false;
      soundPlaying.current = false;
    };
  }, []);

  const startSound = useCallback(async () => {
    if (!soundReady.current || !soundRef.current || soundPlaying.current) return;
    try {
      await soundRef.current.setPositionAsync(0);
      await soundRef.current.playAsync();
      soundPlaying.current = true;
    } catch { /* silențios */ }
  }, []);

  const stopSound = useCallback(async () => {
    if (!soundRef.current || !soundPlaying.current) return;
    try {
      await soundRef.current.stopAsync();
      soundPlaying.current = false;
    } catch { /* silențios */ }
  }, []);

  // ── Tool state ───────────────────────────────────────────────────────────────

  const { activeTool, color, brushSize, opacity, selectedEmoji } = useMuralToolStore();
  const addLayerItem = usePosterStore((s) => s.addLayerItem);
  const poster       = usePosterStore((s) => s.poster);
  const user         = useAuthStore.getState().user;

  const toNormalized = useCallback(
    (px: number, py: number): StrokePoint => ({
      x: Math.max(0, Math.min(1, (px - canvasDimensions.offsetX) / canvasDimensions.width)),
      y: Math.max(0, Math.min(1, (py - canvasDimensions.offsetY) / canvasDimensions.height)),
    }),
    [canvasDimensions]
  );

  // ── Broadcast live stroke ────────────────────────────────────────────────────

  const broadcastLive = useCallback(
    (phase: 'start' | 'move' | 'end', points: StrokePoint[]) => {
      if (!poster || !user) return;
      if (activeTool === 'sticker' || activeTool === 'teamStamp') return;
      wsService.send({
        type:        'stroke:live',
        posterId:    poster.id,
        userId:      user.id,
        username:    user.username,
        teamId:      user.teamId,
        strokeId:    strokeIdRef.current,
        phase,
        points,
        color,
        strokeWidth: brushSize,
        opacity,
        toolType:    activeTool === 'erase' ? 'erase'
                   : activeTool === 'glow'  ? 'glow'
                   : activeTool === 'spray' ? 'spray'
                   : 'brush',
      } as any);
    },
    [poster, user, activeTool, color, brushSize, opacity]
  );

  const flushPending = useCallback(() => {
    const pts = pendingPointsRef.current;
    if (pts.length >= MIN_POINTS) broadcastLive('move', pts);
    pendingPointsRef.current = [];
    lastBroadcastRef.current = Date.now();
  }, [broadcastLive]);

  // ── Touch handlers ───────────────────────────────────────────────────────────

  const onTouchStart = useCallback(
    (e: GestureResponderEvent) => {
      const touch = e.nativeEvent.touches[0];

      if (activeTool === 'sticker') {
        addLayerItem({ type: 'sticker', position: toNormalized(touch.pageX, touch.pageY), emoji: selectedEmoji, scale: 1.2, rotation: Math.random() * 30 - 15 });
        return;
      }
      if (activeTool === 'teamStamp') {
        addLayerItem({ type: 'teamStamp', position: toNormalized(touch.pageX, touch.pageY), scale: 1.0 });
        return;
      }

      isDrawing.current        = true;
      strokeIdRef.current      = `${user?.id ?? 'anon'}_${Date.now()}`;
      pendingPointsRef.current = [];
      lastBroadcastRef.current = 0;

      const firstPoint = toNormalized(touch.pageX, touch.pageY);
      setActiveStroke([firstPoint]);

      startSound();
      broadcastLive('start', [firstPoint]);
    },
    [activeTool, toNormalized, addLayerItem, selectedEmoji, broadcastLive, user, startSound]
  );

  const onTouchMove = useCallback(
    (e: GestureResponderEvent) => {
      if (!isDrawing.current) return;
      const touch    = e.nativeEvent.touches[0];
      const newPoint = toNormalized(touch.pageX, touch.pageY);
      setActiveStroke((prev) => [...prev, newPoint]);
      pendingPointsRef.current.push(newPoint);
      if (Date.now() - lastBroadcastRef.current >= THROTTLE_MS) flushPending();
    },
    [toNormalized, flushPending]
  );

  const onTouchEnd = useCallback(() => {
    if (!isDrawing.current || activeStroke.length === 0) return;
    isDrawing.current = false;

    stopSound();

    if (pendingPointsRef.current.length > 0) flushPending();
    broadcastLive('end', []);

    if (activeTool === 'erase') {
      addLayerItem({ type: 'erase', points: activeStroke, strokeWidth: brushSize * 2 });
    } else {
      addLayerItem({
        type:        activeTool === 'glow' ? 'glow' : activeTool === 'spray' ? 'spray' : 'brush',
        points:      activeStroke,
        color,
        strokeWidth: brushSize,
        opacity,
      } as any);
    }

    setActiveStroke([]);
    pendingPointsRef.current = [];
  }, [activeTool, activeStroke, color, brushSize, opacity, addLayerItem, broadcastLive, flushPending, stopSound]);

  return { activeStroke, onTouchStart, onTouchMove, onTouchEnd };
}
