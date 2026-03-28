/**
 * src/services/posterService.ts
 * Serviciu real conectat la Supabase.
 *
 * Tabel mural_layers → persistă toate desenele permanent.
 * Tabel posters      → date de poster (cu fallback la mock până e populat).
 *
 * Schema Supabase așteptată → vezi supabase_migration.sql
 */

import { supabase } from '../lib/supabase';
import { Poster } from '../types/poster';
import { PosterLayerItem } from '../types/mural';
import { TeamId } from '../types/team';
import { getPosterById, getPosterByAnchor, MOCK_POSTERS } from '../mock';

// ─── Mapare rânduri DB → tipuri TypeScript ────────────────────────────────────

function mapDbLayer(row: Record<string, any>): PosterLayerItem {
  return {
    id:             row.id,
    posterId:       row.poster_id,
    authorId:       row.author_id,
    authorUsername: row.author_username,
    teamId:         row.team_id as TeamId,
    data:           row.data,
    createdAt:      row.created_at,
  };
}

function mapDbPoster(row: Record<string, any>): Poster {
  return {
    id:           row.id,
    name:         row.name,
    anchorCode:   row.anchor_code,
    dimensions:   row.dimensions   ?? { widthMm: 420, heightMm: 594 },
    location:     row.location     ?? undefined,
    territory:    row.territory    ?? {
      ownerTeamId:           null,
      scores:                {},
      heat:                  0,
      lastActivityAt:        new Date().toISOString(),
      recentContributorIds:  [],
    },
    createdAt:    row.created_at,
    thumbnailUri: row.thumbnail_uri ?? undefined,
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const posterService = {

  /**
   * Rezolvă un poster dintr-un anchor code (QR scan).
   * Caută mai întâi în Supabase, apoi cade back pe mock.
   */
  async resolveByAnchor(anchorCode: string): Promise<Poster | null> {
    const { data, error } = await supabase
      .from('posters')
      .select('*')
      .eq('anchor_code', anchorCode)
      .single();

    if (data && !error) return mapDbPoster(data);
    // Fallback la mock (pentru development / demo)
    return getPosterByAnchor(anchorCode) ?? null;
  },

  /**
   * Fetch detalii poster după ID.
   * Caută în Supabase, fallback la mock.
   */
  async fetchPoster(posterId: string): Promise<Poster | null> {
    const { data, error } = await supabase
      .from('posters')
      .select('*')
      .eq('id', posterId)
      .single();

    if (data && !error) return mapDbPoster(data);
    // Fallback la mock
    return getPosterById(posterId) ?? null;
  },

  /**
   * Fetch toate posterele (home screen, vault).
   * Supabase first, fallback la mock.
   */
  async fetchAll(): Promise<Poster[]> {
    const { data, error } = await supabase
      .from('posters')
      .select('*')
      .order('created_at', { ascending: false });

    if (data && !error && data.length > 0) return data.map(mapDbPoster);
    // Fallback la mock dacă tabela e goală sau nu există încă
    return [...MOCK_POSTERS];
  },

  /**
   * ⚡ CRITICĂ: Fetch layere dintr-un poster — mereu din Supabase.
   * Acestea sunt desenele persistate. Dacă tabela nu există → [] (canvas gol).
   */
  async fetchLayers(posterId: string): Promise<PosterLayerItem[]> {
    const { data, error } = await supabase
      .from('mural_layers')
      .select('*')
      .eq('poster_id', posterId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[posterService] fetchLayers error:', error.message);
      // Dacă tabela nu există deloc, returnăm array gol fără crash
      return [];
    }

    return (data ?? []).map(mapDbLayer);
  },

  /**
   * ⚡ CRITICĂ: Salvează un layer nou permanent în Supabase.
   * Fără aceasta, desenele se pierd la restart.
   */
  async submitLayer(
    item: Omit<PosterLayerItem, 'id' | 'createdAt'>
  ): Promise<PosterLayerItem> {
    const { data, error } = await supabase
      .from('mural_layers')
      .insert({
        poster_id:       item.posterId,
        author_id:       item.authorId,
        author_username: item.authorUsername,
        team_id:         item.teamId,
        data:            item.data,
      })
      .select()
      .single();

    if (error) {
      console.error('[posterService] submitLayer error:', error.message);
      throw new Error(`Nu s-a putut salva desenul: ${error.message}`);
    }

    return mapDbLayer(data);
  },

  /**
   * Șterge un layer (doar autorul poate șterge propriile layere — RLS).
   */
  async deleteLayer(layerId: string): Promise<void> {
    const { error } = await supabase
      .from('mural_layers')
      .delete()
      .eq('id', layerId);

    if (error) {
      console.error('[posterService] deleteLayer error:', error.message);
    }
  },

  /**
   * Actualizează territory-ul unui poster în DB (după fiecare calcul de scor).
   * Silențios dacă nu există rândul — posters mock nu sunt în DB.
   */
  async updateTerritory(
    posterId: string,
    territory: Poster['territory']
  ): Promise<void> {
    await supabase
      .from('posters')
      .update({ territory })
      .eq('id', posterId);
    // Ignorăm eroarea — poate fi poster mock care nu e în DB
  },
};
