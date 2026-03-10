-- ============================================================
-- VISUMO 2026 — Migration 040: Fix policies for empresa_prestadora
-- ============================================================
-- 1. proposals_select: restore direct EXISTS (works now since
--    projects_select_public uses user_has_proposal SECURITY DEFINER,
--    breaking the old circular reference without needing project_owned_by)
-- 2. proposals_insert: allow empresa_prestadora to send proposals
-- 3. proposals_update: allow empresa_prestadora to accept/reject
-- 4. projects_insert: allow empresa_prestadora + fornecedor_empresa
-- 5. projects_update: allow empresa_prestadora to edit own projects

-- ── proposals SELECT ──────────────────────────────────────────
-- Restore direct EXISTS subquery (no longer causes recursion because
-- projects_select_public now uses user_has_proposal SECURITY DEFINER)
DROP POLICY IF EXISTS "proposals_select" ON proposals;
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

-- ── proposals INSERT ──────────────────────────────────────────
-- empresa_prestadora executes projects too → must be allowed to propose
DROP POLICY IF EXISTS "proposals_insert_professional" ON proposals;
CREATE POLICY "proposals_insert_professional"
  ON proposals FOR INSERT
  WITH CHECK (
    professional_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_type IN ('profissional', 'empresa_prestadora', 'admin')
    )
  );

-- ── proposals UPDATE ──────────────────────────────────────────
DROP POLICY IF EXISTS "proposals_update" ON proposals;
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

-- ── projects INSERT ───────────────────────────────────────────
-- empresa_prestadora and fornecedor_empresa also create projects
DROP POLICY IF EXISTS "projects_insert_empresa" ON projects;
CREATE POLICY "projects_insert_empresa"
  ON projects FOR INSERT
  WITH CHECK (
    client_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_type IN ('empresa', 'empresa_prestadora', 'fornecedor_empresa', 'admin')
    )
  );

-- ── projects UPDATE ───────────────────────────────────────────
-- empresa_prestadora should be able to update their own projects
DROP POLICY IF EXISTS "projects_update_own" ON projects;
CREATE POLICY "projects_update_own"
  ON projects FOR UPDATE
  USING (client_id = auth.uid() OR is_admin());
