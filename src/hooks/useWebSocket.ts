/**
 * src/hooks/useWebSocket.ts
 * Manages WebSocket connection lifecycle for a poster room.
 * Connects on mount, reconnects on poster change, disconnects on unmount.
 */

import { useEffect, useRef } from 'react';
import { wsService } from '../services/wsService';
import { usePosterStore } from '../stores/posterStore';
import { ActivityEvent } from '../types/activity';

export function useWebSocket(posterId: string | null) {
  const handleWsEvent = usePosterStore((s) => s.handleWsEvent);
  const setWsConnected = usePosterStore((s) => s.setWsConnected);
  const connectedRef = useRef(false);

  useEffect(() => {
    if (!posterId) return;

    wsService.connect(posterId);
    connectedRef.current = true;

    const unsubEvent = wsService.onEvent((event: ActivityEvent) => {
      handleWsEvent(event);
    });

    const unsubStatus = wsService.onStatusChange((connected: boolean) => {
      setWsConnected(connected);
    });

    return () => {
      unsubEvent();
      unsubStatus();
      wsService.disconnect();
      connectedRef.current = false;
    };
  }, [posterId]);
}
