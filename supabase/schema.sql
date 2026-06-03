-- ============================================================
-- Sorte Real — Schema Supabase (PostgreSQL)
-- Rodar em: Supabase → SQL Editor → New query → Run
-- ============================================================

-- Campanhas
CREATE TABLE IF NOT EXISTS campanhas (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  TEXT UNIQUE NOT NULL,
  titulo                TEXT,
  subtitulo             TEXT,
  descricao             TEXT,
  premio_nome           TEXT,
  premio_imagem         TEXT,
  hero_desktop          TEXT,
  hero_mobile           TEXT,
  status                TEXT DEFAULT 'ativa' CHECK (status IN ('ativa','encerrada','rascunho')),
  destaque              BOOLEAN DEFAULT false,
  ordem                 INT DEFAULT 0,
  valor_premio_estimado NUMERIC,
  data_inicio           TEXT,
  data_fim              TEXT,
  data_extracao         TEXT,
  total_series          INT DEFAULT 10,
  elementos_por_serie   INT DEFAULT 100000,
  serie_inicial         INT DEFAULT 0,
  numeros_vendidos      INT DEFAULT 0,
  total_numeros_display INT DEFAULT 1000,
  pacotes               JSONB DEFAULT '[]'::JSONB,
  chave_pix             TEXT,
  whatsapp              TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Participantes
CREATE TABLE IF NOT EXISTS participantes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campanha_id         UUID REFERENCES campanhas(id),
  campanha_slug       TEXT,
  pedido_id           TEXT,
  cash_deposit_id     TEXT UNIQUE,
  nome                TEXT NOT NULL,
  cpf                 TEXT NOT NULL,
  email               TEXT,
  tel                 TEXT,
  pacote              TEXT,
  nome_pacote         TEXT,
  pagamento           TEXT,
  valor_pago          NUMERIC,
  multiplicador_tipo  TEXT,
  multiplicador_fator NUMERIC,
  multiplicador_bonus NUMERIC,
  numeros_gerados     TEXT[] DEFAULT '{}',
  status_pagamento    TEXT DEFAULT 'pendente',
  elegivel            BOOLEAN DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS participantes_campanha_cpf_idx
  ON participantes(campanha_id, cpf);

-- Pedidos
CREATE TABLE IF NOT EXISTS pedidos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         TEXT UNIQUE NOT NULL,
  campanha_id      UUID REFERENCES campanhas(id),
  campanha_slug    TEXT,
  pacote_id        TEXT,
  nome_pacote      TEXT,
  nome             TEXT NOT NULL,
  cpf              TEXT NOT NULL,
  email            TEXT NOT NULL,
  tel              TEXT,
  amount_centavos  INT NOT NULL,
  status           TEXT DEFAULT 'aguardando_pix',
  cash_deposit_id  TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Números usados (controle de unicidade por campanha)
CREATE TABLE IF NOT EXISTS numeros_usados (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campanha_id UUID REFERENCES campanhas(id),
  numero      TEXT NOT NULL,
  UNIQUE(campanha_id, numero)
);

-- Apurações
CREATE TABLE IF NOT EXISTS apuracoes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campanha_id    UUID,
  campanha_slug  TEXT,
  tipo           TEXT,
  numero         TEXT,
  premios        TEXT[],
  data_apuracao  TIMESTAMPTZ,
  log            TEXT[],
  ganhador_nome  TEXT,
  ganhador_email TEXT,
  ganhador_cpf   TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Configs (configuração global da campanha)
CREATE TABLE IF NOT EXISTS configs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key                 TEXT UNIQUE DEFAULT 'campanha',
  nome                TEXT,
  total_series        INT,
  elementos_por_serie INT,
  serie_inicial       INT,
  data_inicio         TEXT,
  data_fim            TEXT,
  data_extracao       TEXT,
  data_apuracao       TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
