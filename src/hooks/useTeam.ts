/**
 * src/hooks/useTeam.ts
 * Convenience hook that returns the current user's team definition.
 */

import { useMemo } from 'react';
import { useAuthStore } from '../stores/authStore';
import { getTeamById } from '../constants/teams';
import { Team } from '../types/team';

export function useTeam(): Team | null {
  const user = useAuthStore((s) => s.user);
  return useMemo(() => (user ? getTeamById(user.teamId) ?? null : null), [user?.teamId]);
}
