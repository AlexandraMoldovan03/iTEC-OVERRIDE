/**
 * src/services/wsService.ts
 * WebSocket service abstraction with a mock implementation.
 *
 * Real implementation: replace MockWebSocket with `new WebSocket(url)` and
 * map native WS events to the same callbacks. No other files need to change.
 *
 * The mock emits random activity events on a timer to simulate live mural activity.
 */

import { ActivityEvent, LayerAddEvent, TerritoryUpdateEvent, UserJoinEvent } from '../types/activity';
import { TeamId } from '../types/team';
import { MOCK_USERS } from '../mock/users';
import { MOCK_WS_INTERVAL_MS } from '../constants';

type EventCallback = (event: ActivityEvent) => void;
type StatusCallback = (connected: boolean) => void;

// ─── Service Interface ────────────────────────────────────────────────────────

export interface IWsService {
  connect(posterId: string): void;
  disconnect(): void;
  send(event: Omit<ActivityEvent, 'id' | 'timestamp'>): void;
  onEvent(cb: EventCallback): () => void;
  onStatusChange(cb: StatusCallback): () => void;
}

// ─── Mock Implementation ──────────────────────────────────────────────────────

class MockWsService implements IWsService {
  private eventListeners: Set<EventCallback> = new Set();
  private statusListeners: Set<StatusCallback> = new Set();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private currentPosterId: string | null = null;

  connect(posterId: string): void {
    this.disconnect();
    this.currentPosterId = posterId;
    this.notifyStatus(true);

    // Emit a "you joined" event
    const joinEvent: UserJoinEvent = {
      id: `evt_${Date.now()}`,
      type: 'user:join',
      posterId,
      userId: 'user_001',
      username: 'ghost_line',
      teamId: 'minimalist',
      timestamp: new Date().toISOString(),
    };
    setTimeout(() => this.emit(joinEvent), 300);

    // Start periodic mock events
    this.intervalId = setInterval(() => {
      if (!this.currentPosterId) return;
      const evt = this.generateRandomEvent(this.currentPosterId);
      this.emit(evt);
    }, MOCK_WS_INTERVAL_MS);
  }

  disconnect(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.currentPosterId = null;
    this.notifyStatus(false);
  }

  send(event: Omit<ActivityEvent, 'id' | 'timestamp'>): void {
    // In real implementation: ws.send(JSON.stringify(event))
    // For mock: just echo the event back as confirmation
    const full = {
      ...event,
      id: `evt_${Date.now()}`,
      timestamp: new Date().toISOString(),
    } as ActivityEvent;
    setTimeout(() => this.emit(full), 50);
  }

  onEvent(cb: EventCallback): () => void {
    this.eventListeners.add(cb);
    return () => this.eventListeners.delete(cb);
  }

  onStatusChange(cb: StatusCallback): () => void {
    this.statusListeners.add(cb);
    return () => this.statusListeners.delete(cb);
  }

  private emit(event: ActivityEvent) {
    this.eventListeners.forEach((cb) => cb(event));
  }

  private notifyStatus(connected: boolean) {
    this.statusListeners.forEach((cb) => cb(connected));
  }

  private generateRandomEvent(posterId: string): ActivityEvent {
    const user = MOCK_USERS[Math.floor(Math.random() * MOCK_USERS.length)];
    const teams: TeamId[] = ['minimalist', 'perfectionist', 'chaotic'];
    const roll = Math.random();

    if (roll < 0.6) {
      // Layer add
      const evt: LayerAddEvent = {
        id: `evt_${Date.now()}`,
        type: 'layer:add',
        posterId,
        userId: user.id,
        username: user.username,
        teamId: user.teamId,
        timestamp: new Date().toISOString(),
        item: {
          id: `layer_live_${Date.now()}`,
          posterId,
          authorId: user.id,
          authorUsername: user.username,
          teamId: user.teamId,
          createdAt: new Date().toISOString(),
          data: {
            type: 'brush',
            color: user.teamId === 'chaotic' ? '#FF3D00' : user.teamId === 'perfectionist' ? '#4A90E2' : '#FFFFFF',
            strokeWidth: Math.floor(Math.random() * 15) + 2,
            opacity: 0.7 + Math.random() * 0.3,
            points: Array.from({ length: 4 }, () => ({
              x: Math.random(),
              y: Math.random(),
            })),
          },
        },
      };
      return evt;
    } else {
      // Territory update
      const scores: Record<TeamId, number> = {
        minimalist: Math.floor(Math.random() * 500),
        perfectionist: Math.floor(Math.random() * 500),
        chaotic: Math.floor(Math.random() * 500),
      };
      const ownerTeamId = teams.reduce((a, b) => (scores[a] > scores[b] ? a : b));
      const evt: TerritoryUpdateEvent = {
        id: `evt_${Date.now()}`,
        type: 'territory:update',
        posterId,
        userId: user.id,
        username: user.username,
        teamId: user.teamId,
        timestamp: new Date().toISOString(),
        scores,
        ownerTeamId,
        heat: Math.floor(Math.random() * 100),
      };
      return evt;
    }
  }
}

// Singleton instance — import `wsService` anywhere
export const wsService: IWsService = new MockWsService();
