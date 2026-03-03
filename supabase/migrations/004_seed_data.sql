-- ============================================================
-- VISUMO 2026 — Migration 004: Dados Iniciais (Seed)
-- ============================================================

-- ─── CATEGORIAS DE PROJETOS ──────────────────────────────────

INSERT INTO project_categories (name, slug, description, icon, display_order) VALUES
  ('Adesivação',          'adesivacao',         'Plotagem e adesivação de veículos, fachadas e superfícies', 'sticker',         1),
  ('Fachadas',            'fachadas',           'Projetos e execução de fachadas comerciais e corporativas', 'building-2',      2),
  ('Sinalização',         'sinalizacao',        'Sinalização interna e externa, placas, totens e mapas',     'map-pin',         3),
  ('Stands e Eventos',    'stands-eventos',     'Montagem de stands, cenários e estruturas para eventos',    'layout-grid',     4),
  ('Banners e Lona',      'banners-lona',       'Impressão e instalação de banners, lonas e backdrops',      'image',           5),
  ('Identidade Visual',   'identidade-visual',  'Criação de marca, logotipo e manual de identidade',         'palette',         6),
  ('Plotagem e Impressão','plotagem-impressao',  'Impressão digital de grande formato e plotagem em geral',  'printer',         7),
  ('Material Promocional','material-promocional','Brindes, camisetas, flyers, catálogos e materiais gráficos','gift',           8),
  ('Neon e LED',          'neon-led',           'Letreiros em neon, painel LED e iluminação especial',       'zap',             9),
  ('Outros',              'outros',             'Outros serviços de comunicação visual',                     'more-horizontal', 10)
ON CONFLICT (slug) DO NOTHING;

-- ─── PLANOS DE ASSINATURA ────────────────────────────────────

-- Planos para EMPRESA
INSERT INTO subscription_plans (
  name, display_name, description, price_monthly, price_yearly,
  features, user_type, max_active_projects, max_proposals_per_month,
  is_active, display_order
) VALUES
  (
    'empresa_free',
    'Gratuito',
    'Para começar e conhecer a plataforma',
    0, NULL,
    ARRAY[
      '1 projeto ativo',
      'Visualização de propostas',
      'Chat básico',
      'Perfil na plataforma'
    ],
    'empresa', 1, NULL, TRUE, 1
  ),
  (
    'empresa_basico',
    'Básico',
    'Para pequenas empresas que precisam de mais projetos',
    297, 2673,
    ARRAY[
      '3 projetos ativos',
      'Propostas ilimitadas',
      'Chat completo',
      'Upload de imagens',
      'Suporte por email'
    ],
    'empresa', 3, NULL, TRUE, 2
  ),
  (
    'empresa_profissional',
    'Profissional',
    'Para empresas em crescimento',
    497, 4473,
    ARRAY[
      '10 projetos ativos',
      'Propostas ilimitadas',
      'Chat completo',
      'Upload ilimitado',
      'Destaque nos projetos',
      'Suporte prioritário'
    ],
    'empresa', 10, NULL, TRUE, 3
  ),
  (
    'empresa_premium',
    'Premium',
    'Para empresas com alta demanda',
    797, 7173,
    ARRAY[
      'Projetos ilimitados',
      'Propostas ilimitadas',
      'Chat completo',
      'Upload ilimitado',
      'Destaque máximo',
      'Relatórios avançados',
      'Suporte VIP'
    ],
    'empresa', NULL, NULL, TRUE, 4
  ),
  (
    'empresa_enterprise',
    'Enterprise',
    'Solução completa para grandes empresas',
    1497, 13473,
    ARRAY[
      'Projetos ilimitados',
      'Multi-usuários (até 5)',
      'API dedicada',
      'Relatórios personalizados',
      'Gerente de conta dedicado',
      'SLA garantido',
      'Onboarding personalizado'
    ],
    'empresa', NULL, NULL, TRUE, 5
  );

-- Planos para PROFISSIONAL
INSERT INTO subscription_plans (
  name, display_name, description, price_monthly, price_yearly,
  features, user_type, max_active_projects, max_proposals_per_month,
  is_active, display_order
) VALUES
  (
    'profissional_free',
    'Gratuito',
    'Para começar a receber projetos',
    0, NULL,
    ARRAY[
      '3 propostas por mês',
      'Perfil básico',
      'Chat básico',
      'Acesso a projetos abertos'
    ],
    'profissional', NULL, 3, TRUE, 1
  ),
  (
    'profissional_basico',
    'Básico',
    'Para profissionais em crescimento',
    197, 1773,
    ARRAY[
      '15 propostas por mês',
      'Perfil completo com portfólio',
      'Chat completo',
      'Filtro de projetos por região',
      'Badge verificado'
    ],
    'profissional', NULL, 15, TRUE, 2
  ),
  (
    'profissional_premium',
    'Premium',
    'Para profissionais que querem se destacar',
    397, 3573,
    ARRAY[
      'Propostas ilimitadas',
      'Perfil em destaque',
      'Aparecer primeiro nas buscas',
      'Chat completo',
      'Análise de propostas',
      'Suporte prioritário'
    ],
    'profissional', NULL, NULL, TRUE, 3
  );

-- Planos para FORNECEDOR
INSERT INTO subscription_plans (
  name, display_name, description, price_monthly, price_yearly,
  features, user_type, max_active_projects, max_proposals_per_month,
  is_active, display_order
) VALUES
  (
    'fornecedor_free',
    'Gratuito',
    'Para cadastrar seus produtos',
    0, NULL,
    ARRAY[
      '5 produtos no catálogo',
      'Perfil básico',
      'Chat com clientes'
    ],
    'fornecedor', NULL, NULL, TRUE, 1
  ),
  (
    'fornecedor_basico',
    'Básico',
    'Para fornecedores que querem crescer',
    247, 2223,
    ARRAY[
      '30 produtos no catálogo',
      'Perfil em destaque',
      'Chat completo',
      'Destaque em buscas'
    ],
    'fornecedor', NULL, NULL, TRUE, 2
  ),
  (
    'fornecedor_premium',
    'Premium',
    'Catálogo ilimitado e máxima visibilidade',
    447, 4023,
    ARRAY[
      'Produtos ilimitados',
      'Máximo destaque',
      'Relatório de visualizações',
      'Suporte prioritário'
    ],
    'fornecedor', NULL, NULL, TRUE, 3
  );
