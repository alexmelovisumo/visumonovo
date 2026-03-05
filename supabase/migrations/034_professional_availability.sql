-- ─── Migration 034: Disponibilidade do Profissional ─────────────
--
-- Permite que profissionais e empresa_prestadora indiquem se estão
-- disponíveis para aceitar novos projetos.
-- A leitura é pública (RLS existente em profiles).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_available BOOLEAN NOT NULL DEFAULT TRUE;
