/**
 * src/services/wsService.ts
 * WebSocket service — interfață + export singleton.
 *
 * `wsService` era mock; acum exportă implementarea reală Supabase Realtime.
 * MockWsService e păstrat mai jos în caz că e nevoie de fallback/testing local.
 */

import { ActivityEvent } from '../types/activity';
import { OnlineUser, realtimeService } from './realtimeService';

// ─── Interfață publică ────────────────────────────────────────────────────────

export type { OnlineUser };

type EventCallback    = (event: ActivityEvent) => void;
type StatusCallback   = (connected: boolean) => void;
type PresenceCallback = (users: OnlineUser[]) => void;

export interface IWsService {
  connect(posterId: string): void;
  disconnect(): void;
  send(event: Omit<ActivityEvent, 'id' | 'timestamp'>): void;
  onEvent(cb: EventCallback): () => void;
  onStatusChange(cb: StatusCallback): () => void;
  onPresenceChange(cb: PresenceCallback): () => void;
}

// ─── Export singleton real ────────────────────────────────────────────────────

export const wsService: IWsService = realtimeService;
