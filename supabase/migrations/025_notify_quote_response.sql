-- ─── Migration 025: Notificação de resposta de cotação ─────────
--
-- Quando um fornecedor insere uma resposta em quote_responses,
-- notifica o solicitante da cotação via insert_notification().

CREATE OR REPLACE FUNCTION trg_notify_cotacao_respondida()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requester_id  UUID;
  v_supplier_name TEXT;
  v_product_title TEXT;
BEGIN
  SELECT requester_id, supplier_id, product_title
    INTO v_requester_id, v_supplier_name, v_product_title  -- reuse var for supplier_id temporarily
  FROM quote_requests
  WHERE id = NEW.quote_request_id;

  -- overwrite with actual name
  SELECT COALESCE(company_name, full_name, email)
    INTO v_supplier_name
  FROM profiles
  WHERE id = (
    SELECT supplier_id FROM quote_requests WHERE id = NEW.quote_request_id
  );

  PERFORM insert_notification(
    v_requester_id,
    'cotacao_respondida',
    'Cotação respondida!',
    v_supplier_name || ' respondeu sua cotação'
      || CASE WHEN v_product_title IS NOT NULL
              THEN ' para "' || v_product_title || '"'
              ELSE '' END || '.',
    '/dashboard/cotacoes'
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_cotacao_respondida
  AFTER INSERT ON quote_responses
  FOR EACH ROW
  EXECUTE FUNCTION trg_notify_cotacao_respondida();
