-- ============================================================
-- VISUMO 2026 — Migration 014: Subscription Transactions & Feature Usage
-- Portado do visumofinal (20251116122838)
-- ============================================================
-- 1. subscription_transactions: histórico completo de pagamentos
-- 2. feature_usage: rastreamento mensal de uso de features por plano
-- ============================================================

-- ─── subscription_transactions ───────────────────────────────

CREATE TABLE IF NOT EXISTS subscription_transactions (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id         UUID NOT NULL REFERENCES user_subscriptions(id) ON DELETE CASCADE,
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  transaction_type        TEXT NOT NULL
    CHECK (transaction_type IN ('payment', 'refund', 'upgrade', 'downgrade', 'cancellation')),

  amount                  NUMERIC(10,2) NOT NULL,
  currency                TEXT NOT NULL DEFAULT 'BRL',

  payment_status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),

  payment_method          TEXT,
  payment_provider        TEXT,
  external_transaction_id TEXT,
  description             TEXT,
  metadata                JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_subscription
  ON subscription_transactions(subscription_id);

CREATE INDEX IF NOT EXISTS idx_transactions_user
  ON subscription_transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_transactions_status
  ON subscription_transactions(payment_status);

CREATE INDEX IF NOT EXISTS idx_transactions_date
  ON subscription_transactions(created_at DESC);

ALTER TABLE subscription_transactions ENABLE ROW LEVEL SECURITY;

-- Usuário vê apenas suas transações
CREATE POLICY "transactions_select_own"
  ON subscription_transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admin vê tudo
CREATE POLICY "transactions_admin"
  ON subscription_transactions FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'admin')
  );

-- Apenas sistema (service_role) insere — não usuários diretos
CREATE POLICY "transactions_insert_service"
  ON subscription_transactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ─── feature_usage ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS feature_usage (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id         UUID NOT NULL REFERENCES user_subscriptions(id) ON DELETE CASCADE,

  usage_month             INTEGER NOT NULL CHECK (usage_month >= 1 AND usage_month <= 12),
  usage_year              INTEGER NOT NULL CHECK (usage_year >= 2024),

  active_projects_count   INTEGER NOT NULL DEFAULT 0,
  proposals_sent_count    INTEGER NOT NULL DEFAULT 0,
  portfolio_images_count  INTEGER NOT NULL DEFAULT 0,
  products_count          INTEGER NOT NULL DEFAULT 0,

  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_usage_per_month UNIQUE (user_id, usage_year, usage_month)
);

CREATE INDEX IF NOT EXISTS idx_feature_usage_user
  ON feature_usage(user_id);

CREATE INDEX IF NOT EXISTS idx_feature_usage_period
  ON feature_usage(usage_year, usage_month);

ALTER TABLE feature_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feature_usage_select_own"
  ON feature_usage FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "feature_usage_upsert_own"
  ON feature_usage FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "feature_usage_update_own"
  ON feature_usage FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "feature_usage_admin"
  ON feature_usage FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'admin')
  );

CREATE TRIGGER feature_usage_updated_at
  BEFORE UPDATE ON feature_usage
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
