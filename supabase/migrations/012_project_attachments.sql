-- ============================================================
-- VISUMO 2026 — Migration 012: Project Attachments
-- Portado do visumofinal (20251116000628 + 20251115233218)
-- ============================================================
-- Anexos de projeto: fotos, arquivos e documentos enviados
-- por empresa ou profissional durante a execução do projeto.
-- ============================================================

CREATE TABLE IF NOT EXISTS project_attachments (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  uploaded_by  UUID NOT NULL REFERENCES profiles(id),
  file_type    TEXT NOT NULL,
  file_url     TEXT NOT NULL,
  file_name    TEXT NOT NULL,
  file_size    BIGINT,
  category     TEXT NOT NULL DEFAULT 'other'
                 CHECK (category IN ('photo', 'document', 'video', 'other')),
  caption      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attachments_project
  ON project_attachments(project_id);

CREATE INDEX IF NOT EXISTS idx_attachments_uploader
  ON project_attachments(uploaded_by);

CREATE INDEX IF NOT EXISTS idx_attachments_category
  ON project_attachments(category);

-- ─── RLS ──────────────────────────────────────────────────────

ALTER TABLE project_attachments ENABLE ROW LEVEL SECURITY;

-- Empresa (dono do projeto) ou profissional com proposta aceita podem ver
CREATE POLICY "attachments_select"
  ON project_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_attachments.project_id
      AND (
        projects.client_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM proposals
          WHERE proposals.project_id = projects.id
          AND proposals.professional_id = auth.uid()
          AND proposals.status = 'accepted'
        )
      )
    )
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Empresa ou profissional com proposta aceita podem fazer upload
CREATE POLICY "attachments_insert"
  ON project_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = uploaded_by
    AND EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_attachments.project_id
      AND (
        projects.client_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM proposals
          WHERE proposals.project_id = projects.id
          AND proposals.professional_id = auth.uid()
          AND proposals.status = 'accepted'
        )
      )
    )
  );

-- Quem fez upload pode deletar
CREATE POLICY "attachments_delete"
  ON project_attachments FOR DELETE
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- ─── Storage bucket ───────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-attachments',
  'project-attachments',
  true,
  10485760,  -- 10 MB
  ARRAY[
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
    'application/pdf',
    'video/mp4', 'video/quicktime'
  ]
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "project_attach_storage_select"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'project-attachments');

CREATE POLICY "project_attach_storage_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'project-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "project_attach_storage_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'project-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
