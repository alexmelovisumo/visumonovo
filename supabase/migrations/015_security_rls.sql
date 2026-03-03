-- ============================================================
-- VISUMO 2026 — Migration 015: Security & RLS Fixes
-- Baseado nas correções acumuladas do visumofinal
-- ============================================================
-- Problema: migrations 011-014 usam EXISTS inline para checar admin.
-- Isso pode causar recursão infinita no RLS porque profiles também
-- tem RLS habilitado.
--
-- Solução: substituir todos os checks inline por is_admin() que é
-- SECURITY DEFINER e bypassa RLS ao consultar profiles.
--
-- Extras:
-- 1. has_accepted_proposal() — função helper para evitar recursão
--    em políticas de conversas/projetos
-- 2. Garantir que subscription_plans é leiável sem autenticação
--    (necessário para a página pública /escolher-plano)
-- ============================================================

-- ─── 1. Função helper: has_accepted_proposal ─────────────────
-- Verifica se um profissional tem proposta aceita num projeto,
-- sem acionar recursão RLS. Portado do visumofinal.

CREATE OR REPLACE FUNCTION has_accepted_proposal(
  p_project_id  UUID,
  p_user_id     UUID
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM proposals
    WHERE project_id = p_project_id
      AND professional_id = p_user_id
      AND status = 'accepted'
  );
$$;

-- ─── 2. Corrigir políticas admin em portfolio_images ─────────
-- Substituir EXISTS inline → is_admin()

DROP POLICY IF EXISTS "portfolio_images_admin" ON portfolio_images;

CREATE POLICY "portfolio_images_admin"
  ON portfolio_images FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ─── 3. Corrigir políticas admin em project_attachments ──────

-- Reescrever select policy usando has_accepted_proposal() + is_admin()
DROP POLICY IF EXISTS "attachments_select"   ON project_attachments;
DROP POLICY IF EXISTS "attachments_insert"   ON project_attachments;
DROP POLICY IF EXISTS "attachments_delete"   ON project_attachments;

CREATE POLICY "attachments_select"
  ON project_attachments FOR SELECT
  TO authenticated
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_attachments.project_id
        AND projects.client_id = auth.uid()
    )
    OR has_accepted_proposal(project_id, auth.uid())
  );

CREATE POLICY "attachments_insert"
  ON project_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = uploaded_by
    AND (
      EXISTS (
        SELECT 1 FROM projects
        WHERE projects.id = project_attachments.project_id
          AND projects.client_id = auth.uid()
      )
      OR has_accepted_proposal(project_id, auth.uid())
    )
  );

CREATE POLICY "attachments_delete"
  ON project_attachments FOR DELETE
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR is_admin()
  );

-- ─── 4. Corrigir políticas admin em reviews ──────────────────

DROP POLICY IF EXISTS "reviews_admin" ON reviews;

CREATE POLICY "reviews_admin"
  ON reviews FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ─── 5. Corrigir políticas admin em project_completions ──────

DROP POLICY IF EXISTS "completions_admin" ON project_completions;

CREATE POLICY "completions_admin"
  ON project_completions FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ─── 6. Corrigir políticas admin em subscription_transactions ─

DROP POLICY IF EXISTS "transactions_admin"          ON subscription_transactions;
DROP POLICY IF EXISTS "transactions_insert_service" ON subscription_transactions;

CREATE POLICY "transactions_admin"
  ON subscription_transactions FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Usuários só inserem suas próprias transações
CREATE POLICY "transactions_insert_own"
  ON subscription_transactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ─── 7. Corrigir políticas admin em feature_usage ────────────

DROP POLICY IF EXISTS "feature_usage_admin" ON feature_usage;

CREATE POLICY "feature_usage_admin"
  ON feature_usage FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ─── 8. subscription_plans: leitura pública (anon) ───────────
-- A página /escolher-plano é pública e precisa carregar os planos
-- sem que o usuário esteja logado.

DROP POLICY IF EXISTS "plans_select_active" ON subscription_plans;

CREATE POLICY "plans_select_active"
  ON subscription_plans FOR SELECT
  USING (is_active = TRUE);

-- ─── 9. Garantir índice para performance nas funções helper ──

CREATE INDEX IF NOT EXISTS idx_proposals_accepted
  ON proposals(project_id, professional_id)
  WHERE status = 'accepted';
