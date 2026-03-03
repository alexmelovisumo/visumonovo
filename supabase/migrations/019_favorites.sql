-- ─── Migration 019: Favorites ─────────────────────────────────
--
-- Permite que usuários salvem profissionais e projetos favoritos.

CREATE TABLE favorites (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('professional', 'project')),
  entity_id   UUID NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, entity_type, entity_id)
);

CREATE INDEX idx_favorites_user      ON favorites(user_id);
CREATE INDEX idx_favorites_entity    ON favorites(entity_type, entity_id);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Cada usuário só vê e gerencia seus próprios favoritos
CREATE POLICY "favorites_own"
  ON favorites FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
