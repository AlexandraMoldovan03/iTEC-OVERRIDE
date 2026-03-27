/**
 * src/utils/posterUtils.ts
 * Helpers for coordinate mapping between poster-space (normalized 0..1)
 * and screen-space (pixels).
 */

import { PosterDimensions } from '../types/poster';

export interface ScreenRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Convert a normalized coordinate (0..1) to absolute screen pixels
 * given the on-screen poster rect.
 */
export function normalizedToScreen(
  nx: number,
  ny: number,
  rect: ScreenRect
): { x: number; y: number } {
  return {
    x: rect.x + nx * rect.width,
    y: rect.y + ny * rect.height,
  };
}

/**
 * Convert absolute screen pixels to normalized coordinates (0..1)
 * relative to the poster rect.
 */
export function screenToNormalized(
  px: number,
  py: number,
  rect: ScreenRect
): { x: number; y: number } {
  return {
    x: Math.max(0, Math.min(1, (px - rect.x) / rect.width)),
    y: Math.max(0, Math.min(1, (py - rect.y) / rect.height)),
  };
}

/**
 * Calculate the display rect for a poster given available screen dimensions,
 * maintaining the poster's physical aspect ratio with padding.
 */
export function computePosterRect(
  dimensions: PosterDimensions,
  screenWidth: number,
  screenHeight: number,
  paddingPx = 20
): ScreenRect {
  const aspect = dimensions.widthMm / dimensions.heightMm;
  const maxW = screenWidth - paddingPx * 2;
  const maxH = screenHeight - paddingPx * 2;

  let width = maxW;
  let height = width / aspect;

  if (height > maxH) {
    height = maxH;
    width = height * aspect;
  }

  return {
    x: (screenWidth - width) / 2,
    y: (screenHeight - height) / 2,
    width,
    height,
  };
}

/** Returns the dominant team from territory scores */
export function getDominantTeam(scores: Record<string, number>): string | null {
  const entries = Object.entries(scores);
  if (entries.length === 0) return null;
  return entries.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
}
