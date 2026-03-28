/**
 * src/hooks/useMuralCanvas.ts
 * Touch drawing cu live broadcast în timp real.
 *
 * Fluxul live:
 *  onTouchStart → stroke:live phase:'start' broadcast imediat
 *  onTouchMove  → stroke:live phase:'move' broadcast throttled la 50ms
 *                 (nu inundăm canalul cu fiecare pixel)
 *  onTouchEnd   → stroke:live phase:'end' + addLayerItem (salvare + broadcast layer:add)
 *
 * Alți utilizatori primesc punctele delta și le acumulează local.
 * Când primesc 'end', stroke-ul live dispare și apare layer-ul permanent.
 */

import { useRef, useState, useCallback } from 'react';
import { GestureResponderEvent } from 'react-native';
import { StrokePoint } from '../types/mural';
import { useMuralToolStore } from '../stores/muralToolStore';
import { usePosterStore } from '../stores/posterStore';
import { useAuthStore } from '../stores/authStore';
import { wsService } from '../services/wsService';

interface CanvasDimensions {
  width:   number;
  height:  number;
  offsetX: number;
  offsetY: number;
}

const THROTTLE_MS = 50;   // max 20 pachete/secundă per utilizator
const MIN_POINTS  = 2;    // nu trimitem un singur punct izolat

export function useMuralCanvas(canvasDimensions: CanvasDimensions) {
  const [activeStroke, setActiveStroke] = useState<StrokePoint[]>([]);
  const isDrawing        = useRef(false);
  const strokeIdRef      = useRef('');
  const lastBroadcastRef = useRef(0);
  const pendingPointsRef = useRef<StrokePoint[]>([]);  // puncte nebroadcastate încă

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

  // ── Helper: broadcast live stroke ─────────────────────────

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
        toolType:    activeTool === 'erase'
          ? 'erase'
          : activeTool === 'glow'
            ? 'glow'
            : activeTool === 'spray'
              ? 'spray'
              : 'brush',
      } as any);
    },
    [poster, user, activeTool, color, brushSize, opacity]
  );

  // ── Flush puncte acumulate ─────────────────────────────────

  const flushPending = useCallback(() => {
    const pts = pendingPointsRef.current;
    if (pts.length >= MIN_POINTS) {
      broadcastLive('move', pts);
    }
    pendingPointsRef.current = [];
    lastBroadcastRef.current = Date.now();
  }, [broadcastLive]);

  // ── Touch handlers ────────────────────────────────────────

  const onTouchStart = useCallback(
    (e: GestureResponderEvent) => {
      const touch = e.nativeEvent.touches[0];

      if (activeTool === 'sticker') {
        const pos = toNormalized(touch.pageX, touch.pageY);
        addLayerItem({
          type:     'sticker',
          position: pos,
          emoji:    selectedEmoji,
          scale:    1.2,
          rotation: Math.random() * 30 - 15,
        });
        return;
      }

      if (activeTool === 'teamStamp') {
        const pos = toNormalized(touch.pageX, touch.pageY);
        addLayerItem({ type: 'teamStamp', position: pos, scale: 1.0 });
        return;
      }

      isDrawing.current = true;

      // ID unic pentru acest stroke
      strokeIdRef.current    = `${user?.id ?? 'anon'}_${Date.now()}`;
      pendingPointsRef.current = [];
      lastBroadcastRef.current = 0;

      const firstPoint = toNormalized(touch.pageX, touch.pageY);
      setActiveStroke([firstPoint]);

      // Broadcast start imediat
      broadcastLive('start', [firstPoint]);
    },
    [activeTool, toNormalized, addLayerItem, selectedEmoji, broadcastLive, user]
  );

  const onTouchMove = useCallback(
    (e: GestureResponderEvent) => {
      if (!isDrawing.current) return;

      const touch    = e.nativeEvent.touches[0];
      const newPoint = toNormalized(touch.pageX, touch.pageY);

      // Actualizează preview-ul local imediat (fără throttle)
      setActiveStroke((prev) => [...prev, newPoint]);

      // Acumulează punctul pentru broadcast
      pendingPointsRef.current.push(newPoint);

      // Broadcast throttled la 50ms
      const now = Date.now();
      if (now - lastBroadcastRef.current >= THROTTLE_MS) {
        flushPending();
      }
    },
    [toNormalized, flushPending]
  );

  const onTouchEnd = useCallback(() => {
    if (!isDrawing.current || activeStroke.length === 0) return;
    isDrawing.current = false;

    // Trimite punctele rămase în buffer
    if (pendingPointsRef.current.length > 0) {
      flushPending();
    }

    // Semnalează celorlalți că stroke-ul live s-a terminat
    broadcastLive('end', []);

    // Salvează și broadcastează layer-ul permanent (via posterStore)
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
  }, [activeTool, activeStroke, color, brushSize, opacity, addLayerItem, broadcastLive, flushPending]);

  return { activeStroke, onTouchStart, onTouchMove, onTouchEnd };
}
