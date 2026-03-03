-- ─── Migration 020: Specialties ─────────────────────────────────
--
-- Adiciona coluna de especialidades aos perfis de profissionais
-- e empresa_prestadora para melhorar a descoberta no marketplace.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS specialties TEXT[] NOT NULL DEFAULT '{}';

-- Índice GIN para consultas eficientes em arrays
CREATE INDEX IF NOT EXISTS idx_profiles_specialties
  ON profiles USING GIN (specialties);
