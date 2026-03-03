-- ============================================================
-- VISUMO 2026 — Migration 013: Reviews & Message Enhancements
-- Portado do visumofinal (20251111173142)
-- ============================================================
-- 1. Tabela reviews: avaliações entre empresa e profissional
--    após conclusão de projeto.
-- 2. Tabela project_completions: registro formal de conclusão.
-- 3. Colunas extras em messages: image_url e is_progress_update.
-- ============================================================

-- ─── reviews ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reviews (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reviewer_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewed_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id             UUID REFERENCES projects(id) ON DELETE SET NULL,

  -- Nota geral (1-5)
  rating                 INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),

  -- Notas detalhadas (opcionais)
  quality_rating         INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
  communication_rating   INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  punctuality_rating     INTEGER CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
  professionalism_rating INTEGER CHECK (professionalism_rating >= 1 AND professionalism_rating <= 5),

  comment                TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Uma avaliação por revisor por projeto
  CONSTRAINT reviews_unique_per_project UNIQUE (reviewer_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_reviewer   ON reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewed   ON reviews(reviewed_id);
CREATE INDEX IF NOT EXISTS idx_reviews_project    ON reviews(project_id);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews_select"
  ON reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "reviews_insert"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    reviewer_id = auth.uid()
    -- Só pode avaliar se participou do projeto
    AND (
      project_id IS NULL
      OR EXISTS (
        SELECT 1 FROM projects
        WHERE id = reviews.project_id
        AND (
          client_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM proposals
            WHERE project_id = reviews.project_id
            AND professional_id = auth.uid()
            AND status = 'accepted'
          )
        )
      )
    )
  );

CREATE POLICY "reviews_update"
  ON reviews FOR UPDATE
  TO authenticated
  USING (reviewer_id = auth.uid())
  WITH CHECK (reviewer_id = auth.uid());

CREATE POLICY "reviews_delete"
  ON reviews FOR DELETE
  TO authenticated
  USING (reviewer_id = auth.uid());

CREATE POLICY "reviews_admin"
  ON reviews FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'admin')
  );

-- ─── project_completions ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS project_completions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  completed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  final_price     NUMERIC(10,2),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id)
);

CREATE INDEX IF NOT EXISTS idx_project_completions_project
  ON project_completions(project_id);

CREATE INDEX IF NOT EXISTS idx_project_completions_professional
  ON project_completions(professional_id);

CREATE INDEX IF NOT EXISTS idx_project_completions_company
  ON project_completions(company_id);

ALTER TABLE project_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "completions_select_company"
  ON project_completions FOR SELECT
  TO authenticated
  USING (company_id = auth.uid() OR professional_id = auth.uid());

CREATE POLICY "completions_insert_professional"
  ON project_completions FOR INSERT
  TO authenticated
  WITH CHECK (
    professional_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM proposals
      WHERE proposals.project_id = project_completions.project_id
      AND proposals.professional_id = auth.uid()
      AND proposals.status = 'accepted'
    )
  );

CREATE POLICY "completions_update_company"
  ON project_completions FOR UPDATE
  TO authenticated
  USING (company_id = auth.uid());

CREATE POLICY "completions_admin"
  ON project_completions FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'admin')
  );

-- ─── messages: novas colunas ──────────────────────────────────
-- Adiciona suporte a imagens no chat e marcação de atualização de progresso

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE messages ADD COLUMN image_url TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'is_progress_update'
  ) THEN
    ALTER TABLE messages ADD COLUMN is_progress_update BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_messages_image
  ON messages(image_url) WHERE image_url IS NOT NULL;
