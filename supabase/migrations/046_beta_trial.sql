-- Migration 046: Beta trial coupons
-- Cupons de 100% por 3 meses para campanha de lançamento

INSERT INTO coupons (code, type, value, is_active, max_uses, valid_until, description)
VALUES
  ('BETAEMPRESA',   'percentage', 100, true, 500, NOW() + INTERVAL '90 days', 'Beta gratuito 3 meses — Empresas'),
  ('BETAPRO',       'percentage', 100, true, 500, NOW() + INTERVAL '90 days', 'Beta gratuito 3 meses — Profissionais'),
  ('BETAPRESTADORA','percentage', 100, true, 200, NOW() + INTERVAL '90 days', 'Beta gratuito 3 meses — Empresa Prestadora');
