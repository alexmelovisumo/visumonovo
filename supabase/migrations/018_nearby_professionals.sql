-- ─── Migration 018: get_nearby_professionals function ─────────
--
-- Retorna profissionais e empresa_prestadora que configuraram
-- sua localização (latitude/longitude) dentro de um raio.

CREATE OR REPLACE FUNCTION get_nearby_professionals(
  user_lat  DOUBLE PRECISION,
  user_lng  DOUBLE PRECISION,
  radius_km INTEGER DEFAULT 100
)
RETURNS TABLE (
  id                 UUID,
  full_name          TEXT,
  avatar_url         TEXT,
  bio                TEXT,
  city               TEXT,
  state              VARCHAR(10),
  coverage_radius_km INTEGER,
  user_type          TEXT,
  latitude           DOUBLE PRECISION,
  longitude          DOUBLE PRECISION,
  distance_km        DOUBLE PRECISION
)
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.avatar_url,
    p.bio,
    p.city,
    p.state,
    p.coverage_radius_km,
    p.user_type::TEXT,
    p.latitude,
    p.longitude,
    calculate_distance(user_lat, user_lng, p.latitude, p.longitude) AS distance_km
  FROM profiles p
  WHERE
    p.user_type IN ('profissional'::user_type, 'empresa_prestadora'::user_type)
    AND p.latitude IS NOT NULL
    AND p.longitude IS NOT NULL
    AND calculate_distance(user_lat, user_lng, p.latitude, p.longitude) <= radius_km
  ORDER BY distance_km ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_nearby_professionals TO authenticated;
