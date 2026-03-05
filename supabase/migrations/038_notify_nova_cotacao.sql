-- ─── Migration 038: Notificação de nova cotação recebida ──────────────────────
--
-- Quando um cliente/profissional envia uma cotação para um fornecedor,
-- o fornecedor recebe uma notificação in-app do tipo 'nova_cotacao'.

CREATE OR REPLACE FUNCTION trg_notify_nova_cotacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requester_name TEXT;
BEGIN
  SELECT COALESCE(company_name, full_name, email)
    INTO v_requester_name
  FROM profiles
  WHERE id = NEW.requester_id;

  PERFORM insert_notification(
    NEW.supplier_id,
    'nova_cotacao',
    'Nova solicitação de cotação',
    COALESCE(v_requester_name, 'Um cliente') || ' solicitou uma cotação'
      || CASE WHEN NEW.product_title IS NOT NULL
              THEN ' para ' || NEW.product_title
              ELSE ''
         END || '.',
    '/dashboard/cotacoes'
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_nova_cotacao
  AFTER INSERT ON quote_requests
  FOR EACH ROW
  EXECUTE FUNCTION trg_notify_nova_cotacao();
