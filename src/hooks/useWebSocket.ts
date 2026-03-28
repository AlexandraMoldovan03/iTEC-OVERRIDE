/**
 * src/hooks/useWebSocket.ts
 * Gestionează ciclul de viață al conexiunii Supabase Realtime pentru o cameră poster.
 * Conectare la mount, deconectare la unmount.
 * Redirecționează events de activitate și presence către store.
 */

import { useEffect } from 'react';
import { wsService } from '../services/wsService';
import { usePosterStore } from '../stores/posterStore';
import { ActivityEvent } from '../types/activity';
import { OnlineUser } from '../services/wsService';

export function useWebSocket(posterId: string | null) {
  const handleWsEvent   = usePosterStore((s) => s.handleWsEvent);
  const setWsConnected  = usePosterStore((s) => s.setWsConnected);
  const setOnlineUsers  = usePosterStore((s) => s.setOnlineUsers);

  useEffect(() => {
    if (!posterId) return;

    // Conectare Supabase Realtime
    wsService.connect(posterId);

    // Ascultă events de activitate (layer:add, territory:update, etc.)
    const unsubEvent = wsService.onEvent((event: ActivityEvent) => {
      handleWsEvent(event);
    });

    // Ascultă schimbările de status (CONNECTING / SUBSCRIBED / CLOSED)
    const unsubStatus = wsService.onStatusChange((connected: boolean) => {
      setWsConnected(connected);
    });

    // Ascultă lista de utilizatori prezenți în cameră
    const unsubPresence = wsService.onPresenceChange((users: OnlineUser[]) => {
      setOnlineUsers(users);
    });

    // Cleanup la ieșire din cameră
    return () => {
      unsubEvent();
      unsubStatus();
      unsubPresence();
      wsService.disconnect();
    };
  }, [posterId]);
}
