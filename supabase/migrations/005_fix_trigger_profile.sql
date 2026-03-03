-- ============================================================
-- VISUMO 2026 — Migration 005: Trigger com todos os campos do perfil
-- ============================================================
-- Atualiza o trigger handle_new_user para receber todos os campos
-- do perfil via raw_user_meta_data, eliminando a necessidade de
-- um UPDATE separado após o signUp.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (
    id,
    email,
    user_type,
    full_name,
    phone,
    city,
    state,
    company_name
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'user_type')::user_type, 'empresa'),
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'city',
    NEW.raw_user_meta_data->>'state',
    NEW.raw_user_meta_data->>'company_name'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name    = EXCLUDED.full_name,
    phone        = EXCLUDED.phone,
    city         = EXCLUDED.city,
    state        = EXCLUDED.state,
    company_name = EXCLUDED.company_name;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
