/**
 * src/types/poster.ts
 * Poster anchor data and territory / ownership state.
 * Posters are real-world objects identified by a unique anchor ID (e.g. QR code hash).
 */

import { TeamId } from './team';

/** Physical dimensions in millimetres, used to scale overlay correctly */
export interface PosterDimensions {
  widthMm: number;
  heightMm: number;
}

/** Normalised position within the poster plane: x,y in [0..1] */
export interface NormalizedPoint {
  x: number;
  y: number;
}

/** Current territorial ownership state of a poster */
export interface TerritoryState {
  ownerTeamId: TeamId | null;
  scores: Record<TeamId, number>;
  /** 0-100 heat from recent activity */
  heat: number;
  lastActivityAt: string;
  recentContributorIds: string[];
}

/** A scanned / discovered poster */
export interface Poster {
  id: string;
  /** Display name, e.g. "Warehouse District — Poster #3" */
  name: string;
  anchorCode: string;
  dimensions: PosterDimensions;
  location?: {
    latitude: number;
    longitude: number;
    /** Human-readable address hint */
    label: string;
  };
  territory: TerritoryState;
  createdAt: string;
  /** Thumbnail image URI (mock local asset or remote URL) */
  thumbnailUri?: string;
  /**
   * Public URL of the full-resolution reference image used as the canvas background.
   * Set this in Supabase → posters.reference_image_url after uploading to Storage.
   * If absent, a styled placeholder is rendered instead.
   */
  referenceImageUrl?: string;
}
