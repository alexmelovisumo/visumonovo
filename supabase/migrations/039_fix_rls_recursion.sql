-- ============================================================
-- VISUMO 2026 — Migration 039: Fix circular RLS recursion
-- ============================================================
-- projects_select_public → queries proposals (with RLS)
-- proposals_select       → queries projects (with RLS)
-- → infinite recursion on INSERT + SELECT
--
-- Fix: replace direct table queries with SECURITY DEFINER
-- helper functions that bypass RLS, breaking the cycle.

-- Helper: current user has a proposal in the given project
CREATE OR REPLACE FUNCTION user_has_proposal(p_project_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM proposals
    WHERE project_id = p_project_id
      AND professional_id = auth.uid()
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: given project belongs to the current user
CREATE OR REPLACE FUNCTION project_owned_by(p_project_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects
    WHERE id = p_project_id
      AND client_id = auth.uid()
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── Rebuild projects SELECT policy (uses helper, no direct proposals query) ──
DROP POLICY IF EXISTS "projects_select_public" ON projects;
CREATE POLICY "projects_select_public"
  ON projects FOR SELECT
  USING (
    status = 'open'
    OR client_id = auth.uid()
    OR is_admin()
    OR user_has_proposal(id)
  );

-- ── Rebuild proposals SELECT policy (uses helper, no direct projects query) ──
DROP POLICY IF EXISTS "proposals_select" ON proposals;
CREATE POLICY "proposals_select"
  ON proposals FOR SELECT
  USING (
    professional_id = auth.uid()
    OR project_owned_by(project_id)
    OR is_admin()
  );

-- ── Rebuild proposals UPDATE policy (same circular issue) ──────────────────
DROP POLICY IF EXISTS "proposals_update" ON proposals;
CREATE POLICY "proposals_update"
  ON proposals FOR UPDATE
  USING (
    professional_id = auth.uid()
    OR project_owned_by(project_id)
    OR is_admin()
  );
