/**
 * src/types/scan.ts
 * Toate tipurile TypeScript pentru sistemul de scanare vizuală.
 *
 * Flow complet:
 *   Camera capture → upload imagine → backend matching → ScanResult
 *   → confidence routing → open poster / show candidates / error
 */

// ─── Coordonate perspectivă ───────────────────────────────────────────────────

/** Un punct normalizat [0..1] în spațiul imaginii capturate */
export type NormalizedCorner = [number, number]; // [x, y]

/** Cele 4 colțuri ale posterului detectat în imagine: [TL, TR, BR, BL] */
export type PosterCorners = [NormalizedCorner, NormalizedCorner, NormalizedCorner, NormalizedCorner];

// ─── Răspuns backend /scan/match ──────────────────────────────────────────────

/** Un candidat returnat de backend */
export interface ScanCandidate {
  posterId:   string;
  posterName: string;
  confidence: number;      // 0..1
  thumbnailUri?: string;
}

/** Răspuns complet de la POST /scan/match */
export interface ScanMatchResponse {
  matched:    boolean;
  posterId?:  string;
  posterName?: string;
  confidence: number;         // 0..1
  corners?:   PosterCorners;  // colțuri în imagine (0..1), dacă backend le returnează
  candidates: ScanCandidate[];
  processingMs?: number;
  error?: string;
}

// ─── Stări UI scanner ─────────────────────────────────────────────────────────

export type ScanPhase =
  | 'idle'          // camera activă, aștept apăsare
  | 'capturing'     // shutter apăsat, freeze frame
  | 'processing'    // imagine trimisă, aștept răspuns
  | 'success'       // poster recunoscut cu confidence mare
  | 'candidates'    // confidence mediu, arăt dialog cu opțiuni
  | 'failed'        // confidence mic, poster nerecunoscut
  | 'error';        // eroare rețea / backend down

/** Rezultatul local după procesarea unui scan */
export interface ScanResult {
  phase:       ScanPhase;
  response?:   ScanMatchResponse;
  capturedUri?: string;  // URI local al imaginii capturate
  timestamp:   number;
}

// ─── Confidence thresholds ────────────────────────────────────────────────────

export const CONFIDENCE_AUTO_OPEN  = 0.75; // ≥ → deschide automat posterul
export const CONFIDENCE_CANDIDATES = 0.35; // ≥ → arată candidați (dialog confirm)
                                            // <  → "Poster not recognized"

// ─── Înregistrare scan în Supabase ───────────────────────────────────────────

/** Rândul salvat în tabela poster_scans */
export interface PosterScanRecord {
  id:             string;
  posterId:       string | null;   // null dacă nu s-a recunoscut
  userId:         string;
  confidence:     number;
  matched:        boolean;
  scanImageUrl?:  string;          // URL în Supabase Storage (opțional)
  corners?:       PosterCorners;
  deviceInfo?:    {
    platform: string;
    model?:   string;
  };
  createdAt:      string;
}

// ─── Config backend ───────────────────────────────────────────────────────────

export interface ScanApiConfig {
  /** URL complet al microserviciului de matching, e.g. https://scan.myapp.com */
  baseUrl:        string;
  /** Timeout în ms pentru cererea de matching (default 15000) */
  timeoutMs?:     number;
  /** Calitatea imaginii trimise: 0..1 (default 0.7) */
  imageQuality?:  number;
}
