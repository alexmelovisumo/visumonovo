-- ============================================================
-- VISUMO 2026 — Migration 002: Row Level Security (RLS)
-- ============================================================

-- ─── HABILITAR RLS ──────────────────────────────────────────

ALTER TABLE profiles                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_categories          ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_category_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_images              ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations               ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans          ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usage                ENABLE ROW LEVEL SECURITY;
ALTER TABLE products                    ENABLE ROW LEVEL SECURITY;

-- ─── HELPER: verificar se é admin ───────────────────────────

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND user_type = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─── PROFILES ───────────────────────────────────────────────

-- Qualquer um pode ver perfis ativos (necessário para marketplace)
CREATE POLICY "profiles_select_public"
  ON profiles FOR SELECT
  USING (is_active = TRUE OR id = auth.uid() OR is_admin());

-- Usuário só cria o próprio perfil
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- Usuário só atualiza o próprio perfil / admin atualiza qualquer um
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (id = auth.uid() OR is_admin())
  WITH CHECK (id = auth.uid() OR is_admin());

-- Só admin pode deletar perfis (delete real via Edge Function)
CREATE POLICY "profiles_delete_admin"
  ON profiles FOR DELETE
  USING (is_admin());

-- ─── PROJECT CATEGORIES ─────────────────────────────────────

-- Categorias são públicas para leitura
CREATE POLICY "categories_select_all"
  ON project_categories FOR SELECT
  USING (TRUE);

-- Só admin gerencia categorias
CREATE POLICY "categories_insert_admin"
  ON project_categories FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "categories_update_admin"
  ON project_categories FOR UPDATE
  USING (is_admin());

CREATE POLICY "categories_delete_admin"
  ON project_categories FOR DELETE
  USING (is_admin());

-- ─── PROJECTS ───────────────────────────────────────────────

-- Projetos abertos são públicos; projetos privados só participantes
CREATE POLICY "projects_select_public"
  ON projects FOR SELECT
  USING (
    status = 'open'
    OR client_id = auth.uid()
    OR is_admin()
    OR EXISTS (
      SELECT 1 FROM proposals
      WHERE proposals.project_id = projects.id
      AND proposals.professional_id = auth.uid()
    )
  );

-- Só empresa/admin cria projetos
CREATE POLICY "projects_insert_empresa"
  ON projects FOR INSERT
  WITH CHECK (
    client_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_type IN ('empresa', 'admin')
    )
  );

-- Só o dono do projeto ou admin pode editar
CREATE POLICY "projects_update_own"
  ON projects FOR UPDATE
  USING (client_id = auth.uid() OR is_admin());

-- Só o dono ou admin pode deletar
CREATE POLICY "projects_delete_own"
  ON projects FOR DELETE
  USING (client_id = auth.uid() OR is_admin());

-- ─── PROJECT CATEGORY ASSIGNMENTS ───────────────────────────

CREATE POLICY "pca_select_all"
  ON project_category_assignments FOR SELECT
  USING (TRUE);

CREATE POLICY "pca_insert_own"
  ON project_category_assignments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE id = project_id AND client_id = auth.uid()
    ) OR is_admin()
  );

CREATE POLICY "pca_delete_own"
  ON project_category_assignments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE id = project_id AND client_id = auth.uid()
    ) OR is_admin()
  );

-- ─── PROJECT IMAGES ─────────────────────────────────────────

CREATE POLICY "project_images_select_all"
  ON project_images FOR SELECT
  USING (TRUE);

CREATE POLICY "project_images_insert_own"
  ON project_images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE id = project_id AND client_id = auth.uid()
    ) OR is_admin()
  );

CREATE POLICY "project_images_delete_own"
  ON project_images FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE id = project_id AND client_id = auth.uid()
    ) OR is_admin()
  );

-- ─── PROPOSALS ──────────────────────────────────────────────

-- Empresa vê propostas dos seus projetos; profissional vê as suas
CREATE POLICY "proposals_select"
  ON proposals FOR SELECT
  USING (
    professional_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM projects
      WHERE id = project_id AND client_id = auth.uid()
    )
    OR is_admin()
  );

