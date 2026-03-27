/**
 * src/mock/users.ts
 * Fake user accounts used for development and demo purposes.
 */

import { User } from '../types/user';

export const MOCK_USERS: User[] = [
  {
    id: 'user_001',
    username: 'ghost_line',
    email: 'ghost@muralwar.io',
    teamId: 'minimalist',
    score: 2840,
    joinedAt: '2024-11-01T10:00:00Z',
    postersContributed: 14,
  },
  {
    id: 'user_002',
    username: 'pixelblaze',
    email: 'pixelblaze@muralwar.io',
    teamId: 'perfectionist',
    score: 5120,
    joinedAt: '2024-10-15T08:30:00Z',
    postersContributed: 27,
  },
  {
    id: 'user_003',
    username: 'aciddrip',
    email: 'aciddrip@muralwar.io',
    teamId: 'chaotic',
    score: 9900,
    joinedAt: '2024-09-20T18:00:00Z',
    postersContributed: 51,
  },
  {
    id: 'user_004',
    username: 'void_ink',
    email: 'void@muralwar.io',
    teamId: 'minimalist',
    score: 1200,
    joinedAt: '2025-01-05T12:00:00Z',
    postersContributed: 6,
  },
];

/** A default "you" user for prototyping the logged-in state */
export const MOCK_CURRENT_USER: User = MOCK_USERS[0];
