/**
 * src/services/scanService.ts
 * Serviciu pentru scanarea vizuală a posterelor.
 *
 * Responsabilități:
 *  1. Trimite imaginea capturată la backend-ul de matching (FastAPI)
 *  2. Salvează istoricul scanărilor în Supabase (poster_scans)
 *  3. Fallback: dacă EXPO_PUBLIC_SCAN_API_URL nu e setat → returnează demo match
 *
 * Backend așteptat: POST {EXPO_PUBLIC_SCAN_API_URL}/scan/match
 */

import { supabase } from '../lib/supabase';
import {
  ScanMatchResponse,
  PosterScanRecord,
  ScanApiConfig,
  CONFIDENCE_AUTO_OPEN,
  CONFIDENCE_CANDIDATES,
} from '../types/scan';
import { Platform } from 'react-native';

// ─── Config ───────────────────────────────────────────────────────────────────

const SCAN_API_URL        = process.env.EXPO_PUBLIC_SCAN_API_URL ?? '';
const SCAN_TIMEOUT_MS     = 30_000;  // 30s — backend ORB poate fi lent la prima rulare
const HEALTH_TIMEOUT_MS   = 4_000;  // pre-check rapid: dacă nu răspunde în 4s → offline
const SCAN_IMAGE_QUALITY  = 0.55;   // trimis ca metadata; captura e setată cu quality: 0.55

// Eroare specială pentru backend offline (detectat de UI)
export const ERR_BACKEND_OFFLINE = 'BACKEND_OFFLINE';

/**
 * Verifică dacă backendul e accesibil. Timeout scurt (4s).
 * Aruncă ERR_BACKEND_OFFLINE dacă nu poate conecta.
 */
