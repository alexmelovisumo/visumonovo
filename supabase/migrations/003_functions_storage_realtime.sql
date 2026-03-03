-- ============================================================
-- VISUMO 2026 — Migration 003: Funções, Storage e Realtime
-- ============================================================

-- ─── FUNÇÃO: Calcular distância (Haversine) ─────────────────

CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 DOUBLE PRECISION,
  lon1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION,
  lon2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION AS $$
DECLARE
  r DOUBLE PRECISION := 6371; -- raio da terra em km
  dlat DOUBLE PRECISION;
  dlon DOUBLE PRECISION;
  a DOUBLE PRECISION;
  c DOUBLE PRECISION;
BEGIN
  dlat := RADIANS(lat2 - lat1);
  dlon := RADIANS(lon2 - lon1);
  a := SIN(dlat/2)^2 + COS(RADIANS(lat1)) * COS(RADIANS(lat2)) * SIN(dlon/2)^2;
  c := 2 * ASIN(SQRT(a));
  RETURN r * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ─── FUNÇÃO: Projetos próximos ao profissional ──────────────

CREATE OR REPLACE FUNCTION get_nearby_projects(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  budget_min DECIMAL,
  budget_max DECIMAL,
  deadline DATE,
  status project_status,
  city TEXT,
  state CHAR(2),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  distance_km DOUBLE PRECISION,
  created_at TIMESTAMPTZ,
  client_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.title,
    p.description,
    p.budget_min,
    p.budget_max,
    p.deadline,
    p.status,
    p.city,
    p.state,
    p.latitude,
    p.longitude,
    calculate_distance(user_lat, user_lng, p.latitude, p.longitude) AS distance_km,
    p.created_at,
    p.client_id
  FROM projects p
  WHERE
    p.status = 'open'
    AND p.latitude IS NOT NULL
    AND p.longitude IS NOT NULL
    AND calculate_distance(user_lat, user_lng, p.latitude, p.longitude) <= radius_km
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ─── FUNÇÃO: Deletar usuário (auth + profile) ───────────────

CREATE OR REPLACE FUNCTION delete_user_and_auth(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Só admin pode executar
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Permissão negada: apenas administradores podem deletar usuários.';
  END IF;

  -- Deleta o usuário do auth (cascade deleta o profile)
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── FUNÇÃO: Validar cupom ───────────────────────────────────

CREATE OR REPLACE FUNCTION validate_coupon(
  coupon_code_input TEXT,
  user_type_input user_type
)
RETURNS TABLE (
  is_valid BOOLEAN,
  error_message TEXT,
  coupon_id UUID,
  coupon_type coupon_type,
  coupon_value DECIMAL
) AS $$
DECLARE
  v_coupon coupons%ROWTYPE;
BEGIN
  -- Busca o cupom
  SELECT * INTO v_coupon
  FROM coupons
  WHERE UPPER(code) = UPPER(coupon_code_input)
  AND is_active = TRUE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Cupom não encontrado ou inativo.', NULL::UUID, NULL::coupon_type, NULL::DECIMAL;
    RETURN;
  END IF;

  -- Verifica validade
  IF v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < NOW() THEN
    RETURN QUERY SELECT FALSE, 'Cupom expirado.', NULL::UUID, NULL::coupon_type, NULL::DECIMAL;
    RETURN;
  END IF;

  -- Verifica uso máximo
  IF v_coupon.max_uses IS NOT NULL AND v_coupon.current_uses >= v_coupon.max_uses THEN
    RETURN QUERY SELECT FALSE, 'Cupom atingiu o limite de usos.', NULL::UUID, NULL::coupon_type, NULL::DECIMAL;
    RETURN;
  END IF;

  -- Verifica tipo de usuário
  IF v_coupon.applicable_user_types IS NOT NULL AND NOT (user_type_input = ANY(v_coupon.applicable_user_types)) THEN
    RETURN QUERY SELECT FALSE, 'Cupom não válido para seu tipo de conta.', NULL::UUID, NULL::coupon_type, NULL::DECIMAL;
    RETURN;
  END IF;

  -- Verifica se usuário já usou
  IF EXISTS (SELECT 1 FROM coupon_usage WHERE coupon_id = v_coupon.id AND user_id = auth.uid()) THEN
    RETURN QUERY SELECT FALSE, 'Você já utilizou este cupom.', NULL::UUID, NULL::coupon_type, NULL::DECIMAL;
    RETURN;
  END IF;

  RETURN QUERY SELECT TRUE, NULL::TEXT, v_coupon.id, v_coupon.type, v_coupon.value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ─── FUNÇÃO: Criar perfil automaticamente no signup ─────────

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, user_type)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      (NEW.raw_user_meta_data->>'user_type')::user_type,
      'empresa'
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── STORAGE BUCKETS ────────────────────────────────────────

-- Criar buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('profile-images',     'profile-images',     TRUE,  2097152,  ARRAY['image/jpeg','image/png','image/webp']),
  ('project-images',     'project-images',     TRUE,  5242880,  ARRAY['image/jpeg','image/png','image/webp']),
  ('product-images',     'product-images',     TRUE,  5242880,  ARRAY['image/jpeg','image/png','image/webp']),
  ('project-attachments','project-attachments', FALSE, 10485760, ARRAY['image/jpeg','image/png','image/webp','application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies: profile-images
CREATE POLICY "profile_images_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-images');

CREATE POLICY "profile_images_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-images'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "profile_images_update_own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'profile-images'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "profile_images_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'profile-images'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- Storage policies: project-images
CREATE POLICY "project_images_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'project-images');

CREATE POLICY "project_images_insert_auth"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'project-images'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "project_images_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'project-images'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- Storage policies: product-images
CREATE POLICY "product_images_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "product_images_insert_auth"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'product-images'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "product_images_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- Storage policies: project-attachments (privado)
CREATE POLICY "attachments_select_participants"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'project-attachments'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "attachments_insert_auth"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'project-attachments'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- ─── REALTIME ────────────────────────────────────────────────

-- Habilitar Realtime nas tabelas de chat
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
