-- ─── Migration 021: Profile Views ───────────────────────────────
--
-- Registra visitas ao perfil público de profissionais.
-- Permite que o profissional acompanhe quantas pessoas viram seu perfil.

CREATE TABLE profile_views (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  viewer_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  viewed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profile_views_profile ON profile_views(profile_id, viewed_at DESC);

ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode registrar uma visualização
CREATE POLICY "profile_views_insert"
  ON profile_views FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Apenas o dono do perfil vê as próprias visualizações
CREATE POLICY "profile_views_select_own"
  ON profile_views FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());
