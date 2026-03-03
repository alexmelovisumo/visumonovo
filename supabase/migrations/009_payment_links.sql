-- ============================================================
-- VISUMO 2026 — Migration 009: Links de pagamento PagBank
-- APENAS planos anuais (payment_link_yearly)
-- ============================================================

-- ─── PROFISSIONAL ─────────────────────────────────────────────
UPDATE subscription_plans
SET payment_link_yearly = 'https://pag.ae/81e2jo8zp'
WHERE name IN ('profissional_basico', 'profissional_premium')
  AND price_monthly > 0;

-- ─── EMPRESA ──────────────────────────────────────────────────
-- Planos de entrada/intermediário
UPDATE subscription_plans
SET payment_link_yearly = 'https://pag.ae/81e2mf-xQ'
WHERE name IN ('empresa_basico', 'empresa_profissional')
  AND price_monthly > 0;

-- Planos premium/enterprise (Empresa Prestadora)
UPDATE subscription_plans
SET payment_link_yearly = 'https://pag.ae/81e2noxuu'
WHERE name IN ('empresa_premium', 'empresa_enterprise')
  AND price_monthly > 0;

-- ─── FORNECEDOR ───────────────────────────────────────────────
-- Fornecedor básico
UPDATE subscription_plans
SET payment_link_yearly = 'https://pag.ae/81e2kzC4u'
WHERE name = 'fornecedor_basico';

-- Fornecedor Empresa (premium)
UPDATE subscription_plans
SET payment_link_yearly = 'https://pag.ae/81muPiBHP'
WHERE name = 'fornecedor_premium';
