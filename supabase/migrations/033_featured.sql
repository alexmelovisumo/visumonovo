-- ─── Migration 033: Destaque Patrocinado ────────────────────────
--
-- Adiciona flag is_featured em projetos e perfis.
-- Apenas admins podem alterar via painel (service role / update direto).
-- A leitura é pública (RLS existente).

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE;

-- Índice parcial para listagens com destaque primeiro
CREATE INDEX IF NOT EXISTS idx_projects_featured ON projects (is_featured DESC, created_at DESC) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_profiles_featured ON profiles (is_featured DESC, created_at DESC) WHERE is_featured = TRUE;
