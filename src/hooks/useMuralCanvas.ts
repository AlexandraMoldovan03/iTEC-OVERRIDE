/**
 * src/hooks/useMuralCanvas.ts
 * Manages touch-based drawing state for the mural canvas.
 * Converts raw touch coordinates (pixels) into normalized poster coordinates (0..1).
 */

import { useRef, useState, useCallback } from 'react';
import { GestureResponderEvent } from 'react-native';
import { StrokePoint } from '../types/mural';
import { useMuralToolStore } from '../stores/muralToolStore';
import { usePosterStore } from '../stores/posterStore';

interface CanvasDimensions {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}

export function useMuralCanvas(canvasDimensions: CanvasDimensions) {
  const [activeStroke, setActiveStroke] = useState<StrokePoint[]>([]);
  const isDrawing = useRef(false);

  const { activeTool, color, brushSize, opacity, selectedEmoji } = useMuralToolStore();
  const addLayerItem = usePosterStore((s) => s.addLayerItem);

  const toNormalized = useCallback(
    (px: number, py: number): StrokePoint => ({
      x: Math.max(0, Math.min(1, (px - canvasDimensions.offsetX) / canvasDimensions.width)),
      y: Math.max(0, Math.min(1, (py - canvasDimensions.offsetY) / canvasDimensions.height)),
    }),
    [canvasDimensions]
  );

  const onTouchStart = useCallback(
    (e: GestureResponderEvent) => {
      if (activeTool === 'sticker') {
        // Place sticker immediately on tap
        const touch = e.nativeEvent.touches[0];
        const pos = toNormalized(touch.pageX, touch.pageY);
        addLayerItem({
          type: 'sticker',
          position: pos,
          emoji: selectedEmoji,
          scale: 1.2,
          rotation: Math.random() * 30 - 15,
        });
        return;
      }

      if (activeTool === 'teamStamp') {
        const touch = e.nativeEvent.touches[0];
        const pos = toNormalized(touch.pageX, touch.pageY);
        addLayerItem({ type: 'teamStamp', position: pos, scale: 1.0 });
        return;
      }

      isDrawing.current = true;
      const touch = e.nativeEvent.touches[0];
      setActiveStroke([toNormalized(touch.pageX, touch.pageY)]);
    },
    [activeTool, toNormalized, addLayerItem, selectedEmoji]
  );

  const onTouchMove = useCallback(
    (e: GestureResponderEvent) => {
      if (!isDrawing.current) return;
      const touch = e.nativeEvent.touches[0];
      setActiveStroke((prev) => [...prev, toNormalized(touch.pageX, touch.pageY)]);
    },
    [toNormalized]
  );

  const onTouchEnd = useCallback(() => {
    if (!isDrawing.current || activeStroke.length === 0) return;
    isDrawing.current = false;

    if (activeTool === 'erase') {
      addLayerItem({ type: 'erase', points: activeStroke, strokeWidth: brushSize * 2 });
    } else {
      addLayerItem({
        type: activeTool === 'glow' ? 'glow' : activeTool === 'spray' ? 'spray' : 'brush',
        points: activeStroke,
        color,
        strokeWidth: brushSize,
        opacity,
      } as any);
    }

    setActiveStroke([]);
  }, [activeTool, activeStroke, color, brushSize, opacity, addLayerItem]);

  return { activeStroke, onTouchStart, onTouchMove, onTouchEnd };
}
