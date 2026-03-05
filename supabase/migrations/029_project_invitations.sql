-- ─── Migration 029: Convites para Projetos ───────────────────
--
-- Permite que empresas convidem profissionais específicos
-- a enviar proposta para um projeto.

CREATE TABLE IF NOT EXISTS project_invitations (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sender_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message      TEXT,
  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Uma empresa só convida o mesmo profissional uma vez por projeto
  UNIQUE (project_id, recipient_id)
);

CREATE INDEX IF NOT EXISTS idx_invitations_project
  ON project_invitations(project_id);
CREATE INDEX IF NOT EXISTS idx_invitations_recipient
  ON project_invitations(recipient_id, status);
CREATE INDEX IF NOT EXISTS idx_invitations_sender
  ON project_invitations(sender_id);

ALTER TABLE project_invitations ENABLE ROW LEVEL SECURITY;

-- Remetente e destinatário podem ver
CREATE POLICY "invitations_select"
  ON project_invitations FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

-- Apenas o dono do projeto pode enviar convite
CREATE POLICY "invitations_insert"
  ON project_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM projects
      WHERE id = project_invitations.project_id
      AND client_id = auth.uid()
      AND status = 'open'
    )
  );

-- Destinatário pode aceitar/recusar
CREATE POLICY "invitations_update"
  ON project_invitations FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- Remetente pode cancelar
CREATE POLICY "invitations_delete"
  ON project_invitations FOR DELETE
  TO authenticated
  USING (sender_id = auth.uid());
