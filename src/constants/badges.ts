/**
 * src/constants/badges.ts
 * Imaginile badge-urilor de echipă și ale butoanelor principale.
 * require() trebuie să fie static în React Native — nu se poate face dinamic.
 */

import { ImageSourcePropType } from 'react-native';
import { TeamId } from '../types/team';

// ─── Badge-uri echipe ─────────────────────────────────────────────────────────

export const TEAM_BADGE_IMAGES: Record<TeamId, ImageSourcePropType> = {
  minimalist:    require('../../app/_layout/minimalist.png'),
  perfectionist: require('../../app/_layout/perfectionist.png'),
  chaotic:       require('../../app/_layout/chaotic.png'),
};

// ─── Butoane CTA ──────────────────────────────────────────────────────────────

export const SCAN_POSTER_IMAGE: ImageSourcePropType =
  require('../../app/_layout/scanPoster.png');

export const OPEN_VAULT_IMAGE: ImageSourcePropType =
  require('../../app/_layout/openVault.png');

// ─── Fundal decorativ ─────────────────────────────────────────────────────────

export const BACKGROUND2_IMAGE: ImageSourcePropType =
  require('../../app/_layout/background2.png');
