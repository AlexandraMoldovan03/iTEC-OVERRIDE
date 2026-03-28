/**
 * src/theme/colors.ts
 * Graffiti-inspired neon palette — dark walls, electric ink.
 * Team colors live here alongside global UI tokens.
 */

import { TeamId } from '../types/team';

// ─── Team Palette ─────────────────────────────────────────────────────────────

export const TEAM_COLORS: Record<TeamId, { primary: string; accent: string; glow: string; text: string }> = {
  minimalist: {
    primary: '#E8E8E8',
    accent: '#FFFFFF',
    glow: 'rgba(232,232,232,0.5)',
    text: '#000000',
  },
  perfectionist: {
    primary: '#00CFFF',
    accent: '#7EEEFF',
    glow: 'rgba(0,207,255,0.55)',
    text: '#000000',
  },
  chaotic: {
    primary: '#FF2D55',
    accent: '#FF6B8A',
    glow: 'rgba(255,45,85,0.6)',
    text: '#FFFFFF',
  },
};

// ─── Global UI Palette ────────────────────────────────────────────────────────

export const Colors = {
  // Backgrounds — pure black walls
  bg: '#000000',
  bgSurface: '#0A0A0A',
  bgCard: '#111111',
  bgOverlay: 'rgba(0,0,0,0.82)',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#AAAAAA',
  textMuted: '#555555',

  // Borders
  border: '#222222',
  borderFocus: '#A855F7',
  borderBright: '#333333',

  // Neon Accents — spray can palette
  accentPurple: '#A855F7',      // electric violet
  accentPurpleDim: '#7C3AED',   // deeper violet
  accentPink: '#FF1CF7',        // hot magenta
  accentGreen: '#39FF14',       // toxic neon green
  accentCyan: '#00FFFF',        // ice blue
  accentYellow: '#FFE600',      // caution yellow
  accentOrange: '#FF6B00',      // fire orange

  // Glow versions (for shadow/glow effects)
  glowPurple: 'rgba(168,85,247,0.4)',
  glowPink: 'rgba(255,28,247,0.35)',
  glowGreen: 'rgba(57,255,20,0.35)',
  glowCyan: 'rgba(0,255,255,0.3)',

  // Status
  success: '#39FF14',
  warning: '#FFE600',
  error: '#FF2D55',
  info: '#00CFFF',

  // Basics
  transparent: 'transparent',
  white: '#FFFFFF',
  black: '#000000',
};
