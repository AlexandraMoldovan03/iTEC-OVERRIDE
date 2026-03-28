-- ============================================================
--  MuralWar — Supabase Migration
--  Rulează ODATĂ în SQL Editor din Supabase Dashboard.
--  Project → SQL Editor → New query → paste → Run
-- ============================================================

-- ─── Tabelul posterelor ───────────────────────────────────────────────────────
-- Stochează metadata posterelor fizice (opțional — fallback la mock dacă lipsesc)

CREATE TABLE IF NOT EXISTS public.posters (
  id            TEXT PRIMARY KEY,
  name          TEXT        NOT NULL,
  anchor_code   TEXT        UNIQUE NOT NULL,
  dimensions    JSONB       NOT NULL DEFAULT '{"widthMm": 420, "heightMm": 594}',
  location      JSONB,
  territory     JSONB       NOT NULL DEFAULT '{"ownerTeamId": null, "scores": {}, "heat": 0, "lastActivityAt": null, "recentContributorIds": []}',
  thumbnail_uri TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS posters: oricine poate citi, nimeni nu poate scrie direct din client
ALTER TABLE public.posters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "posters_select" ON public.posters;
CREATE POLICY "posters_select"
  ON public.posters FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "posters_update_territory" ON public.posters;
CREATE POLICY "posters_update_territory"
  ON public.posters FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ─── Tabelul layerelor de desen ───────────────────────────────────────────────
-- Fiecare rând = un singur desen (stroke, sticker, etc.) de la un utilizator.
-- Acesta este INIMA persistenței — fără el desenele se pierd la restart.

CREATE TABLE IF NOT EXISTS public.mural_layers (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  poster_id       TEXT        NOT NULL,
  author_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_username TEXT        NOT NULL,
  team_id         TEXT        NOT NULL CHECK (team_id IN ('minimalist', 'perfectionist', 'chaotic')),
  data            JSONB       NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pentru query-ul principal (fetch layere per poster, sortat cronologic)
CREATE INDEX IF NOT EXISTS idx_mural_layers_poster_id
  ON public.mural_layers (poster_id, created_at ASC);

-- Index pentru clasament per echipă
CREATE INDEX IF NOT EXISTS idx_mural_layers_team_id
  ON public.mural_layers (poster_id, team_id);

-- ─── RLS mural_layers ─────────────────────────────────────────────────────────

ALTER TABLE public.mural_layers ENABLE ROW LEVEL SECURITY;

-- Oricine logat poate citi layerele unui poster
DROP POLICY IF EXISTS "layers_select" ON public.mural_layers;
CREATE POLICY "layers_select"
  ON public.mural_layers FOR SELECT
  USING (auth.role() = 'authenticated');

-- Un utilizator logat poate insera layere proprii
DROP POLICY IF EXISTS "layers_insert" ON public.mural_layers;
CREATE POLICY "layers_insert"
  ON public.mural_layers FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- Un utilizator poate șterge doar propriile layere
DROP POLICY IF EXISTS "layers_delete" ON public.mural_layers;
CREATE POLICY "layers_delete"
  ON public.mural_layers FOR DELETE
  USING (auth.uid() = author_id);


-- ─── Realtime ─────────────────────────────────────────────────────────────────
-- Activează Realtime pe tabelul layerelor (pentru sync multi-user)
-- NOTĂ: Activarea se face și din Dashboard → Database → Replication

ALTER PUBLICATION supabase_realtime ADD TABLE public.mural_layers;


-- ─── Funcție helper: scoruri poster ──────────────────────────────────────────
-- Opțional — poate fi apelată server-side pentru a calcula scorurile echipelor.
-- Clientul calculează local din layers, deci nu e obligatorie.

CREATE OR REPLACE FUNCTION public.get_poster_scores(p_poster_id TEXT)
RETURNS TABLE (
  team_id    TEXT,
  score      INT,
  layer_count INT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    team_id,
    SUM(
      CASE
        WHEN (data->>'type') = 'glow'      THEN 3
        WHEN (data->>'type') = 'spray'     THEN 2
        WHEN (data->>'type') = 'teamStamp' THEN 2
        WHEN (data->>'type') = 'brush'     THEN 1
        WHEN (data->>'type') = 'sticker'   THEN 1
        ELSE 0
      END
    )::INT AS score,
    COUNT(*)::INT AS layer_count
  FROM public.mural_layers
  WHERE poster_id = p_poster_id
  GROUP BY team_id
  ORDER BY score DESC;
$$;


-- ─── Instrucțiuni activare Realtime (Dashboard) ───────────────────────────────
-- 1. Supabase Dashboard → Database → Replication
-- 2. Activează "supabase_realtime" publication
-- 3. Asigură-te că tabelul "mural_layers" este inclus
--
-- SAU rulează direct:
--    ALTER PUBLICATION supabase_realtime ADD TABLE public.mural_layers;
--    (deja inclus mai sus)
