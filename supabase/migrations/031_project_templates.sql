-- ─── Migration 031: Templates de Projeto ─────────────────────
--
-- Permite que empresas salvem projetos como templates
-- para reutilizar em criações futuras.

CREATE TABLE IF NOT EXISTS project_templates (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  budget_min   NUMERIC(10,2),
  budget_max   NUMERIC(10,2),
  city         TEXT,
  state        TEXT,
  category_ids TEXT[] NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_owner
  ON project_templates(owner_id);

ALTER TABLE project_templates ENABLE ROW LEVEL SECURITY;

-- Apenas o dono acessa seus próprios templates
CREATE POLICY "templates_owner"
  ON project_templates FOR ALL
  TO authenticated
  USING  (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());
