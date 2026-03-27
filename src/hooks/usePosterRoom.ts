/**
 * src/hooks/usePosterRoom.ts
 * Composite hook that loads poster data and starts the WebSocket connection.
 * Use this in the PosterRoom screen so the screen stays clean.
 */

import { useEffect } from 'react';
import { usePosterStore } from '../stores/posterStore';
import { useVaultStore } from '../stores/vaultStore';
import { useWebSocket } from './useWebSocket';

export function usePosterRoom(posterId: string) {
  const { openPoster, closePoster, poster } = usePosterStore();
  const addToVault = useVaultStore((s) => s.addToVault);

  // Load poster data on mount
  useEffect(() => {
    openPoster(posterId);
    return () => closePoster();
  }, [posterId]);

  // Save to vault when poster is loaded
  useEffect(() => {
    if (poster) {
      addToVault(poster);
    }
  }, [poster?.id]);

  // Start WebSocket
  useWebSocket(posterId);

  return usePosterStore();
}