-- Só profissional envia proposta
CREATE POLICY "proposals_insert_professional"
  ON proposals FOR INSERT
  WITH CHECK (
    professional_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_type IN ('profissional', 'admin')
    )
  );

-- Profissional atualiza a própria; empresa atualiza (aceitar/rejeitar) as do seu projeto
CREATE POLICY "proposals_update"
  ON proposals FOR UPDATE
  USING (
    professional_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM projects
      WHERE id = project_id AND client_id = auth.uid()
    )
    OR is_admin()
  );

-- Profissional pode retirar a própria proposta
CREATE POLICY "proposals_delete_own"
  ON proposals FOR DELETE
  USING (professional_id = auth.uid() OR is_admin());

-- ─── CONVERSATIONS ──────────────────────────────────────────

-- Só os participantes veem a conversa
CREATE POLICY "conversations_select_participants"
  ON conversations FOR SELECT
  USING (
    participant_one_id = auth.uid()
    OR participant_two_id = auth.uid()
    OR is_admin()
  );

CREATE POLICY "conversations_insert"
  ON conversations FOR INSERT
  WITH CHECK (
    participant_one_id = auth.uid()
    OR participant_two_id = auth.uid()
    OR is_admin()
  );

-- ─── MESSAGES ───────────────────────────────────────────────

-- Só participantes da conversa veem mensagens
CREATE POLICY "messages_select_participants"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE id = conversation_id
      AND (participant_one_id = auth.uid() OR participant_two_id = auth.uid())
    )
    OR is_admin()
  );

-- Só participantes enviam mensagens
CREATE POLICY "messages_insert_participants"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversations
      WHERE id = conversation_id
      AND (participant_one_id = auth.uid() OR participant_two_id = auth.uid())
    )
  );

-- Marcar como lido (só o destinatário)
CREATE POLICY "messages_update_read"
  ON messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE id = conversation_id
      AND (participant_one_id = auth.uid() OR participant_two_id = auth.uid())
    )
  );

-- ─── SUBSCRIPTION PLANS ─────────────────────────────────────

-- Planos são públicos
CREATE POLICY "plans_select_all"
  ON subscription_plans FOR SELECT
  USING (TRUE);

-- Só admin gerencia
CREATE POLICY "plans_manage_admin"
  ON subscription_plans FOR ALL
  USING (is_admin());

-- ─── USER SUBSCRIPTIONS ─────────────────────────────────────

-- Usuário vê a própria; admin vê todas
CREATE POLICY "subscriptions_select_own"
  ON user_subscriptions FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "subscriptions_insert_own"
  ON user_subscriptions FOR INSERT
  WITH CHECK (user_id = auth.uid() OR is_admin());

-- Edge Functions + admin atualizam (status de pagamento)
CREATE POLICY "subscriptions_update"
  ON user_subscriptions FOR UPDATE
  USING (user_id = auth.uid() OR is_admin());

-- ─── COUPONS ────────────────────────────────────────────────

-- Só admin cria cupons
CREATE POLICY "coupons_select_active"
  ON coupons FOR SELECT
  USING (is_active = TRUE OR is_admin());

CREATE POLICY "coupons_manage_admin"
  ON coupons FOR ALL
  USING (is_admin());

-- ─── COUPON USAGE ───────────────────────────────────────────

CREATE POLICY "coupon_usage_select_own"
  ON coupon_usage FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "coupon_usage_insert_own"
  ON coupon_usage FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ─── PRODUCTS ───────────────────────────────────────────────

-- Produtos ativos são públicos
CREATE POLICY "products_select_public"
  ON products FOR SELECT
  USING (is_active = TRUE OR supplier_id = auth.uid() OR is_admin());

CREATE POLICY "products_insert_supplier"
  ON products FOR INSERT
  WITH CHECK (
    supplier_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_type IN ('fornecedor', 'admin')
    )
  );

CREATE POLICY "products_update_own"
  ON products FOR UPDATE
  USING (supplier_id = auth.uid() OR is_admin());

CREATE POLICY "products_delete_own"
  ON products FOR DELETE
  USING (supplier_id = auth.uid() OR is_admin());
