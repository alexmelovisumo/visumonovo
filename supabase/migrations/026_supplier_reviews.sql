-- ─── Migration 026: Avaliações de fornecedores ──────────────────
--
-- Permite que solicitantes avaliem fornecedores após uma cotação respondida.

CREATE TABLE supplier_reviews (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  supplier_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quote_request_id UUID NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
  rating           INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment          TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Uma avaliação por cotação
  UNIQUE (requester_id, quote_request_id)
);

CREATE INDEX idx_supplier_reviews_supplier  ON supplier_reviews(supplier_id);
CREATE INDEX idx_supplier_reviews_requester ON supplier_reviews(requester_id);

ALTER TABLE supplier_reviews ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode ler
CREATE POLICY "supplier_reviews_select"
  ON supplier_reviews FOR SELECT
  TO authenticated
  USING (true);

-- Solicitante pode avaliar somente sua própria cotação respondida
CREATE POLICY "supplier_reviews_insert"
  ON supplier_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    requester_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM quote_requests
      WHERE id = supplier_reviews.quote_request_id
        AND requester_id = auth.uid()
        AND status IN ('responded', 'closed')
    )
  );

CREATE POLICY "supplier_reviews_delete"
  ON supplier_reviews FOR DELETE
  TO authenticated
  USING (requester_id = auth.uid());
