/**
 * src/hooks/usePreloadImages.ts
 * Pre-încarcă toate imaginile statice ale aplicației la startup.
 *
 * React Native servește imaginile require() prin Metro — dar prima redare
 * poate rata imaginea dacă bytes-ii nu au sosit încă. Soluție: prefetch
 * explicit înainte de a reda UI-ul.
 *
 * Folosește Image.resolveAssetSource() (built-in RN) pentru a obține URI-ul
 * local al fiecărui asset require(), apoi Image.prefetch() pentru download.
 */

import { useEffect, useState } from 'react';
import { Image } from 'react-native';
import {
  TEAM_BADGE_IMAGES,
  SCAN_POSTER_IMAGE,
  OPEN_VAULT_IMAGE,
  BACKGROUND2_IMAGE,
} from '../constants/badges';

// Toate imaginile ce trebuie pre-încărcate
const ALL_BADGE_SOURCES = [
  TEAM_BADGE_IMAGES.minimalist,
  TEAM_BADGE_IMAGES.perfectionist,
  TEAM_BADGE_IMAGES.chaotic,
  SCAN_POSTER_IMAGE,
  OPEN_VAULT_IMAGE,
  BACKGROUND2_IMAGE,
];

/**
 * Returnează `true` când toate imaginile badge sunt gata.
 * Dacă pre-loading-ul eșuează parțial, tot returnează `true`
 * ca să nu blocheze app-ul la infinit.
 */
export function usePreloadImages(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function preload() {
      try {
        const prefetchPromises = ALL_BADGE_SOURCES.map((source) => {
          try {
            // resolveAssetSource transformă require() în { uri, width, height }
            const resolved = Image.resolveAssetSource(source);
            if (resolved?.uri) {
              return Image.prefetch(resolved.uri).catch(() => null);
            }
          } catch {
            // asset necunoscut — ignorăm
          }
          return Promise.resolve(null);
        });

        // Așteptăm toate (cu timeout de siguranță 5s)
        await Promise.race([
          Promise.allSettled(prefetchPromises),
          new Promise<void>((res) => setTimeout(res, 5000)),
        ]);
      } catch {
        // Silențios — nu blocăm app-ul
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    preload();
    return () => { cancelled = true; };
  }, []);

  return ready;
}
