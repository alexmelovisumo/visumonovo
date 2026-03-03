-- ============================================================
-- VISUMO 2026 — Migration 010: Planos simplificados (5 tipos)
-- Alinha com o bolt.new: 1 plano por tipo de usuário, só anual.
-- Rodar no: Supabase Dashboard → SQL Editor
-- ============================================================

-- ─── Novos valores no ENUM user_type ─────────────────────────
-- PostgreSQL permite adicionar valores a ENUM existente
ALTER TYPE user_type ADD VALUE IF NOT EXISTS 'fornecedor_empresa';
ALTER TYPE user_type ADD VALUE IF NOT EXISTS 'empresa_prestadora';

-- ─── Desativa planos antigos multi-tier ──────────────────────
UPDATE subscription_plans SET is_active = FALSE
WHERE name IN (
  'empresa_basico', 'empresa_profissional', 'empresa_premium', 'empresa_enterprise',
  'empresa_free',
  'profissional_basico', 'profissional_premium', 'profissional_free',
  'fornecedor_basico', 'fornecedor_premium', 'fornecedor_free'
);

-- ─── Insere 5 novos planos simplificados ─────────────────────
-- (use ON CONFLICT para ser idempotente caso rode 2x)

INSERT INTO subscription_plans (
  name, display_name, description,
  price_monthly, price_yearly,
  features, user_type,
  max_active_projects, max_proposals_per_month,
  is_active, display_order,
  payment_link_yearly
) VALUES
  (
    'plano_profissional',
    'Profissional',
    'Para prestadores de serviços de comunicação visual',
    0, 100,
    ARRAY[
      'Acesse projetos na sua região',
      'Envie propostas ilimitadas',
      'Perfil com portfólio',
      'Chat com clientes',
      'Destaque nos resultados'
    ],
    'profissional', NULL, NULL, TRUE, 1,
    'https://pag.ae/81e2jo8zp'
  ),
  (
    'plano_fornecedor',
    'Fornecedor',
    'Para fornecedores de materiais e insumos',
    0, 300,
    ARRAY[
      'Catálogo de produtos online',
      'Visibilidade para profissionais',
      'Contato direto com compradores',
      'Destaque na busca',
      'Relatórios de visualizações'
    ],
    'fornecedor', NULL, NULL, TRUE, 2,
    'https://pag.ae/81e2kzC4u'
  ),
  (
    'plano_empresa',
    'Empresa',
    'Para empresas que precisam de serviços de comunicação visual',
    0, 350,
    ARRAY[
      'Publique projetos ilimitados',
      'Receba propostas de profissionais',
      'Chat completo com prestadores',
      'Gerenciamento de negociações',
      'Suporte prioritário'
    ],
    'empresa', NULL, NULL, TRUE, 3,
    'https://pag.ae/81e2mf-xQ'
  ),
  (
    'plano_fornecedor_empresa',
    'Fornecedor/Empresa',
    'Para quem fornece materiais E também contrata serviços',
    0, 400,
    ARRAY[
      'Catálogo de produtos online',
      'Publique projetos ilimitados',
      'Acesso a profissionais e fornecedores',
      'Chat com todos os perfis',
      'Painel duplo: empresa + fornecedor'
    ],
    'fornecedor_empresa', NULL, NULL, TRUE, 4,
    'https://pag.ae/81muPiBHP'
  ),
  (
    'plano_empresa_prestadora',
    'Empresa Prestadora',
    'Para empresas que prestam e também contratam serviços',
    0, 450,
    ARRAY[
      'Publique e receba projetos',
      'Envie e receba propostas',
      'Perfil completo como empresa e profissional',
      'Chat ilimitado',
      'Máxima visibilidade na plataforma'
    ],
    'empresa_prestadora', NULL, NULL, TRUE, 5,
    'https://pag.ae/81e2noxuu'
  )
ON CONFLICT (name) DO UPDATE SET
  display_name        = EXCLUDED.display_name,
  description         = EXCLUDED.description,
  price_yearly        = EXCLUDED.price_yearly,
  features            = EXCLUDED.features,
  user_type           = EXCLUDED.user_type,
  is_active           = TRUE,
  display_order       = EXCLUDED.display_order,
  payment_link_yearly = EXCLUDED.payment_link_yearly;
