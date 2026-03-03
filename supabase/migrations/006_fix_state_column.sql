-- ============================================================
-- VISUMO 2026 — Migration 006: Corrigir coluna state + trigger robusto
-- ============================================================
-- PROBLEMA: CHAR(2) é estrito no PostgreSQL. Quando o trigger
-- tenta inserir o valor vindo de raw_user_meta_data (texto JSON),
-- pode falhar e bloquear toda a criação do usuário.
-- SOLUÇÃO: Mudar para VARCHAR(10) e adicionar tratamento de erros.

-- 1. Alterar tipo da coluna state
ALTER TABLE profiles
  ALTER COLUMN state TYPE VARCHAR(10);

-- 2. Atualizar trigger com tratamento de exceção
--    Se o INSERT do perfil falhar por qualquer motivo,
--    o usuário ainda é criado (sem bloquear o auth).
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
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
      COALESCE(
        NULLIF(NEW.raw_user_meta_data->>'user_type', '')::user_type,
        'empresa'
      ),
      NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
      NULLIF(NEW.raw_user_meta_data->>'phone', ''),
      NULLIF(NEW.raw_user_meta_data->>'city', ''),
      NULLIF(NEW.raw_user_meta_data->>'state', ''),
      NULLIF(NEW.raw_user_meta_data->>'company_name', '')
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name    = EXCLUDED.full_name,
      phone        = EXCLUDED.phone,
      city         = EXCLUDED.city,
      state        = EXCLUDED.state,
      company_name = EXCLUDED.company_name;

  EXCEPTION WHEN OTHERS THEN
    -- Não bloquear a criação do usuário se o perfil falhar
    RAISE WARNING 'handle_new_user: erro ao criar perfil para %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
