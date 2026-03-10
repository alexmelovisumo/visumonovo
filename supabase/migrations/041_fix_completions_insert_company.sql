-- ============================================================
-- VISUMO 2026 — Migration 041: Fix project_completions INSERT policy
-- ============================================================
-- CompleteProjectModal is called by the empresa (client), not the
-- professional. The old policy only allowed professional_id = auth.uid(),
-- so empresa inserts were blocked.
-- Fix: allow company_id = auth.uid() (client who owns the project).
-- ============================================================

DROP POLICY IF EXISTS "completions_insert_professional" ON project_completions;

CREATE POLICY "completions_insert_company"
  ON project_completions FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_completions.project_id
      AND projects.client_id = auth.uid()
    )
  );
