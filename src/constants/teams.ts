/**
 * src/constants/teams.ts
 * Static team definitions. These are the 3 fixed teams in the game.
 */

import { Team } from '../types/team';
import { TEAM_COLORS } from '../theme/colors';

export const TEAMS: Team[] = [
  {
    id: 'minimalist',
    name: 'Minimalist',
    tagline: 'Less is more. Every stroke counts.',
    color: TEAM_COLORS.minimalist.primary,
    accentColor: TEAM_COLORS.minimalist.accent,
    icon: 'minus-circle-outline',
    description:
      'Clean lines, negative space, monochrome dominance. Precision over chaos. Your art whispers.',
  },
  {
    id: 'perfectionist',
    name: 'Perfectionist',
    tagline: 'Detail is everything. Flawless or nothing.',
    color: TEAM_COLORS.perfectionist.primary,
    accentColor: TEAM_COLORS.perfectionist.accent,
    icon: 'hexagon-outline',
    description:
      'Symmetry, gradients, calculated beauty. You spend 40 mins on one stroke and it shows.',
  },
  {
    id: 'chaotic',
    name: 'Chaotic',
    tagline: 'Rules? Never heard of them.',
    color: TEAM_COLORS.chaotic.primary,
    accentColor: TEAM_COLORS.chaotic.accent,
    icon: 'lightning-bolt',
    description:
      'Explosive color, maximum noise, paint everywhere. Entropy is your aesthetic. Bring the fire.',
  },
];

export const getTeamById = (id: string): Team | undefined =>
  TEAMS.find((t) => t.id === id);
