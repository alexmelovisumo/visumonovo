# Como Rodar as Migrations no Supabase

## Passo a passo

1. Acesse: https://supabase.com → seu projeto visumo2026
2. Menu lateral → **SQL Editor**
3. Clique em **+ New query**
4. Cole o conteúdo de cada arquivo **na ordem abaixo** e clique em **Run**

## Ordem de Execução

### 1. `001_tables.sql`
Cria todas as tabelas, índices e triggers.

### 2. `002_rls.sql`
Ativa Row Level Security e cria todas as políticas de segurança.

### 3. `003_functions_storage_realtime.sql`
- Funções SQL (distância, validar cupom, deletar usuário)
- Trigger de auto-criação de perfil no signup
- Storage buckets e políticas
- Habilita Realtime no chat

### 4. `004_seed_data.sql`
Insere os dados iniciais:
- 10 categorias de projeto
- 5 planos para empresa
- 3 planos para profissional
- 3 planos para fornecedor

## Após executar todas as migrations

### Criar o primeiro admin:
```sql
UPDATE profiles
SET user_type = 'admin'
WHERE email = 'seu-email@dominio.com';
```

### Verificar se tudo foi criado:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Deve retornar:
- conversations
- coupon_usage
- coupons
- messages
- products
- profiles
- project_category_assignments
- project_categories
- project_images
- projects
- proposals
- subscription_plans
- user_subscriptions
