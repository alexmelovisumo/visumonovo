-- ============================================================
-- VISUMO 2026 — Migration 017: Notifications
-- Notificações in-app geradas por triggers do banco
-- ============================================================

-- ─── Tabela ──────────────────────────────────────────────────

CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,   -- 'nova_proposta' | 'proposta_aceita' | 'proposta_recusada' | 'projeto_finalizado' | 'nova_avaliacao'
  title      TEXT NOT NULL,
  body       TEXT,
  link       TEXT,            -- rota frontend, ex: /dashboard/projeto/uuid
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user    ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread  ON notifications(user_id) WHERE is_read = FALSE;

-- ─── RLS ─────────────────────────────────────────────────────

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "notifications_update"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admin pode inserir notificações manualmente
CREATE POLICY "notifications_insert"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Service role insere via triggers (sem restrição RLS)
-- Os triggers rodam como SECURITY DEFINER e usam service role implicitamente

-- ─── Função auxiliar de inserção ─────────────────────────────

CREATE OR REPLACE FUNCTION insert_notification(
  p_user_id UUID,
  p_type    TEXT,
  p_title   TEXT,
  p_body    TEXT,
  p_link    TEXT
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications(user_id, type, title, body, link)
  VALUES (p_user_id, p_type, p_title, p_body, p_link);
END;
$$;

-- ─── Trigger: Nova proposta recebida ─────────────────────────
-- Quando um profissional envia proposta → notifica o dono do projeto

CREATE OR REPLACE FUNCTION trg_notify_nova_proposta()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_title TEXT;
  v_client_id     UUID;
  v_prof_name     TEXT;
BEGIN
  SELECT title, client_id INTO v_project_title, v_client_id
  FROM projects WHERE id = NEW.project_id;

  SELECT COALESCE(full_name, email) INTO v_prof_name
  FROM profiles WHERE id = NEW.professional_id;

  PERFORM insert_notification(
    v_client_id,
    'nova_proposta',
    'Nova proposta recebida',
    v_prof_name || ' enviou uma proposta para "' || v_project_title || '"',
    '/dashboard/projeto/' || NEW.project_id::text
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_nova_proposta
  AFTER INSERT ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION trg_notify_nova_proposta();

-- ─── Trigger: Proposta aceita / recusada ─────────────────────
-- Quando empresa atualiza status da proposta → notifica profissional

CREATE OR REPLACE FUNCTION trg_notify_status_proposta()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_title TEXT;
  v_tipo          TEXT;
  v_titulo        TEXT;
  v_corpo         TEXT;
BEGIN
  -- Só dispara quando status muda para aceita ou recusada
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('accepted', 'rejected') THEN RETURN NEW; END IF;

  SELECT title INTO v_project_title FROM projects WHERE id = NEW.project_id;

  IF NEW.status = 'accepted' THEN
    v_tipo   := 'proposta_aceita';
    v_titulo := 'Proposta aceita!';
    v_corpo  := 'Sua proposta para "' || v_project_title || '" foi aceita. Inicie a conversa agora!';
  ELSE
    v_tipo   := 'proposta_recusada';
    v_titulo := 'Proposta não selecionada';
    v_corpo  := 'Sua proposta para "' || v_project_title || '" não foi selecionada desta vez.';
  END IF;

  PERFORM insert_notification(
    NEW.professional_id,
    v_tipo,
    v_titulo,
    v_corpo,
    '/dashboard/projeto/' || NEW.project_id::text
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_status_proposta
  AFTER UPDATE ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION trg_notify_status_proposta();

-- ─── Trigger: Projeto finalizado ─────────────────────────────
-- Quando empresa conclui projeto → notifica profissional

CREATE OR REPLACE FUNCTION trg_notify_projeto_finalizado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_title TEXT;
BEGIN
  SELECT title INTO v_project_title FROM projects WHERE id = NEW.project_id;

  PERFORM insert_notification(
    NEW.professional_id,
    'projeto_finalizado',
    'Projeto concluído!',
    'O projeto "' || v_project_title || '" foi marcado como concluído.',
    '/dashboard/projeto/' || NEW.project_id::text
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_projeto_finalizado
  AFTER INSERT ON project_completions
  FOR EACH ROW
  EXECUTE FUNCTION trg_notify_projeto_finalizado();

-- ─── Trigger: Nova avaliação recebida ────────────────────────
-- Quando empresa avalia profissional → notifica profissional

CREATE OR REPLACE FUNCTION trg_notify_nova_avaliacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reviewer_name TEXT;
BEGIN
  SELECT COALESCE(full_name, email) INTO v_reviewer_name
  FROM profiles WHERE id = NEW.reviewer_id;

  PERFORM insert_notification(
    NEW.reviewed_id,
    'nova_avaliacao',
    'Você recebeu uma avaliação',
    v_reviewer_name || ' te avaliou com ' || NEW.rating || ' estrela' || CASE WHEN NEW.rating = 1 THEN '' ELSE 's' END || '.',
    '/dashboard/perfil'
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_nova_avaliacao
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION trg_notify_nova_avaliacao();
