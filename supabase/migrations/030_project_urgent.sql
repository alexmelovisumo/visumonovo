-- ─── Migration 030: Flag de Urgência em Projetos ─────────────
--
-- Permite que a empresa marque um projeto como urgente,
-- dando destaque na listagem.

ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_projects_urgent
  ON projects(is_urgent) WHERE is_urgent = TRUE;
