/**
 * src/stores/posterStore.ts
 * Zustand store pentru posterul curent, layerele sale,
 * utilizatorii online, stroke-urile live remote și clasamentul în timp real.
 *
 * Fluxul real-time complet:
 *  1. addLayerItem() → optimistic update local → _refreshLeaderboard()
 *  2. posterService.submitLayer() → salvat în DB
 *  3. wsService.send('layer:add') → broadcastat celorlalți
 *  4. wsService.send('territory:update') → broadcastat noul scor
 *  5. handleWsEvent('layer:add') → primit → adăugat (deduplicat) → _refreshLeaderboard()
 *  6. handleWsEvent('territory:update') → primit → posterul actualizat
 *
 * Fluxul stroke live:
 *  start → remoteStrokes[strokeId] = { points: [p0], ... }
 *  move  → remoteStrokes[strokeId].points.push(...newPoints)
 *  end   → delete remoteStrokes[strokeId]
 *  (layer:add va urma și va randa stroke-ul permanent)
 */

import { create } from 'zustand';
import { Poster, TerritoryState } from '../types/poster';
import { PosterLayerItem, MuralLayerItemData, StrokePoint } from '../types/mural';
import { ActivityEvent, StrokeLiveEvent } from '../types/activity';
import { TeamId } from '../types/team';
import { posterService } from '../services/posterService';
import { wsService, OnlineUser } from '../services/wsService';
import { useAuthStore } from './authStore';
import {
  TeamScore,
  PlayerScore,
  computeLeaderboard,
} from '../utils/scoring';

// ─── Tip pentru stroke remote activ ───────────────────────────────────────────

export interface RemoteStroke {
  strokeId:    string;
  userId:      string;
  username:    string;
  teamId:      TeamId;
  points:      StrokePoint[];
  color:       string;
  strokeWidth: number;
  opacity:     number;
  toolType:    'brush' | 'spray' | 'glow' | 'erase';
}

// ─── Store interface ──────────────────────────────────────────────────────────

interface PosterStore {
  poster:            Poster | null;
  layers:            PosterLayerItem[];
  isLoadingPoster:   boolean;
  isLoadingLayers:   boolean;
  wsConnected:       boolean;
  onlineUsers:       OnlineUser[];
  remoteStrokes:     Record<string, RemoteStroke>;   // strokeId → RemoteStroke
  error:             string | null;

  // ── Clasament real-time ────────────────────────────────
  teamScores:        TeamScore[];
  playerScores:      PlayerScore[];

  openPoster:        (posterId: string) => Promise<void>;
  closePoster:       () => void;
  addLayerItem:      (data: MuralLayerItemData) => Promise<void>;
  handleWsEvent:     (event: ActivityEvent) => void;
  setWsConnected:    (v: boolean) => void;
  setOnlineUsers:    (users: OnlineUser[]) => void;
}

// ─── Helper intern: recalculează clasamentul ──────────────────────────────────

