/**
 * src/services/vaultService.ts
 * Vault = posterele pe care utilizatorul curent le-a scanat cu succes.
 *
 * Sursa de adevăr: Supabase (poster_scans join posters).
 * Cache local (AsyncStorage): offline fallback + încărcare instantanee.
 *
 * Logică:
 *   1. Întoarce imediat cache-ul local dacă există (UI instant).
 *   2. Fetch din Supabase în background → actualizează cache + store.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Poster } from '../types/poster';
import { posterService } from './posterService';

const CACHE_KEY_PREFIX = 'vault_v2_';   // prefix + userId pentru izolare între conturi
const CACHE_TTL_MS     = 5 * 60 * 1000; // 5 minute — după care se re-fetch

interface CacheEntry {
  posters:   Poster[];
  fetchedAt: number;   // timestamp ms
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cacheKey(userId: string): string {
  return `${CACHE_KEY_PREFIX}${userId}`;
}

async function readCache(userId: string): Promise<CacheEntry | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as CacheEntry;
  } catch {
    return null;
  }
}

async function writeCache(userId: string, posters: Poster[]): Promise<void> {
  try {
    const entry: CacheEntry = { posters, fetchedAt: Date.now() };
    await AsyncStorage.setItem(cacheKey(userId), JSON.stringify(entry));
  } catch {
    // Cache write failure is non-critical
  }
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const vaultService = {

  /**
   * Returnează vault-ul utilizatorului.
   *
   * @param userId    — ID-ul utilizatorului autentificat
   * @param forceRefresh — ignoră cache-ul și re-fetch din Supabase
   */
  async getAll(userId: string, forceRefresh = false): Promise<Poster[]> {
    // ── 1. Cache hit (if fresh enough) ───────────────────────
    if (!forceRefresh) {
      const cached = await readCache(userId);
      if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        return cached.posters;
      }
    }

    // ── 2. Fetch from Supabase ────────────────────────────────
    const posters = await posterService.fetchScannedPosters(userId);

    // ── 3. Update cache ───────────────────────────────────────
    await writeCache(userId, posters);

    return posters;
  },

  /**
   * Adaugă un poster la vault după o scanare reușită.
   * Actualizează cache-ul local imediat (nu așteaptă re-fetch din Supabase).
   */
  async addToCache(userId: string, poster: Poster): Promise<void> {
    const cached = await readCache(userId);
    const existing = cached?.posters ?? [];
    const alreadyIn = existing.some((p) => p.id === poster.id);
    if (!alreadyIn) {
      await writeCache(userId, [poster, ...existing]);
    }
  },

  /**
   * Șterge cache-ul local al unui utilizator (la logout).
   */
  async clearCache(userId: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(cacheKey(userId));
    } catch {
      // Non-critical
    }
  },

  /**
   * Verifică rapid (doar din cache) dacă posterul e în vault.
   * Folosit ca check de acces rapid fără request Supabase.
   */
  async isInCache(userId: string, posterId: string): Promise<boolean> {
    const cached = await readCache(userId);
    return cached?.posters.some((p) => p.id === posterId) ?? false;
  },
};
