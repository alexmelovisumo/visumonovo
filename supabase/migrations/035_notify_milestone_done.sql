-- ─── Migration 035: Notificação de marco concluído ───────────────
--
-- Quando um profissional/participante marca um marco como concluído
-- (is_done: false → true), o cliente do projeto recebe uma notificação.

CREATE OR REPLACE FUNCTION trg_notify_marco_concluido()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id  UUID;
  v_proj_title TEXT;
  v_actor_name TEXT;
BEGIN
  -- Só dispara quando is_done muda de false para true
  IF OLD.is_done = TRUE OR NEW.is_done = FALSE THEN
    RETURN NEW;
  END IF;

  -- Busca cliente e título do projeto
  SELECT client_id, title
    INTO v_client_id, v_proj_title
  FROM projects
  WHERE id = NEW.project_id;

  -- Nome de quem está marcando (session user)
  SELECT COALESCE(full_name, company_name, email)
    INTO v_actor_name
  FROM profiles
  WHERE id = auth.uid();

  PERFORM insert_notification(
    v_client_id,
    'marco_concluido',
    'Marco concluído!',
    COALESCE(v_actor_name, 'O profissional') || ' concluiu "' || NEW.title || '"'
      || ' no projeto "' || COALESCE(v_proj_title, 'sem título') || '".',
    '/dashboard/projeto/' || NEW.project_id::TEXT
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_marco_concluido
  AFTER UPDATE ON project_milestones
  FOR EACH ROW
  EXECUTE FUNCTION trg_notify_marco_concluido();
