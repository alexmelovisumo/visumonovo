-- ─── Migration 024: Favorites — add supplier type ──────────────
--
-- Expande o CHECK constraint da tabela favorites para incluir 'supplier'.

ALTER TABLE favorites
  DROP CONSTRAINT IF EXISTS favorites_entity_type_check;

ALTER TABLE favorites
  ADD CONSTRAINT favorites_entity_type_check
  CHECK (entity_type IN ('professional', 'project', 'supplier'));
