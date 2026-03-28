/**
 * src/utils/scoring.ts
 * Calculează în timp real scorurile echipelor și jucătorilor
 * pe baza layer-elor desenate pe poster.
 *
 * Punctaj per tip de layer:
 *   brush     → 1 pt  (linie simplă)
 *   spray     → 2 pt  (textură)
 *   glow      → 3 pt  (efect special)
 *   sticker   → 1 pt
 *   teamStamp → 2 pt
 *   erase     → 0 pt  (nu aduce puncte)
 */

import { PosterLayerItem } from '../types/mural';
import { TeamId } from '../types/team';

// ─── Punctaj per tip ──────────────────────────────────────────────────────────

export const LAYER_POINTS: Record<string, number> = {
  brush:     1,
  spray:     2,
  glow:      3,
  sticker:   1,
  teamStamp: 2,
  erase:     0,
};

// ─── Tipuri de output ─────────────────────────────────────────────────────────

export interface TeamScore {
  teamId:     TeamId;
  points:     number;
  layerCount: number;
  rank:       number;          // 1 = lider
}

export interface PlayerScore {
  userId:     string;
  username:   string;
  teamId:     TeamId;
  points:     number;
  layerCount: number;
  rank:       number;          // 1 = lider
}

export interface LeaderboardData {
  teamScores:   TeamScore[];
  playerScores: PlayerScore[];
  ownerTeamId:  TeamId | null;
  heat:         number;        // 0-100: activitate recentă
  scoresRecord: Record<TeamId, number>;  // pentru TerritoryUpdateEvent
}

// ─── Funcții de calcul ────────────────────────────────────────────────────────

/**
 * Calculează scorurile echipelor din lista de layere.
 * Returnează array sortat descrescător după puncte, cu rank setat.
 */
export function computeTeamScores(layers: PosterLayerItem[]): TeamScore[] {
  const acc: Record<string, { points: number; count: number }> = {};

  for (const layer of layers) {
    const pts = LAYER_POINTS[layer.data.type] ?? 1;
    if (!acc[layer.teamId]) {
      acc[layer.teamId] = { points: 0, count: 0 };
    }
    acc[layer.teamId].points += pts;
    acc[layer.teamId].count  += 1;
  }

  return Object.entries(acc)
    .map(([teamId, { points, count }]) => ({
      teamId:     teamId as TeamId,
      points,
      layerCount: count,
      rank:       0,
    }))
    .sort((a, b) => b.points - a.points || a.teamId.localeCompare(b.teamId))
    .map((s, i) => ({ ...s, rank: i + 1 }));
}

/**
 * Calculează scorurile individuale ale jucătorilor din lista de layere.
 * Returnează array sortat descrescător după puncte, cu rank setat.
 */
export function computePlayerScores(layers: PosterLayerItem[]): PlayerScore[] {
  const acc: Record<string, {
    username: string;
    teamId:   TeamId;
    points:   number;
    count:    number;
  }> = {};

  for (const layer of layers) {
    const pts = LAYER_POINTS[layer.data.type] ?? 1;
    if (!acc[layer.authorId]) {
      acc[layer.authorId] = {
        username: layer.authorUsername,
        teamId:   layer.teamId,
        points:   0,
        count:    0,
      };
    }
    acc[layer.authorId].points += pts;
    acc[layer.authorId].count  += 1;
  }

  return Object.entries(acc)
    .map(([userId, { username, teamId, points, count }]) => ({
      userId,
      username,
      teamId,
      points,
      layerCount: count,
      rank:       0,
    }))
    .sort((a, b) => b.points - a.points || a.username.localeCompare(b.username))
    .map((s, i) => ({ ...s, rank: i + 1 }));
}

/**
 * Calculează echipa care deține posterul (cea cu cele mai multe puncte).
 */
export function computeOwnerTeam(teamScores: TeamScore[]): TeamId | null {
  if (teamScores.length === 0) return null;
  return teamScores[0].points > 0 ? teamScores[0].teamId : null;
}

/**
 * Calculează "heat-ul" (activitate recentă) 0-100.
 * Bazat pe numărul de layere adăugate în ultimele 5 minute.
 */
export function computeHeat(layers: PosterLayerItem[]): number {
  const now = Date.now();
  const WINDOW_MS = 5 * 60 * 1000; // 5 minute
  const recentCount = layers.filter((l) => {
    try {
      const age = now - new Date(l.createdAt).getTime();
      return age >= 0 && age < WINDOW_MS;
    } catch {
      return false;
    }
  }).length;
  // Fiecare layer recent adaugă 5 puncte de heat, maxim 100
  return Math.min(100, recentCount * 5);
}

/**
 * Calcul complet — returnează tot ce are nevoie store-ul și UI-ul.
 */
export function computeLeaderboard(layers: PosterLayerItem[]): LeaderboardData {
  const teamScores   = computeTeamScores(layers);
  const playerScores = computePlayerScores(layers);
  const ownerTeamId  = computeOwnerTeam(teamScores);
  const heat         = computeHeat(layers);

  // Record simplu pentru TerritoryUpdateEvent
  const scoresRecord = teamScores.reduce<Record<TeamId, number>>(
    (acc, ts) => ({ ...acc, [ts.teamId]: ts.points }),
    {} as Record<TeamId, number>
  );

  return { teamScores, playerScores, ownerTeamId, heat, scoresRecord };
}
