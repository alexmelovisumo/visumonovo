-- ============================================================
-- VISUMO 2026 — Migration 008: Security Fixes
-- ============================================================

-- ─── FIX 1: proposals_insert deve exigir projeto aberto ──────
--
-- O RLS anterior permitia enviar proposta para projetos com
-- qualquer status. Um profissional mal-intencionado poderia
-- enviar propostas via API diretamente para projetos concluídos.

DROP POLICY IF EXISTS "proposals_insert_professional" ON proposals;

CREATE POLICY "proposals_insert_professional"
  ON proposals FOR INSERT
  WITH CHECK (
    professional_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_type IN ('profissional', 'admin')
    )
    AND EXISTS (
      SELECT 1 FROM projects
      WHERE id = project_id
      AND status = 'open'
    )
  );

-- ─── FIX 2: conversations_insert exige proposta aceita ───────
--
-- Impede criação de conversas arbitrárias entre quaisquer
-- dois usuários sem que haja uma proposta aceita vinculada.

DROP POLICY IF EXISTS "conversations_insert" ON conversations;

CREATE POLICY "conversations_insert"
  ON conversations FOR INSERT
  WITH CHECK (
    (
      participant_one_id = auth.uid()
      OR participant_two_id = auth.uid()
    )
    AND (
      -- Deve existir proposta aceita entre os dois participantes neste projeto
      EXISTS (
        SELECT 1 FROM proposals
        WHERE project_id = conversations.project_id
        AND status = 'accepted'
        AND (
          (professional_id = participant_one_id AND EXISTS (
            SELECT 1 FROM projects
            WHERE id = conversations.project_id
            AND client_id = participant_two_id
          ))
          OR
          (professional_id = participant_two_id AND EXISTS (
            SELECT 1 FROM projects
            WHERE id = conversations.project_id
            AND client_id = participant_one_id
          ))
        )
      )
      OR is_admin()
    )
  );

-- ─── FIX 3: get_nearby_projects — corrigir tipo state ────────
--
-- A coluna projects.state foi alterada para VARCHAR(10) na
-- migration 006, mas a função ainda declarava CHAR(2) no retorno.

CREATE OR REPLACE FUNCTION get_nearby_projects(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  budget_min DECIMAL,
  budget_max DECIMAL,
  deadline DATE,
  status project_status,
  city TEXT,
  state VARCHAR(10),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  distance_km DOUBLE PRECISION,
  created_at TIMESTAMPTZ,
  client_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.title,
    p.description,
    p.budget_min,
    p.budget_max,
    p.deadline,
    p.status,
    p.city,
    p.state,
    p.latitude,
    p.longitude,
    calculate_distance(user_lat, user_lng, p.latitude, p.longitude) AS distance_km,
    p.created_at,
    p.client_id
  FROM projects p
  WHERE
    p.status = 'open'
    AND p.latitude IS NOT NULL
    AND p.longitude IS NOT NULL
    AND calculate_distance(user_lat, user_lng, p.latitude, p.longitude) <= radius_km
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ─── FIX 4: proposals — evitar proposta duplicada ────────────
--
-- Um profissional não deve enviar mais de uma proposta ativa
-- (pending ou accepted) para o mesmo projeto.

ALTER TABLE proposals DROP CONSTRAINT IF EXISTS proposals_unique_pending;

ALTER TABLE proposals
  ADD CONSTRAINT proposals_unique_active
  UNIQUE NULLS NOT DISTINCT (project_id, professional_id)
  -- Postgres 15+ suporta NULLS NOT DISTINCT; para versões antigas use um índice parcial
  DEFERRABLE INITIALLY DEFERRED;

-- Remover a constraint acima (pode conflitar em instâncias antigas) e usar índice parcial
ALTER TABLE proposals DROP CONSTRAINT IF EXISTS proposals_unique_active;

CREATE UNIQUE INDEX IF NOT EXISTS proposals_one_active_per_project
  ON proposals (project_id, professional_id)
  WHERE status IN ('pending', 'accepted');
