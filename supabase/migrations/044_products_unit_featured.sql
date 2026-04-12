-- Migration 044: add unit and is_featured to products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS unit       TEXT,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured) WHERE is_featured = TRUE;
