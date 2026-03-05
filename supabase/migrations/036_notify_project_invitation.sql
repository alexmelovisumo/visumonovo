-- ─── Migration 036: Notificação de convite de projeto ────────────────────────
--
-- Quando uma empresa convida um profissional para um projeto
-- (INSERT em project_invitations), o profissional recebe uma notificação.

CREATE OR REPLACE FUNCTION trg_notify_convite_projeto()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proj_title  TEXT;
  v_sender_name TEXT;
BEGIN
  -- Título do projeto
  SELECT title
    INTO v_proj_title
  FROM projects
  WHERE id = NEW.project_id;

  -- Nome de quem enviou o convite
  SELECT COALESCE(full_name, company_name, email)
    INTO v_sender_name
  FROM profiles
  WHERE id = NEW.sender_id;

  PERFORM insert_notification(
    NEW.recipient_id,
    'convite_projeto',
    'Você foi convidado!',
    COALESCE(v_sender_name, 'Uma empresa') || ' convidou você para o projeto "' || COALESCE(v_proj_title, 'sem título') || '".',
    '/dashboard/negociacoes'
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_convite_projeto
  AFTER INSERT ON project_invitations
  FOR EACH ROW
  EXECUTE FUNCTION trg_notify_convite_projeto();
