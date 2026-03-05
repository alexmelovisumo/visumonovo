-- ─── Migration 027: Motivo de recusa em propostas ───────────────
--
-- Adiciona coluna opcional para o motivo ao recusar uma proposta.

ALTER TABLE proposals ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
