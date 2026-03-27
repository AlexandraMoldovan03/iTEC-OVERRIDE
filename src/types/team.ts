/**
 * src/types/team.ts
 * Team-related types. There are exactly 3 teams; each has a visual identity.
 */

export type TeamId = 'minimalist' | 'perfectionist' | 'chaotic';

export interface Team {
  id: TeamId;
  name: string;
  tagline: string;
  /** Primary brand color hex */
  color: string;
  /** Lighter accent / glow color hex */
  accentColor: string;
  /** Icon name from @expo/vector-icons MaterialCommunityIcons */
  icon: string;
  /** Short descriptor shown during onboarding */
  description: string;
}
