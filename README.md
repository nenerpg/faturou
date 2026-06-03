# 📱 Sorte Certa — iPhone 17 Pr

> Promoção Comercial com Distribuição Gratuita de Prêmios  
> Autorizada pela **SPA/ME** — Lei Federal nº 5.768/71

---

## 🚀 Sobre o Projeto

Site de promoção comercial onde o cliente **compra um ebook digital** e recebe automaticamente **números da sorte** para concorrer a um **iPhone 16 Pro Max 256GB**.

O sorteio é realizado com base nos resultados públicos da **Loteria Federal da Caixa Econômica Federal**, garantindo transparência total.

---

## 📁 Estrutura

```
RIFAS/
├── server/              # API Node.js + MongoDB
│   ├── models/          # Campanha, Participante, NumeroUsado, etc.
│   ├── routes/          # api, campanhas, pedidos, webhooks/cash
│   ├── services/        # cashApi, fulfillPedido, email
│   └── seedCampanhas.js # campanha iPhone ativa no 1º start
├── site/
│   ├── index.html       # Redireciona para iPhone 17 Pro
│   ├── campanha.html    # Página da campanha (?slug=iphone-17-pro)
│   ├── checkout.html    # Pedido + PIX (Cash API)
│   ├── admin.html       # Painel administrativo
│   ├── js/              # public.js, campanha-page.js
│   ├── style.css        # CSS legado (não usado pelo index atual)
│   └── app.js           # JS legado (checkout antigo)
├── package.json
└── .env
```

### Fluxo do visitante (PIX + Cash API)

1. **Campanha** — escolhe pacote
2. **Checkout** — `POST /api/pedidos` → QR Code PIX (Cash API)
3. Cliente paga → webhook `POST /api/webhooks/cash` com `status: paid`
4. API confirma depósito, gera números, grava participante e envia e-mail (Resend)

---

## Cash API (Animus Pay)

| Endpoint interno | Função |
|------------------|--------|
| `POST /api/pedidos` | Cria pedido + PIX (`externalId` = `orderId`) |
| `POST /api/webhooks/cash` | Recebe postback da Cash (`postbackUrl`) |
| `GET /api/pedidos/:orderId` | Status do pedido (polling no checkout) |

Configure no `.env`: `CASH_API_TOKEN`, `CASH_POSTBACK_URL`, `RESEND_API_KEY`, `ALLOW_PUBLIC_PARTICIPAR=false`.

---

## Deploy gratuito (nuvem)

| Serviço | Uso |
|---------|-----|
| **MongoDB Atlas** M0 | Banco `rifas` |
| **Render** | API Node (`npm start`, env vars do `.env.example`) |
| **Vercel** | Site estático em `site/` — defina `API_URL` apontando para o Render |

Webhook na Cash: `https://sua-api.onrender.com/api/webhooks/cash`

---

## 🗄️ MongoDB (local)

### Pré-requisitos

- [MongoDB Community](https://www.mongodb.com/try/download/community) instalado
- Serviço **MongoDB** em execução no Windows (Services → MongoDB → Running)
- [Node.js](https://nodejs.org/) 18+

### Rodar o projeto

```bash
# Na pasta RIFAS
npm install
npm start
```

Abra no navegador:

- Site: http://localhost:3000
- Admin: http://localhost:3000/admin.html

O painel admin grava participantes, números usados, configurações e apurações no banco **`rifas`** (coleções criadas automaticamente).

### Variáveis de ambiente

Copie `.env.example` para `.env` se ainda não existir:

```
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/rifas
```

Se o MongoDB usar outra porta ou autenticação, ajuste `MONGODB_URI`.

---

## ⚙️ Como funciona o Número da Sorte

Formato: `SÉRIE.ELEMENTO` — ex: `9.57102`

| Componente | Tamanho | Origem |
|------------|---------|--------|
| Série      | 1 dígito (0–9) | Dezena do 1º prêmio da Loteria Federal |
| Elemento   | 5 dígitos | Unidades dos 5 prêmios (top→baixo) |

### Exemplo de apuração

| Prêmio | Número   | Uso |
|--------|----------|-----|
| 1º     | 1**2**59**5** | Dezena=**9** (série) + Unidade=**5** |
| 2º     | 2444**7** | Unidade=**7** |
| 3º     | 9410**1** | Unidade=**1** |
| 4º     | 3211**0** | Unidade=**0** |
| 5º     | 2036**2** | Unidade=**2** |

**Número vencedor: `9.57102`**

---

## 📦 Pacotes

| Tag     | Números Base | Preço    |
|---------|-------------|----------|
| Popular | 5           | R$ 19,90 |
| Prata   | 12          | R$ 39,90 |
| Ouro    | 20          | R$ 59,90 |
| Elite   | 50          | R$ 99,90 |

### Multiplicadores

| Tipo              | Fator | Condição |
|-------------------|-------|----------|
| TURBO             | 2×    | PIX/Cartão + Pacote Elite |
| Lançamento (1–10d)| 3×    | Primeiros 10 dias |
| App               | 3×    | Compra pelo app oficial |
| Prime             | 6×    | Assinante Prime ativo |

> **Hierarquia:** TURBO > Lançamento > App/Assinante (não cumulativos entre si)

---

## 🛠️ Próximos Passos (Backend)

- [x] Node.js API + MongoDB para participantes e números únicos
- [x] Cash API PIX + webhook
- [x] E-mail com números (Resend)
- [ ] Área do cliente "Minha Conta"
- [ ] Painel admin com algoritmo de apuração
- [ ] Exportação CSV no formato SCPC/SPA
- [ ] Integração com API da Loteria Federal (loterias.caixa.gov.br)

---

## 📋 Legal

- Modalidade: Promoção Comercial com Distribuição Gratuita de Prêmios
- Regulamentação: Lei Federal nº 5.768/71
- Órgão: SPA — Secretaria de Prêmios e Apostas / Ministério da Fazenda
- Prazo de reclamação do prêmio: 180 dias após divulgação

---

## 📄 Licença

Projeto privado. Todos os direitos reservados.
