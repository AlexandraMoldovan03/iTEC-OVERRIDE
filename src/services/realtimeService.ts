/**
 * src/services/realtimeService.ts
 * Supabase Realtime implementation of IWsService.
 *
 * Înlocuiește MockWsService cu canale reale Supabase Realtime:
 * - Broadcast  → trimitere/primire events de desen între utilizatori
 * - Presence   → cine e activ în aceeași cameră (poster)
 *
 * Un channel per poster: `poster:{posterId}`
 * `broadcast: { self: false }` — expeditorul NU primește propriile events
 *   (el deja le-a aplicat optimistic local).
 */

import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { ActivityEvent } from '../types/activity';
import { TeamId } from '../types/team';
import { IWsService } from './wsService';

// ─── Presence ─────────────────────────────────────────────────────────────────

export interface OnlineUser {
  userId: string;
  username: string;
  teamId: TeamId;
  joinedAt: string;
}

type EventCallback    = (event: ActivityEvent) => void;
type StatusCallback   = (connected: boolean) => void;
type PresenceCallback = (users: OnlineUser[]) => void;

// ─── Service ──────────────────────────────────────────────────────────────────

class SupabaseRealtimeService implements IWsService {
  private channel: RealtimeChannel | null = null;
  private eventListeners:    Set<EventCallback>    = new Set();
  private statusListeners:   Set<StatusCallback>   = new Set();
  private presenceListeners: Set<PresenceCallback> = new Set();
  private currentPosterId: string | null = null;

  // ── Connect ────────────────────────────────────────────────

  connect(posterId: string): void {
    // Dacă suntem deja conectați la același poster, nu reconectăm
    if (this.currentPosterId === posterId && this.channel) return;

    this.disconnect();
    this.currentPosterId = posterId;

    this.channel = supabase.channel(`poster:${posterId}`, {
      config: {
        broadcast: {
          self: false,  // nu primesc propriile events broadcast înapoi
          ack: false,   // fire-and-forget — latență minimă
        },
        presence: {
          key: useAuthStore.getState().user?.id ?? 'anon',
        },
      },
    });

    // ── Broadcast: primire events de la ceilalți ────────────
    this.channel.on(
      'broadcast',
      { event: 'activity' },
      ({ payload }: { payload: ActivityEvent }) => {
        this.emitEvent(payload);
      }
    );

    // ── Presence: sincronizare listă utilizatori online ─────
    this.channel.on('presence', { event: 'sync' }, () => {
      this.syncPresence();
    });

    this.channel.on('presence', { event: 'join' }, () => {
      this.syncPresence();
    });

    this.channel.on('presence', { event: 'leave' }, () => {
      this.syncPresence();
    });

    // ── Subscribe ───────────────────────────────────────────
    this.channel.subscribe((status) => {
      const connected = status === 'SUBSCRIBED';
      this.notifyStatus(connected);

      if (connected) {
        const user = useAuthStore.getState().user;
        if (user) {
          // Anunțăm prezența în cameră
          this.channel?.track({
            userId:   user.id,
            username: user.username,
            teamId:   user.teamId,
            joinedAt: new Date().toISOString(),
          });

          // Emitem local user:join (pentru propriul UI)
          this.emitEvent({
            id:        `evt_join_${Date.now()}`,
            type:      'user:join',
            posterId,
            userId:    user.id,
            username:  user.username,
            teamId:    user.teamId,
            timestamp: new Date().toISOString(),
          });
        }
      }
    });
  }

  // ── Disconnect ─────────────────────────────────────────────

  disconnect(): void {
    if (this.channel) {
      // Scoatem prezența din cameră
      this.channel.untrack();
      // Supabase gestionează cleanup-ul intern
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.currentPosterId = null;
    this.notifyStatus(false);
    this.notifyPresence([]);
  }

  // ── Send ───────────────────────────────────────────────────

  send(event: Omit<ActivityEvent, 'id' | 'timestamp'>): void {
    if (!this.channel) return;

    const full: ActivityEvent = {
      ...event,
      id:        `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
    } as ActivityEvent;

    this.channel.send({
      type:    'broadcast',
      event:   'activity',
      payload: full,
    });
  }

  // ── Subscriptions ──────────────────────────────────────────

  onEvent(cb: EventCallback): () => void {
    this.eventListeners.add(cb);
    return () => this.eventListeners.delete(cb);
  }

  onStatusChange(cb: StatusCallback): () => void {
    this.statusListeners.add(cb);
    return () => this.statusListeners.delete(cb);
  }

  /** Ascultă schimbările în lista de utilizatori online */
  onPresenceChange(cb: PresenceCallback): () => void {
    this.presenceListeners.add(cb);
    return () => this.presenceListeners.delete(cb);
  }

  // ── Internals ──────────────────────────────────────────────

  private syncPresence() {
    if (!this.channel) return;

    const state = this.channel.presenceState<OnlineUser>();
    const users: OnlineUser[] = Object.values(state)
      .flat()
      .map((p: any) => ({
        userId:   p.userId   ?? 'unknown',
        username: p.username ?? 'unknown',
        teamId:   p.teamId   ?? 'minimalist',
        joinedAt: p.joinedAt ?? new Date().toISOString(),
      }));

    this.notifyPresence(users);
  }

  private emitEvent(event: ActivityEvent) {
    this.eventListeners.forEach((cb) => cb(event));
  }

  private notifyStatus(connected: boolean) {
    this.statusListeners.forEach((cb) => cb(connected));
  }

  private notifyPresence(users: OnlineUser[]) {
    this.presenceListeners.forEach((cb) => cb(users));
  }
}

// Singleton — importat oriunde e nevoie
export const realtimeService = new SupabaseRealtimeService();
