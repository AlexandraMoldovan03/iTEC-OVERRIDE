/**
 * src/utils/colorUtils.ts
 * Utility functions for color manipulation used in team glow/outline effects.
 */

/** Convert hex to RGBA string */
export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Lighten a hex color by a percentage (0..1) */
export function lightenColor(hex: string, amount: number): string {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + Math.round(255 * amount));
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + Math.round(255 * amount));
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + Math.round(255 * amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/** Generate a team-colored shadow style string */
export function teamGlowStyle(color: string, intensity: number = 8): string {
  return `0 0 ${intensity}px ${color}, 0 0 ${intensity * 2}px ${color}`;
}