function refreshLeaderboard(layers: PosterLayerItem[]) {
  const { teamScores, playerScores } = computeLeaderboard(layers);
  return { teamScores, playerScores };
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const usePosterStore = create<PosterStore>((set, get) => ({
  poster:          null,
  layers:          [],
  isLoadingPoster: false,
  isLoadingLayers: false,
  wsConnected:     false,
  onlineUsers:     [],
  remoteStrokes:   {},
  error:           null,
  teamScores:      [],
  playerScores:    [],

  // ── Deschide cameră poster ────────────────────────────────

  openPoster: async (posterId) => {
    set({
      isLoadingPoster: true,
      isLoadingLayers: true,
      error:           null,
      layers:          [],
      onlineUsers:     [],
      remoteStrokes:   {},
      teamScores:      [],
      playerScores:    [],
    });
    try {
      const [poster, layers] = await Promise.all([
        posterService.fetchPoster(posterId),
        posterService.fetchLayers(posterId),
      ]);
      if (!poster) throw new Error('Poster not found');
      const scores = refreshLeaderboard(layers);
      set({ poster, layers, isLoadingPoster: false, isLoadingLayers: false, ...scores });
    } catch (e: any) {
      set({ error: e.message, isLoadingPoster: false, isLoadingLayers: false });
    }
  },

  // ── Închide camera ────────────────────────────────────────

  closePoster: () => set({
    poster:        null,
    layers:        [],
    wsConnected:   false,
    onlineUsers:   [],
    remoteStrokes: {},
    error:         null,
    teamScores:    [],
    playerScores:  [],
  }),

  // ── Adaugă layer: optimistic → DB → broadcast ─────────────

  addLayerItem: async (data) => {
    const { poster } = get();
    const user = useAuthStore.getState().user;
    if (!poster || !user) return;

    const tempId = `optimistic_${Date.now()}`;
    const optimistic: PosterLayerItem = {
      id:             tempId,
      posterId:       poster.id,
      authorId:       user.id,
      authorUsername: user.username,
      teamId:         user.teamId,
      data,
      createdAt:      new Date().toISOString(),
    };

    // Optimistic update local + refresh imediat al clasamentului
    set((s) => {
      const newLayers = [...s.layers, optimistic];
      return { layers: newLayers, ...refreshLeaderboard(newLayers) };
    });

    try {
      const persisted = await posterService.submitLayer({
        posterId:       poster.id,
        authorId:       user.id,
        authorUsername: user.username,
        teamId:         user.teamId,
        data,
      });

      // Înlocuiește optimistic cu cel persisted + recalculează
      set((s) => {
        const newLayers = s.layers.map((l) => (l.id === tempId ? persisted : l));
        return { layers: newLayers, ...refreshLeaderboard(newLayers) };
      });

      // Broadcast layer permanent celorlalți
      wsService.send({
        type:     'layer:add',
        posterId: poster.id,
        userId:   user.id,
        username: user.username,
        teamId:   user.teamId,
        item:     persisted,
      } as any);

      // Broadcast scor actualizat pentru territory
      const { teamScores, playerScores, scoresRecord, ownerTeamId, heat } =
        computeLeaderboard(get().layers);

      wsService.send({
        type:        'territory:update',
        posterId:    poster.id,
        userId:      user.id,
        username:    user.username,
        teamId:      user.teamId,
        scores:      scoresRecord,
        ownerTeamId,
        heat,
      } as any);

      // Actualizează territory în starea locală
      if (get().poster) {
        set((s) => {
          if (!s.poster) return s;
          const territory: TerritoryState = {
            ...s.poster.territory,
            scores:      scoresRecord,
            ownerTeamId,
            heat,
            lastActivityAt: new Date().toISOString(),
          };
          return {
            poster: { ...s.poster, territory },
            teamScores,
            playerScores,
          };
        });
      }

    } catch {
      // Rollback optimistic
      set((s) => {
        const newLayers = s.layers.filter((l) => l.id !== tempId);
        return { layers: newLayers, ...refreshLeaderboard(newLayers) };
      });
    }
  },

  // ── Procesează events primite prin Realtime ───────────────

  handleWsEvent: (event) => {

    // ── Layer permanent ─────────────────────────────────────
    if (event.type === 'layer:add') {
      set((s) => {
        const alreadyExists = s.layers.some((l) => l.id === event.item.id);
        if (alreadyExists) return s;

        // Ștergem stroke-ul live al acestui utilizator dacă mai exista
        const remoteStrokes = { ...s.remoteStrokes };
        Object.keys(remoteStrokes).forEach((sid) => {
          if (remoteStrokes[sid].userId === event.userId) {
            delete remoteStrokes[sid];
          }
        });

        const newLayers = [...s.layers, event.item];
        return {
          layers: newLayers,
          remoteStrokes,
          ...refreshLeaderboard(newLayers),
        };
      });
    }

    if (event.type === 'layer:remove') {
      set((s) => {
        const newLayers = s.layers.filter((l) => l.id !== event.itemId);
        return { layers: newLayers, ...refreshLeaderboard(newLayers) };
      });
    }

    if (event.type === 'territory:update') {
      set((s) => {
        if (!s.poster) return s;
        const territory: TerritoryState = {
          ...s.poster.territory,
          scores:         event.scores,
          ownerTeamId:    event.ownerTeamId,
          heat:           event.heat,
          lastActivityAt: event.timestamp,
        };
        return { poster: { ...s.poster, territory } };
      });
    }

    // ── Stroke live (linia în timp real) ───────────────────
    if (event.type === 'stroke:live') {
      const e = event as StrokeLiveEvent;

      if (e.phase === 'start') {
        set((s) => ({
          remoteStrokes: {
            ...s.remoteStrokes,
            [e.strokeId]: {
              strokeId:    e.strokeId,
              userId:      e.userId,
              username:    e.username,
              teamId:      e.teamId,
              points:      [...e.points],
              color:       e.color,
              strokeWidth: e.strokeWidth,
              opacity:     e.opacity,
              toolType:    e.toolType,
            },
          },
        }));
      }

      if (e.phase === 'move') {
        set((s) => {
          const existing = s.remoteStrokes[e.strokeId];
          if (!existing) {
            // Pachetul 'start' s-a pierdut — creăm entry cu ce avem
            return {
              remoteStrokes: {
                ...s.remoteStrokes,
                [e.strokeId]: {
                  strokeId:    e.strokeId,
                  userId:      e.userId,
                  username:    e.username,
                  teamId:      e.teamId,
                  points:      [...e.points],
                  color:       e.color,
                  strokeWidth: e.strokeWidth,
                  opacity:     e.opacity,
                  toolType:    e.toolType,
                },
              },
            };
          }
          return {
            remoteStrokes: {
              ...s.remoteStrokes,
              [e.strokeId]: {
                ...existing,
                points: [...existing.points, ...e.points],
              },
            },
          };
        });
      }

      if (e.phase === 'end') {
        set((s) => {
          const remoteStrokes = { ...s.remoteStrokes };
          delete remoteStrokes[e.strokeId];
          return { remoteStrokes };
        });
      }
    }
  },

  setWsConnected: (v) => set({ wsConnected: v }),
  setOnlineUsers: (users) => set({ onlineUsers: users }),
}));
