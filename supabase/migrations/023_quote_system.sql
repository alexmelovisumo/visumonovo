-- ─── Migration 023: Quote System ─────────────────────────────────
--
-- Cotações entre empresa/profissional e fornecedores.
-- O solicitante envia um pedido de cotação; o fornecedor responde
-- com preço, prazo e mensagem.

CREATE TABLE IF NOT EXISTS quote_requests (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id  UUID        NOT NULL REFERENCES profiles(id)  ON DELETE CASCADE,
  supplier_id   UUID        NOT NULL REFERENCES profiles(id)  ON DELETE CASCADE,
  product_id    UUID                 REFERENCES products(id)  ON DELETE SET NULL,
  product_title TEXT,         -- desnormalizado; preservado se produto for deletado
  message       TEXT        NOT NULL,
  quantity      TEXT,
  status        TEXT        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'responded', 'closed')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quote_responses (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_request_id UUID        NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
  unit_price       NUMERIC(10,2),
  message          TEXT        NOT NULL,
  estimated_days   INT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Índices ─────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_qr_requester ON quote_requests(requester_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qr_supplier  ON quote_requests(supplier_id,  created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qresp_req    ON quote_responses(quote_request_id);

-- ─── RLS ────────────────────────────────────────────────────────

ALTER TABLE quote_requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_responses ENABLE ROW LEVEL SECURITY;

-- Solicitante vê os que enviou; fornecedor vê os que recebeu
CREATE POLICY "qr_select" ON quote_requests
  FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR supplier_id = auth.uid());

-- Apenas o solicitante pode criar
CREATE POLICY "qr_insert" ON quote_requests
  FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid());

-- Apenas o fornecedor pode atualizar status
CREATE POLICY "qr_update" ON quote_requests
  FOR UPDATE TO authenticated
  USING (supplier_id = auth.uid());

-- Respostas: visíveis para ambas as partes
CREATE POLICY "qresp_select" ON quote_responses
  FOR SELECT TO authenticated
  USING (
    quote_request_id IN (
      SELECT id FROM quote_requests
      WHERE requester_id = auth.uid() OR supplier_id = auth.uid()
    )
  );

-- Apenas o fornecedor da cotação pode inserir resposta
CREATE POLICY "qresp_insert" ON quote_responses
  FOR INSERT TO authenticated
  WITH CHECK (
    quote_request_id IN (
      SELECT id FROM quote_requests WHERE supplier_id = auth.uid()
    )
  );
