-- Migration 045: Landing FAQ editável pelo admin
CREATE TABLE landing_faq (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT    NOT NULL,
  answer   TEXT    NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE landing_faq ENABLE ROW LEVEL SECURITY;

CREATE POLICY "faq_public_read" ON landing_faq
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "faq_admin_all" ON landing_faq
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'admin')
  );

INSERT INTO landing_faq (question, answer, position) VALUES
  ('O Visumo é gratuito?',
   'O Visumo funciona por assinatura anual. Você escolhe o plano ideal para o seu perfil (profissional, empresa ou fornecedor) e durante o ano todo pode fazer quantas negociações quiser sem custo adicional.',
   1),
  ('Como funciona para profissionais de comunicação visual?',
   'Você cria seu perfil, adiciona suas especialidades e portfólio, e passa a receber oportunidades de projetos na sua região. Envie propostas, negocie diretamente com a empresa e construa sua reputação com avaliações reais.',
   2),
  ('Uma empresa pode publicar projetos e receber propostas?',
   'Sim! Empresas publicam projetos descrevendo o serviço, orçamento e prazo. Profissionais qualificados da região enviam propostas, e você escolhe a melhor via chat direto na plataforma.',
   3),
  ('Fornecedores também podem usar o Visumo?',
   'Sim. Fornecedores criam um catálogo de produtos e materiais visível para profissionais e empresas de todo o Brasil. Compradores entram em contato diretamente pelo sistema de cotações.',
   4),
  ('Os pagamentos são seguros?',
   'As assinaturas são processadas pelo PagBank, um dos maiores meios de pagamento do Brasil, com total segurança. As negociações entre empresa e profissional são gerenciadas diretamente entre as partes.',
   5),
  ('Posso cancelar meu plano?',
   'Os planos são anuais. Você pode cancelar a renovação automática a qualquer momento pelo painel de assinatura, mantendo acesso até o fim do período pago.',
   6);
