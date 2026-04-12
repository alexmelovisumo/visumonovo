-- Migration 043: add certifications and equipment to profiles
-- Used by: profissional, empresa_prestadora

CREATE TABLE IF NOT EXISTS profile_certifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  issuer      TEXT,
  issued_at   DATE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profile_equipment (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_certifications_profile ON profile_certifications(profile_id);
CREATE INDEX IF NOT EXISTS idx_equipment_profile ON profile_equipment(profile_id);

-- RLS
ALTER TABLE profile_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_equipment ENABLE ROW LEVEL SECURITY;

-- Anyone can read (for public profiles)
CREATE POLICY "certifications_select" ON profile_certifications
  FOR SELECT USING (true);

CREATE POLICY "equipment_select" ON profile_equipment
  FOR SELECT USING (true);

-- Only owner can insert/update/delete
CREATE POLICY "certifications_insert" ON profile_certifications
  FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());

CREATE POLICY "certifications_delete" ON profile_certifications
  FOR DELETE TO authenticated USING (profile_id = auth.uid());

CREATE POLICY "equipment_insert" ON profile_equipment
  FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());

CREATE POLICY "equipment_delete" ON profile_equipment
  FOR DELETE TO authenticated USING (profile_id = auth.uid());
