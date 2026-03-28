-- ─────────────────────────────────────────────────────────────────────────────
-- MuralWar — Visual Scanner Migration
-- Run this in your Supabase SQL editor (or via supabase db push).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. poster_scans table ────────────────────────────────────────────────────
--
-- Stores every scan attempt (matched or not).
-- The mobile app writes here via the Supabase JS client.

CREATE TABLE IF NOT EXISTS public.poster_scans (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  poster_id       TEXT,                          -- NULL if not recognised
  confidence      REAL          NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  matched         BOOLEAN       NOT NULL DEFAULT false,
  scan_image_url  TEXT,                          -- optional: URL in Supabase Storage
  corners         JSONB,                         -- [[x,y]*4] normalised 0..1
  device_info     JSONB,                         -- { platform, version, model? }
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Index for profile / vault queries
CREATE INDEX IF NOT EXISTS idx_poster_scans_user_matched
  ON public.poster_scans (user_id, matched, created_at DESC);

-- Index for per-poster analytics
CREATE INDEX IF NOT EXISTS idx_poster_scans_poster_id
  ON public.poster_scans (poster_id)
  WHERE poster_id IS NOT NULL;

-- ── 2. RLS policies ─────────────────────────────────────────────────────────

ALTER TABLE public.poster_scans ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own scans
CREATE POLICY "Users own their scans — select"
  ON public.poster_scans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users own their scans — insert"
  ON public.poster_scans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users own their scans — update"
  ON public.poster_scans FOR UPDATE
  USING (auth.uid() = user_id);

-- ── 3. Add reference_image_url column to posters ────────────────────────────
--
-- The backend uses this URL to download + index reference images for matching.
-- Adjust the table name if yours differs (e.g., "mural_posters").

ALTER TABLE public.posters
  ADD COLUMN IF NOT EXISTS reference_image_url TEXT;

COMMENT ON COLUMN public.posters.reference_image_url IS
  'Public URL of the reference image used for visual ORB matching. '
  'Store the full-res, front-facing poster photo here.';

-- ── 4. Helpful view: scan_stats_per_poster ───────────────────────────────────

CREATE OR REPLACE VIEW public.scan_stats_per_poster AS
SELECT
  poster_id,
  COUNT(*)                                           AS total_scans,
  COUNT(*) FILTER (WHERE matched = true)             AS matched_scans,
  ROUND(AVG(confidence)::NUMERIC, 3)                 AS avg_confidence,
  MAX(created_at)                                    AS last_scanned_at
FROM public.poster_scans
WHERE poster_id IS NOT NULL
GROUP BY poster_id;

-- ─────────────────────────────────────────────────────────────────────────────
-- Done! Next steps:
--   1. Add reference images to Supabase Storage (or any public CDN).
--   2. Update posters.reference_image_url for each poster.
--   3. Call POST /posters on the backend to index them.
--   4. Set EXPO_PUBLIC_SCAN_API_URL in your .env to your deployed backend URL.
-- ─────────────────────────────────────────────────────────────────────────────
