-- ─── Migration 022: Verified Profiles ───────────────────────────
--
-- Adiciona badge de verificação para profissionais e empresas.
-- Apenas admins podem verificar/revogar um perfil.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- Apenas admins podem alterar is_verified (via service role / painel admin)
-- A leitura é pública (via RLS existente no profiles)
