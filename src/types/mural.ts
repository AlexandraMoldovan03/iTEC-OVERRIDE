/**
 * src/types/mural.ts
 * Types for mural layer items, tools, and drawing primitives.
 * All positions are stored as NormalizedPoint (0..1) relative to the poster plane
 * so that content scales correctly on any device / zoom level.
 */

import { TeamId } from './team';
import { NormalizedPoint } from './poster';

// ─── Tools ────────────────────────────────────────────────────────────────────

export type MuralToolId =
  | 'brush'
  | 'spray'
  | 'sticker'
  | 'gif'
  | 'erase'
  | 'glow'
  | 'teamStamp';

export interface MuralTool {
  id: MuralToolId;
  label: string;
  icon: string; // MaterialCommunityIcons name
}

// ─── Layer Item Variants ──────────────────────────────────────────────────────

export interface StrokePoint extends NormalizedPoint {
  pressure?: number; // 0..1
}

export interface BrushStrokeItem {
  type: 'brush' | 'spray' | 'glow';
  points: StrokePoint[];
  color: string;
  strokeWidth: number;
  opacity: number;
}

export interface EraseItem {
  type: 'erase';
  points: StrokePoint[];
  strokeWidth: number;
}

export interface StickerItem {
  type: 'sticker';
  position: NormalizedPoint;
  /** Emoji character or asset key */
  emoji: string;
  scale: number;
  rotation: number;
}

export interface GifItem {
  type: 'gif';
  position: NormalizedPoint;
  gifUrl: string;
  scale: number;
}

export interface TeamStampItem {
  type: 'teamStamp';
  position: NormalizedPoint;
  scale: number;
}

export type MuralLayerItemData =
  | BrushStrokeItem
  | EraseItem
  | StickerItem
  | GifItem
  | TeamStampItem;

// ─── Persisted Layer Item ─────────────────────────────────────────────────────

/** A single contribution to the mural, written by one user. */
export interface PosterLayerItem {
  id: string;
  posterId: string;
  authorId: string;
  authorUsername: string;
  teamId: TeamId;
  data: MuralLayerItemData;
  /** ISO date string */
  createdAt: string;
}
