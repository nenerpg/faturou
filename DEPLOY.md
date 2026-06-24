# Deploy no Vercel + Supabase — Sorte Real

Deploy simples: `git push` → Vercel builda e publica automaticamente. Banco de dados PostgreSQL gerenciado pelo Supabase (plano gratuito).

---

## Arquitetura

```
Vercel
├── vercel.json           → roteia tudo para api/index.js
├── api/index.js          → Express como serverless function
│     ├── /api/*          → rotas da API (campanhas, pedidos, webhooks)
│     └── /*              → arquivos estáticos de site/
└── Supabase (PostgreSQL) → banco de dados
```

---

## Passo 1 — Criar as tabelas no Supabase

1. Acesse [supabase.com](https://supabase.com) e abra seu projeto
2. Vá em **SQL Editor → New query**
3. Cole o conteúdo do arquivo `supabase/schema.sql` e clique em **Run**

As tabelas criadas são: `campanhas`, `participantes`, `pedidos`, `numeros_usados`, `apuracoes`, `configs`.

---

## Passo 2 — Pegar as credenciais do Supabase

Em **Settings → API**:

- **Project URL** → `SUPABASE_URL` (ex: `https://abcdef.supabase.co`)
- **Service Role Key** (secret) → `SUPABASE_SERVICE_KEY` (já disponível no painel)

---

## Passo 3 — Conectar o repositório ao Vercel

1. Acesse [vercel.com](https://vercel.com) → **Add New Project**
2. Importe o repositório `RIFAS` do GitHub
3. **Framework Preset:** Other (sem framework)
4. Deixe Build Command e Output Directory em branco
5. Clique em **Deploy** (pode falhar na primeira vez sem as variáveis)

---

## Passo 4 — Configurar variáveis de ambiente no Vercel

Em **Vercel → projeto → Settings → Environment Variables**, adicione:

```
SUPABASE_URL=https://SEU_PROJETO.supabase.co
SUPABASE_SERVICE_KEY=sb_secret_...

ALLOW_PUBLIC_PARTICIPAR=false
PUBLIC_API_URL=https://seudominio.com
PUBLIC_SITE_URL=https://seudominio.com

CASH_API_TOKEN=SEU_TOKEN_ANIMUS
CASH_API_BASE_URL=https://api.animuspay.com.br/api/public/cash
CASH_POSTBACK_URL=https://seudominio.com/api/webhooks/cash
ANIMUS_CHECKOUT_BASE_URL=https://checkout.animuspay.com.br/c/SEU_ID

RESEND_API_KEY=SEU_KEY_RESEND
EMAIL_FROM=Sorte Real <noreply@sortereal.org>
EBOOK_URL=https://seudominio.com/ebook.pdf
```

Após salvar, clique em **Redeploy**.

---

## Passo 5 — Adicionar o domínio

Em **Vercel → Settings → Domains** → **Add Domain** → `seudominio.com`.

No registrador do domínio:

| Tipo  | Nome | Valor                |
|-------|------|----------------------|
| A     | @    | 76.76.21.21          |
| CNAME | www  | cname.vercel-dns.com |

SSL (HTTPS) é ativado automaticamente.

---

## Passo 6 — Configurar webhook no Animus Pay

No painel da Animus Pay, registre a URL de postback:
```
https://seudominio.com/api/webhooks/cash
```

---

## Atualizações futuras

```powershell
cd "C:\Users\Jeferson\Documents\RIFAS"
git add .
git commit -m "descrição da mudança"
git push
```

O Vercel faz o redeploy automaticamente em ~30 segundos.

---

## Acessar o banco de dados

### Pelo painel web (Supabase)

Em [supabase.com](https://supabase.com) → seu projeto → **Table Editor**. Navegue pelas tabelas `participantes`, `pedidos`, `campanhas`, etc.

### Pelo SQL Editor (Supabase)

```sql
-- Ver todos os participantes
SELECT * FROM participantes ORDER BY created_at DESC;

-- Pedidos pagos
SELECT * FROM pedidos WHERE status = 'pago';

-- Contar participantes confirmados por campanha
SELECT campanha_slug, COUNT(*) FROM participantes
WHERE status_pagamento = 'confirmado'
GROUP BY campanha_slug;
```

---

## Desenvolvimento local

```powershell
npm run dev
# API em http://localhost:3000
# Banco: Supabase (mesmo projeto, usando as variáveis do .env local)
```

O `.env` local usa as mesmas credenciais do Supabase — não há banco local para configurar.
