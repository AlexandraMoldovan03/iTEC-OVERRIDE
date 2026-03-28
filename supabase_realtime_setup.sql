-- ============================================================
-- MuralWar — setup Realtime + tabelul mural_layers
-- Rulează în Supabase → SQL Editor
-- ============================================================

-- ── 1. Tabelul mural_layers ──────────────────────────────────
--    Stochează toate trăsăturile/stickere/elementele desenate
--    pe un poster de toți utilizatorii.

CREATE TABLE IF NOT EXISTS public.mural_layers (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  poster_id        TEXT        NOT NULL,          -- ID-ul posterului (din mock sau viitor tabel posters)
  author_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_username  TEXT        NOT NULL,
  team_id          TEXT        NOT NULL CHECK (team_id IN ('minimalist', 'perfectionist', 'chaotic')),
  data             JSONB       NOT NULL,          -- BrushStrokeItem | StickerItem | etc. serializat
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Index pentru fetch rapid al layerelor unui poster
CREATE INDEX IF NOT EXISTS idx_mural_layers_poster_id
  ON public.mural_layers (poster_id, created_at DESC);

-- ── 2. Row Level Security ────────────────────────────────────

ALTER TABLE public.mural_layers ENABLE ROW LEVEL SECURITY;

-- Oricine autentificat poate vedea layerele
CREATE POLICY "Layers sunt vizibile tuturor" ON public.mural_layers
  FOR SELECT USING (true);

-- Doar autorul poate insera propriile layere
CREATE POLICY "Utilizatorii pot insera propriile layere" ON public.mural_layers
  FOR INSERT WITH CHECK (auth.uid() = author_id);

-- Autorul poate sterge propriile layere
CREATE POLICY "Utilizatorii pot sterge propriile layere" ON public.mural_layers
  FOR DELETE USING (auth.uid() = author_id);

-- ── 3. Activare Supabase Realtime pe tabel ──────────────────
--    Permite Postgres Changes (INSERT pe mural_layers) să fie
--    transmis live clienților care ascultă.
--    IMPORTANT: după asta, activează și din Dashboard:
--    Database → Replication → enable mural_layers

ALTER PUBLICATION supabase_realtime ADD TABLE public.mural_layers;

-- ── 4. Funcție helper: scor echipă pe poster ─────────────────
--    Calculează câte layere are fiecare echipă pe un poster.

CREATE OR REPLACE FUNCTION public.get_poster_scores(p_poster_id TEXT)
RETURNS TABLE (team_id TEXT, layer_count BIGINT) AS $$
  SELECT team_id, COUNT(*) as layer_count
  FROM public.mural_layers
  WHERE poster_id = p_poster_id
  GROUP BY team_id;
$$ LANGUAGE SQL STABLE;

-- ============================================================
-- NOTĂ IMPORTANTĂ — Supabase Realtime Channels (Broadcast)
-- ============================================================
--
-- Broadcast channels (cum folosim în realtimeService.ts) NU
-- necesită tabele sau configurare suplimentară în DB.
-- Sunt 100% in-memory și gestionate de serverul Supabase.
--
-- Tot ce trebuie activat:
-- 1. Supabase Dashboard → Project Settings → API
--    → confirma că Realtime e enabled (e by default)
--
-- 2. Pentru Presence (cine e online):
--    Funcționează automat prin Supabase Realtime SDK.
--    Nu necesită nimic în DB.
--
-- ============================================================
-- FLUX COMPLET real-time în MuralWar:
--
-- Utilizator A desenează:
--  → addLayerItem() → optimistic update local
--  → posterService.submitLayer() → INSERT în mural_layers
--  → wsService.send('layer:add') → Broadcast pe canalul
--    `poster:{posterId}` via Supabase Realtime
--
-- Utilizator B (pe același poster):
--  → primește broadcast prin onEvent()
--  → handleWsEvent('layer:add') → adaugă layer în state
--  → MuralCanvas re-render cu noul layer
--
-- Presence (cine e în cameră):
--  → channel.track({ userId, username, teamId }) la join
--  → onPresenceChange() → setOnlineUsers() → HUD actualizat
-- ============================================================
