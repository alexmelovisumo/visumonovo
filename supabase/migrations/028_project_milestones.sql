-- ─── Migration 028: Marcos de Progresso ─────────────────────
--
-- Adiciona tabela project_milestones para acompanhar etapas
-- de projetos em andamento.

CREATE TABLE IF NOT EXISTS project_milestones (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  is_done    BOOLEAN NOT NULL DEFAULT FALSE,
  position   INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_milestones_project
  ON project_milestones(project_id, position);

ALTER TABLE project_milestones ENABLE ROW LEVEL SECURITY;

-- Qualquer autenticado participante do projeto pode ver
CREATE POLICY "milestones_select"
  ON project_milestones FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE id = project_milestones.project_id
      AND (
        client_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM proposals
          WHERE project_id = project_milestones.project_id
          AND professional_id = auth.uid()
          AND status = 'accepted'
        )
      )
    )
  );

-- Apenas o dono (empresa) insere e deleta marcos
CREATE POLICY "milestones_insert"
  ON project_milestones FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE id = project_milestones.project_id
      AND client_id = auth.uid()
    )
  );

CREATE POLICY "milestones_delete"
  ON project_milestones FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE id = project_milestones.project_id
      AND client_id = auth.uid()
    )
  );

-- Qualquer participante pode marcar como feito
CREATE POLICY "milestones_update"
  ON project_milestones FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE id = project_milestones.project_id
      AND (
        client_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM proposals
          WHERE project_id = project_milestones.project_id
          AND professional_id = auth.uid()
          AND status = 'accepted'
        )
      )
    )
  )
  WITH CHECK (true);
