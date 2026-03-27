/**
 * src/theme/colors.ts
 * Central color palette. Team colors live here alongside global UI tokens.
 * Import from src/theme/index.ts in components.
 */

import { TeamId } from '../types/team';

// ─── Team Palette ─────────────────────────────────────────────────────────────

export const TEAM_COLORS: Record<TeamId, { primary: string; accent: string; glow: string; text: string }> = {
  minimalist: {
    primary: '#E0E0E0',
    accent: '#FFFFFF',
    glow: 'rgba(255,255,255,0.6)',
    text: '#111111',
  },
  perfectionist: {
    primary: '#4A90E2',
    accent: '#7BB8F5',
    glow: 'rgba(74,144,226,0.6)',
    text: '#FFFFFF',
  },
  chaotic: {
    primary: '#FF3D00',
    accent: '#FF8A65',
    glow: 'rgba(255,61,0,0.7)',
    text: '#FFFFFF',
  },
};

// ─── Global UI Palette ────────────────────────────────────────────────────────

export const Colors = {
  // Backgrounds
  bg: '#0A0A0F',
  bgSurface: '#13131A',
  bgCard: '#1C1C28',
  bgOverlay: 'rgba(0,0,0,0.7)',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#9A9AB0',
  textMuted: '#55556A',

  // Borders
  border: '#2A2A3D',
  borderFocus: '#5555AA',

  // Accents
  accentPurple: '#7C5CBF',
  accentPink: '#E040FB',
  accentGreen: '#00E676',

  // Status
  success: '#00E676',
  warning: '#FFD740',
  error: '#FF1744',
  info: '#40C4FF',

  // Transparent
  transparent: 'transparent',
  white: '#FFFFFF',
  black: '#000000',
};