async function checkBackendReachable(): Promise<void> {
  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
  try {
    const res = await fetch(`${SCAN_API_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`health ${res.status}`);
  } catch (err: any) {
    clearTimeout(timeout);
    const isNetworkErr = err?.name === 'AbortError'
      || err?.message?.includes('Network request failed')
      || err?.message?.includes('Failed to fetch')
      || err?.message?.includes('fetch');
    if (isNetworkErr || err?.name === 'AbortError') {
      throw new Error(ERR_BACKEND_OFFLINE);
    }
    throw err;
  }
}

// ─── Upload + matching ────────────────────────────────────────────────────────

/**
 * Trimite imaginea capturată la backend-ul de matching.
 * Returnează un ScanMatchResponse cu poster_id, confidence și candidați.
 *
 * Dacă EXPO_PUBLIC_SCAN_API_URL nu e configurat, returnează un răspuns
 * demo (pentru development fără backend).
 */
export async function matchPosterImage(
  imageUri: string,
  userId?: string
): Promise<ScanMatchResponse> {

  // ── Demo mode: fără backend configurat ────────────────────
  if (!SCAN_API_URL) {
    console.warn('[scanService] EXPO_PUBLIC_SCAN_API_URL not set — returning demo match');
    return getDemoMatch();
  }

  // ── Pre-check: backendul răspunde? (4s timeout) ────────────
  // Dacă nu, aruncăm ERR_BACKEND_OFFLINE imediat — nu mai așteptăm 30s
  await checkBackendReachable();

  // ── Build FormData ─────────────────────────────────────────
  const formData = new FormData();
  formData.append('image', {
    uri:  imageUri,
    type: 'image/jpeg',
    name: 'scan.jpg',
  } as any);

  if (userId) {
    formData.append('user_id', userId);
  }

  // ── Fetch cu timeout ──────────────────────────────────────
  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), SCAN_TIMEOUT_MS);

  try {
    const response = await fetch(`${SCAN_API_URL}/scan/match`, {
      method:  'POST',
      body:    formData,
      signal:  controller.signal,
      headers: {
        // Nu seta Content-Type manual cu FormData în RN — fetch îl setează singur
        Accept: 'application/json',
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`Backend error ${response.status}: ${errBody}`);
    }

    const data = await response.json() as ScanMatchResponse;
    return data;

  } catch (err: any) {
    clearTimeout(timeout);

    if (err?.name === 'AbortError') {
      throw new Error('Scan timeout — backend a durat prea mult');
    }
    throw err;
  }
}

// ─── Salvează scanarea în Supabase ────────────────────────────────────────────

/**
 * Salvează scanarea în tabela poster_scans.
 * Silențios la eroare (nu blocăm flow-ul principal).
 */
export async function saveScanRecord(params: {
  userId:     string;
  posterId:   string | null;
  confidence: number;
  matched:    boolean;
  corners?:   any;
}): Promise<string | null> {
  // Try with device_info first; if schema cache error → retry without it
  const basePayload = {
    user_id:    params.userId,
    poster_id:  params.posterId,
    confidence: params.confidence,
    matched:    params.matched,
    corners:    params.corners ?? null,
  };

  for (const payload of [
    { ...basePayload, device_info: { platform: Platform.OS, version: String(Platform.Version) } },
    basePayload,   // fallback without device_info
  ]) {
    try {
      const { data, error } = await supabase
        .from('poster_scans')
        .insert(payload)
        .select('id')
        .single();

      if (!error) return data?.id ?? null;

      // If column missing → retry without device_info
      if (error.message.includes('device_info') || error.message.includes('schema cache')) {
        console.warn('[scanService] retrying without device_info:', error.message);
        continue;
      }

      console.warn('[scanService] saveScanRecord error:', error.message);
      return null;

    } catch (err) {
      console.warn('[scanService] saveScanRecord exception:', err);
      return null;
    }
  }
  return null;
}

/**
 * Marchează scanarea ca "confirmed" după ce utilizatorul confirmă
 * un candidat din dialog (la confidence mediu).
 */
export async function confirmScanRecord(scanId: string, confirmedPosterId: string) {
  await supabase
    .from('poster_scans')
    .update({ poster_id: confirmedPosterId, matched: true })
    .eq('id', scanId);
}

// ─── Fetch istoric scanări ─────────────────────────────────────────────────────

/**
 * Returnează ultimele scanări ale utilizatorului (pentru wall / vault).
 */
export async function fetchScanHistory(
  userId: string,
  limit = 20
): Promise<PosterScanRecord[]> {
  const { data, error } = await supabase
    .from('poster_scans')
    .select('*')
    .eq('user_id', userId)
    .eq('matched', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('[scanService] fetchScanHistory error:', error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id:           row.id,
    posterId:     row.poster_id,
    userId:       row.user_id,
    confidence:   row.confidence,
    matched:      row.matched,
    scanImageUrl: row.scan_image_url,
    corners:      row.corners,
    deviceInfo:   row.device_info,
    createdAt:    row.created_at,
  }));
}

// ─── Demo fallback ────────────────────────────────────────────────────────────

/**
 * Răspuns demo când backend-ul nu e configurat.
 * Simulează recunoaștere cu confidence mare.
 */
function getDemoMatch(): ScanMatchResponse {
  // Posterele mock disponibile
  const demos = [
    { posterId: 'poster_001', posterName: 'Warehouse District — East Wall', confidence: 0.91 },
    { posterId: 'poster_002', posterName: 'Metro Hub — Platform B',         confidence: 0.76 },
    { posterId: 'poster_003', posterName: 'Market Square — North Gate',     confidence: 0.58 },
  ];

  // Pick random demo cu confidence diferit pentru testare UX
  const pick = demos[Math.floor(Math.random() * demos.length)];

  return {
    matched:    pick.confidence >= CONFIDENCE_AUTO_OPEN,
    posterId:   pick.posterId,
    posterName: pick.posterName,
    confidence: pick.confidence,
    corners:    [[0.05, 0.08], [0.95, 0.08], [0.95, 0.92], [0.05, 0.92]],
    candidates: demos.map((d) => ({
      posterId:    d.posterId,
      posterName:  d.posterName,
      confidence:  d.confidence,
    })),
    processingMs: 420,
  };
}
