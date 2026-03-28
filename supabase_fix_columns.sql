-- ─────────────────────────────────────────────────────────────────────────────
-- MuralWar — Fix poster_scans missing columns
--
-- Run this in your Supabase dashboard → SQL Editor
-- (Project → SQL Editor → New Query → paste this → Run)
--
-- Safe to run multiple times — ADD COLUMN IF NOT EXISTS skips existing columns.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Create table if it doesn't exist at all ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.poster_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

-- ── 2. Add all required columns (safe — IF NOT EXISTS) ───────────────────────

ALTER TABLE public.poster_scans
  ADD COLUMN IF NOT EXISTS user_id       UUID         REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS poster_id     TEXT,
  ADD COLUMN IF NOT EXISTS confidence    REAL         NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS matched       BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS scan_image_url TEXT,
  ADD COLUMN IF NOT EXISTS corners       JSONB,
  ADD COLUMN IF NOT EXISTS device_info   JSONB,
  ADD COLUMN IF NOT EXISTS created_at    TIMESTAMPTZ  NOT NULL DEFAULT now();

-- ── 3. Add reference_image_url to posters table ──────────────────────────────
ALTER TABLE public.posters
  ADD COLUMN IF NOT EXISTS reference_image_url TEXT;

-- ── 4. Enable RLS if not already enabled ─────────────────────────────────────
ALTER TABLE public.poster_scans ENABLE ROW LEVEL SECURITY;

-- ── 5. RLS policies (DROP first in case they exist with wrong definition) ─────

DROP POLICY IF EXISTS "Users own their scans — select" ON public.poster_scans;
DROP POLICY IF EXISTS "Users own their scans — insert" ON public.poster_scans;
DROP POLICY IF EXISTS "Users own their scans — update" ON public.poster_scans;

CREATE POLICY "Users own their scans — select"
  ON public.poster_scans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users own their scans — insert"
  ON public.poster_scans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users own their scans — update"
  ON public.poster_scans FOR UPDATE
  USING (auth.uid() = user_id);

-- ── 6. Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_poster_scans_user_matched
  ON public.poster_scans (user_id, matched, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_poster_scans_poster_id
  ON public.poster_scans (poster_id)
  WHERE poster_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- Done! Reload the Supabase schema cache by running:
--   NOTIFY pgrst, 'reload schema';
-- Or restart your Supabase project (Settings → Restart project).
-- ─────────────────────────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
