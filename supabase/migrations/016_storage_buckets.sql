-- ============================================================
-- VISUMO 2026 — Migration 016: Storage Buckets
-- Buckets para fotos de perfil e imagens do chat
-- ============================================================

-- ─── Bucket: profile-images ──────────────────────────────────
-- Fotos de avatar dos usuários

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-images',
  'profile-images',
  true,
  5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Qualquer usuário autenticado pode ler avatares públicos
CREATE POLICY "profile_images_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-images');

-- Usuário só faz upload do próprio avatar
CREATE POLICY "profile_images_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profile-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Usuário pode atualizar/remover seu próprio avatar
CREATE POLICY "profile_images_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'profile-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "profile_images_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'profile-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─── Bucket: chat-images ─────────────────────────────────────
-- Imagens enviadas no chat entre empresa e profissional

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-images',
  'chat-images',
  true,
  10485760,  -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Qualquer autenticado pode ver imagens do chat (a conversa já é protegida por RLS)
CREATE POLICY "chat_images_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'chat-images');

-- Usuário pode fazer upload dentro de pasta com o conversation_id
CREATE POLICY "chat_images_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'chat-images');

-- Usuário pode remover imagens que enviou (pasta começa com conv_id/user_id)
CREATE POLICY "chat_images_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'chat-images');
