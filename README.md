# 📱 RifaTechPro — iPhone 16 Pro Max

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
└── site/
    ├── index.html   # Landing page completa
    ├── style.css    # Estilos (dark mode, responsivo)
    └── app.js       # Lógica: countdown, pacotes, algoritmo de apuração
```

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

- [ ] Node.js / Python API para geração de números únicos por campanha
- [ ] Integração com gateway de pagamento (Mercado Pago / PagSeguro)
- [ ] Envio automático de e-mail com números (Nodemailer / SendGrid)
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
