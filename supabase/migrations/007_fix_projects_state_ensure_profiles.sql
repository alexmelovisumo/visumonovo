-- ============================================================
-- VISUMO 2026 — Migration 007: Fix projects.state + ensure profiles
-- ============================================================

-- 1. Corrigir projects.state (mesmo problema do profiles.state)
ALTER TABLE projects
  ALTER COLUMN state TYPE VARCHAR(10);

-- 2. Garantir que todo usuário auth tenha um perfil correspondente
--    (para usuários criados antes da trigger funcionar corretamente)
INSERT INTO profiles (id, email, user_type, created_at, updated_at)
SELECT
  au.id,
  au.email,
  COALESCE(
    NULLIF(au.raw_user_meta_data->>'user_type', '')::user_type,
    'empresa'
  ),
  au.created_at,
  NOW()
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 3. Atualizar perfis que existem mas estão sem dados do metadata
UPDATE profiles p
SET
  full_name    = COALESCE(p.full_name,    NULLIF(au.raw_user_meta_data->>'full_name', '')),
  phone        = COALESCE(p.phone,        NULLIF(au.raw_user_meta_data->>'phone', '')),
  city         = COALESCE(p.city,         NULLIF(au.raw_user_meta_data->>'city', '')),
  state        = COALESCE(p.state,        NULLIF(au.raw_user_meta_data->>'state', '')),
  company_name = COALESCE(p.company_name, NULLIF(au.raw_user_meta_data->>'company_name', ''))
FROM auth.users au
WHERE p.id = au.id
  AND au.raw_user_meta_data IS NOT NULL
  AND (
    p.full_name IS NULL
    OR p.phone IS NULL
    OR p.city IS NULL
  );
