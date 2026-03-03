-- ============================================================
-- VISUMO 2026 — Migration 011: Portfolio Images
-- Portado do visumofinal (20251029010421)
-- ============================================================
-- Tabela de imagens de portfólio dos profissionais.
-- Separada das project_images — pertence ao perfil, não ao projeto.
-- ============================================================

CREATE TABLE IF NOT EXISTS portfolio_images (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  image_url   TEXT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_images_profile_id
  ON portfolio_images(profile_id);

CREATE INDEX IF NOT EXISTS idx_portfolio_images_display_order
  ON portfolio_images(profile_id, display_order);

-- ─── RLS ──────────────────────────────────────────────────────

ALTER TABLE portfolio_images ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode ver portfólios
CREATE POLICY "portfolio_images_select"
  ON portfolio_images FOR SELECT
  TO authenticated
  USING (true);

-- Profissional gerencia apenas seu próprio portfólio
CREATE POLICY "portfolio_images_insert"
  ON portfolio_images FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = profile_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_type IN ('profissional', 'empresa_prestadora', 'admin')
    )
  );

CREATE POLICY "portfolio_images_update"
  ON portfolio_images FOR UPDATE
  TO authenticated
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "portfolio_images_delete"
  ON portfolio_images FOR DELETE
  TO authenticated
  USING (auth.uid() = profile_id);

-- Admin acesso total
CREATE POLICY "portfolio_images_admin"
  ON portfolio_images FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- ─── Storage bucket ───────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'portfolio-images',
  'portfolio-images',
  true,
  5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "portfolio_storage_select"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'portfolio-images');

CREATE POLICY "portfolio_storage_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'portfolio-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "portfolio_storage_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'portfolio-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
