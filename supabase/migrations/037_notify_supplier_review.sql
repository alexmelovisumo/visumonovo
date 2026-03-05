-- ─── Migration 037: Notificação de avaliação de fornecedor ──────────────────
--
-- Quando um cliente avalia um fornecedor via supplier_reviews,
-- o fornecedor recebe uma notificação in-app do tipo 'nova_avaliacao'.

CREATE OR REPLACE FUNCTION trg_notify_nova_avaliacao_fornecedor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reviewer_name TEXT;
BEGIN
  SELECT COALESCE(full_name, company_name, email)
    INTO v_reviewer_name
  FROM profiles
  WHERE id = NEW.requester_id;

  PERFORM insert_notification(
    NEW.supplier_id,
    'nova_avaliacao',
    'Você recebeu uma avaliação',
    COALESCE(v_reviewer_name, 'Um cliente') || ' te avaliou com ' || NEW.rating
      || ' estrela' || CASE WHEN NEW.rating = 1 THEN '' ELSE 's' END || '.',
    '/dashboard/perfil'
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_nova_avaliacao_fornecedor
  AFTER INSERT ON supplier_reviews
  FOR EACH ROW
  EXECUTE FUNCTION trg_notify_nova_avaliacao_fornecedor();
