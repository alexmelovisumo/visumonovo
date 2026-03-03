-- ============================================================
-- VISUMO 2026 — Migration 001: Tabelas Principais
-- Rodar no: Supabase Dashboard → SQL Editor
-- ============================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ─── ENUM TYPES ─────────────────────────────────────────────

CREATE TYPE user_type AS ENUM ('empresa', 'profissional', 'fornecedor', 'admin');
CREATE TYPE project_status AS ENUM ('open', 'in_negotiation', 'in_progress', 'completed', 'cancelled');
CREATE TYPE proposal_status AS ENUM ('pending', 'accepted', 'rejected', 'withdrawn');
CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'pending', 'cancelled', 'expired');
CREATE TYPE billing_cycle AS ENUM ('monthly', 'yearly');
CREATE TYPE coupon_type AS ENUM ('percentage', 'fixed_amount', 'free_months', 'lifetime_free');

-- ─── PROFILES ───────────────────────────────────────────────

CREATE TABLE profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email               TEXT NOT NULL,
  full_name           TEXT,
  phone               TEXT,
  user_type           user_type NOT NULL DEFAULT 'empresa',
  company_name        TEXT,
  document_number     TEXT,
  address             TEXT,
  city                TEXT,
  state               CHAR(2),
  postal_code         TEXT,
  bio                 TEXT,
  website             TEXT,
  linkedin            TEXT,
  portfolio_url       TEXT,
  profile_image_url   TEXT,
  latitude            DOUBLE PRECISION,
  longitude           DOUBLE PRECISION,
  coverage_radius_km  INTEGER DEFAULT 50,
  coverage_cities     TEXT[],
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── PROJECT CATEGORIES ─────────────────────────────────────

CREATE TABLE project_categories (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  description   TEXT,
  icon          TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── PROJECTS ───────────────────────────────────────────────

CREATE TABLE projects (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  budget_min  DECIMAL(10,2),
  budget_max  DECIMAL(10,2),
  deadline    DATE,
  status      project_status NOT NULL DEFAULT 'open',
  city        TEXT,
  state       CHAR(2),
  latitude    DOUBLE PRECISION,
  longitude   DOUBLE PRECISION,
  view_count  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);

-- ─── PROJECT CATEGORY ASSIGNMENTS ───────────────────────────

CREATE TABLE project_category_assignments (
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES project_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, category_id)
);

-- ─── PROJECT IMAGES ─────────────────────────────────────────

CREATE TABLE project_images (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  image_url     TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_project_images_project_id ON project_images(project_id);

-- ─── PROPOSALS ──────────────────────────────────────────────

CREATE TABLE proposals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message         TEXT NOT NULL,
  proposed_value  DECIMAL(10,2) NOT NULL,
  estimated_days  INTEGER NOT NULL,
  status          proposal_status NOT NULL DEFAULT 'pending',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, professional_id)
);

CREATE TRIGGER proposals_updated_at
  BEFORE UPDATE ON proposals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_proposals_project_id ON proposals(project_id);
CREATE INDEX idx_proposals_professional_id ON proposals(professional_id);

-- ─── CONVERSATIONS ──────────────────────────────────────────

CREATE TABLE conversations (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  proposal_id         UUID REFERENCES proposals(id) ON DELETE SET NULL,
  participant_one_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  participant_two_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_message_at     TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, participant_one_id, participant_two_id)
);

CREATE INDEX idx_conversations_participant_one ON conversations(participant_one_id);
CREATE INDEX idx_conversations_participant_two ON conversations(participant_two_id);

-- ─── MESSAGES ───────────────────────────────────────────────

CREATE TABLE messages (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id  UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content          TEXT NOT NULL,
  is_read          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- Auto-update last_message_at na conversa
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER messages_update_conversation
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- ─── SUBSCRIPTION PLANS ─────────────────────────────────────

CREATE TABLE subscription_plans (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                      TEXT NOT NULL UNIQUE,
  display_name              TEXT NOT NULL,
  description               TEXT,
  price_monthly             DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_yearly              DECIMAL(10,2),
  features                  TEXT[] NOT NULL DEFAULT '{}',
  user_type                 user_type NOT NULL,
  max_active_projects       INTEGER,  -- NULL = ilimitado
  max_proposals_per_month   INTEGER,  -- NULL = ilimitado
  is_active                 BOOLEAN NOT NULL DEFAULT TRUE,
  display_order             INTEGER NOT NULL DEFAULT 0,
  payment_link_monthly      TEXT,
  payment_link_yearly       TEXT
);

-- ─── USER SUBSCRIPTIONS ─────────────────────────────────────

CREATE TABLE user_subscriptions (
  id                           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id                      UUID NOT NULL REFERENCES subscription_plans(id),
  status                       subscription_status NOT NULL DEFAULT 'trial',
  billing_cycle                billing_cycle NOT NULL DEFAULT 'monthly',
  current_price                DECIMAL(10,2) NOT NULL DEFAULT 0,
  subscription_start_date      TIMESTAMPTZ,
  subscription_end_date        TIMESTAMPTZ,
  trial_end_date               TIMESTAMPTZ,
  auto_renew                   BOOLEAN NOT NULL DEFAULT TRUE,
  coupon_code                  TEXT,
  discount_applied             DECIMAL(10,2) NOT NULL DEFAULT 0,
  mercadopago_subscription_id  TEXT,
  mercadopago_payment_id       TEXT,
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);

-- ─── COUPONS ────────────────────────────────────────────────

CREATE TABLE coupons (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                  TEXT NOT NULL UNIQUE,
  type                  coupon_type NOT NULL,
  value                 DECIMAL(10,2) NOT NULL,
  max_uses              INTEGER,
  current_uses          INTEGER NOT NULL DEFAULT 0,
  valid_until           TIMESTAMPTZ,
  applicable_user_types user_type[],
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_by            UUID NOT NULL REFERENCES profiles(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE coupon_usage (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coupon_id        UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subscription_id  UUID NOT NULL REFERENCES user_subscriptions(id) ON DELETE CASCADE,
  used_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(coupon_id, user_id)
);

-- ─── PRODUCTS (Fornecedor) ───────────────────────────────────

CREATE TABLE products (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  price        DECIMAL(10,2),
  category     TEXT,
  image_url    TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_products_supplier_id ON products(supplier_id);
