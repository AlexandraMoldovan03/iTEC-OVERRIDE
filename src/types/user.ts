/**
 * src/types/user.ts
 * User account and profile types.
 */

import { TeamId } from './team';

export interface User {
  id: string;
  username: string;
  email: string;
  teamId: TeamId;
  avatarUrl?: string;
  /** Total contribution score across all posters */
  score: number;
  /** ISO date string */
  joinedAt: string;
  /** Number of unique posters contributed to */
  postersContributed: number;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
