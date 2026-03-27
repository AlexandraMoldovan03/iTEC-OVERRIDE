/**
 * src/constants/tools.ts
 * Mural tool definitions for the bottom toolbar in the poster room.
 */

import { MuralTool } from '../types/mural';

export const MURAL_TOOLS: MuralTool[] = [
  { id: 'brush',     label: 'Brush',      icon: 'brush' },
  { id: 'spray',     label: 'Spray',      icon: 'spray' },
  { id: 'sticker',   label: 'Sticker',    icon: 'sticker-emoji' },
  { id: 'gif',       label: 'GIF',        icon: 'gif' },
  { id: 'erase',     label: 'Erase',      icon: 'eraser' },
  { id: 'glow',      label: 'Glow',       icon: 'shimmer' },
  { id: 'teamStamp', label: 'Team Stamp', icon: 'seal' },
];

export const BRUSH_SIZES = [2, 5, 10, 18, 30];
export const OPACITY_LEVELS = [0.3, 0.5, 0.75, 1.0];

export const DEFAULT_STICKERS = ['🔥', '⚡', '💀', '✨', '🎨', '👁️', '🌀', '💥', '🖌️', '🏴'];
