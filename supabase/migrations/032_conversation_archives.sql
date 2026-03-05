-- ─── Migration 032: Arquivamento de Conversas ────────────────
--
-- Permite que cada participante arquive uma conversa
-- individualmente, sem afetar a visão do outro participante.

CREATE TABLE IF NOT EXISTS conversation_archives (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id)      ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

ALTER TABLE conversation_archives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conv_archives_select"
  ON conversation_archives FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "conv_archives_insert"
  ON conversation_archives FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversations
      WHERE id = conversation_archives.conversation_id
        AND (participant_one_id = auth.uid() OR participant_two_id = auth.uid())
    )
  );

CREATE POLICY "conv_archives_delete"
  ON conversation_archives FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
