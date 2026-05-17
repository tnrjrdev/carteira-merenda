# Merenda — Carteira Digital Escolar

Carteira digital (e-wallet) para crianças e adolescentes, focada em **acabar com a fila do recreio** e dar **controle total aos responsáveis** sobre a alimentação na escola. Os pais recarregam por **Pix**, os alunos pagam por **QR Code** e a cantina vende sem dinheiro físico.

- **Backend:** Spring Boot 3.2 + Spring Security (JWT) + JPA + H2 (dev) / Postgres (prod) + Mercado Pago Pix
- **Frontend:** React 18 + Vite + Tailwind CSS + React Router
- **Deploy:** Vercel (frontend) + Render (backend + Postgres)

---

## Sumário

- [Funcionalidades](#funcionalidades)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Como rodar local](#como-rodar-local)
- [Contas de teste](#contas-de-teste)
- [Endpoints REST](#endpoints-rest)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Integração Pix (Mercado Pago)](#integração-pix-mercado-pago)
- [Webhooks (integração ERP)](#webhooks-integração-erp)
- [Deploy](#deploy)
- [Roadmap](#roadmap)
- [Licença](#licença)

---

## Funcionalidades

### Responsável
- Cadastro de dependentes (estudantes)
- Recarga manual e **Recarga Pix via Mercado Pago** com QR Code dinâmico (status atualizado em tempo real)
- Limites diário e semanal de gastos
- **Bloqueio nutricional** por categoria (refrigerantes, frituras, alérgenos…)
- Extrato detalhado com itens de cada compra

### Estudante
- Saldo em tempo real
- **QR Code dinâmico de uso único** (expira em 90s) para pagar na cantina
- Cardápio da cantina
- Extrato pessoal

### Cantina
- Cadastro de produtos por categoria
- **PDV** com busca, filtro por categoria, carrinho e cobrança via QR
- **Painel** com vendas de hoje, do mês e últimas transações
- **Relatórios avançados**: KPIs (receita, ticket médio, alunos ativos), top 10 produtos, vendas por categoria, série diária de receita, **export CSV**
- **Webhooks** com assinatura HMAC-SHA256 para integração ERP
- Aplicação automática de bloqueios, limites e saldo na cobrança

### Admin / Rede
- **Painel agregado** com KPIs de todas as cantinas (receita período/hoje, transações, alunos ativos)
- Gestão de **planos** (`ESSENCIAL` / `ESCOLA` / `REDE`) e cota `maxAlunos` por cantina

### Segurança
- JWT (HMAC-SHA256, expiração configurável)
- BCrypt para senhas
- Tokens de pagamento de uso único
- Validação de saldo, limites e bloqueios em transação atômica
- CORS configurável por env var
- Health check público dedicado em `/api/health`

---

## Estrutura do projeto

```
carteira-merenda/
├── backend/                     # Spring Boot (porta 8080 em dev / 10000 no Render)
│   ├── src/main/java/com/merenda/
│   │   ├── config/              # Security, DataSeeder, PagamentoConfig
│   │   ├── controller/          # Endpoints REST
│   │   ├── dto/                 # DTOs (records)
│   │   ├── exception/           # Handler global
│   │   ├── model/               # Entidades JPA
│   │   ├── repository/          # Spring Data JPA
│   │   ├── security/            # JWT, UserDetails
│   │   └── service/
│   │       └── gateway/         # PagamentoGateway + Simulated + MercadoPago
│   ├── src/main/resources/
│   │   ├── application.properties
│   │   └── application-prod.properties
│   ├── Dockerfile
│   └── .env.example
├── frontend/                    # React + Vite (porta 5173)
│   ├── src/
│   │   ├── components/          # Layout, Field, PixModal
│   │   ├── context/             # AuthContext
│   │   ├── pages/               # Landing, Login, Dashboards, PDV, Relatórios, etc.
│   │   ├── services/            # axios api
│   │   └── utils/               # format, validation
│   ├── public/                  # hero-estudante.jpg / .svg
│   ├── vercel.json
│   └── .env.example
├── render.yaml                  # Blueprint Render (Postgres + Web Service)
└── merenda_prd.md               # Documento de requisitos do produto
```

---

## Como rodar local

### Pré-requisitos
- Java 17+
- Maven 3.8+
- Node.js 18+ e npm

### 1. Backend

```bash
cd backend
mvn spring-boot:run
```

API disponível em **http://localhost:8080**.

- Console H2: http://localhost:8080/h2-console
  - JDBC URL: `jdbc:h2:file:./data/merendadb`
  - Usuário: `sa` (sem senha)
- Dados persistem em `backend/data/` (apagar a pasta = reset completo).

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Acesse **http://localhost:5173**. O Vite faz proxy de `/api/*` para `http://localhost:8080`.

---

## Contas de teste

Criadas pelo `DataSeeder` no primeiro start (apenas se o banco estiver vazio):

| Perfil       | Email                 | Senha    | Notas |
| ------------ | --------------------- | -------- | ----- |
| Responsável  | maria@merenda.com     | 123456   | Tem 1 dependente vinculado |
| Estudante    | joao@merenda.com      | 123456   | Saldo R$ 50,00 · limite diário R$ 25,00 |
| Cantina      | cantina@merenda.com   | 123456   | Vinculado à "Cantina Central" |
| Admin        | admin@merenda.com     | admin123 | Acesso ao painel da rede |

---

## Endpoints REST

Todos os endpoints (exceto os marcados como **público**) exigem header `Authorization: Bearer <token>`.

### Auth & perfil
```
POST   /api/auth/login                                     público
POST   /api/auth/register                                  público (RESPONSAVEL ou CANTINA)
GET    /api/me                                             dados do usuário logado
GET    /api/health                                         público — health check
```

### Responsável & Dependentes
```
POST   /api/dependentes                                    cria estudante (RESPONSAVEL)
GET    /api/dependentes                                    lista filhos do responsável
PUT    /api/dependentes/{id}/limites                       atualiza limites diário/semanal
```

### Carteira & Recarga
```
GET    /api/carteira/me                                    saldo do estudante logado
GET    /api/carteira/me/extrato                            extrato do estudante logado
GET    /api/carteira/estudante/{id}                        saldo (responsável/admin)
GET    /api/carteira/estudante/{id}/extrato                extrato (responsável/admin)
POST   /api/carteira/recarga                               recarga manual

POST   /api/carteira/recarga-pix                           inicia cobrança Pix (gateway ativo)
GET    /api/carteira/recarga-pix/{id}                      consulta status
POST   /api/carteira/recarga-pix/{externalId}/aprovar-simulado   DEV: aprova manualmente
```

### Cantinas, Produtos & Categorias
```
GET    /api/cantinas/publicas                              público — lista cantinas ativas
GET    /api/cantinas                                       lista todas
GET    /api/cantinas/{id}                                  detalhes
GET    /api/cantinas/{id}/uso                              cota/plano (alunos ativos 30d)
PUT    /api/cantinas/{id}/plano                            atualiza plano (ADMIN)

GET    /api/categorias                                     lista categorias
GET    /api/produtos/cantina/{id}                          cardápio
POST   /api/produtos                                       cria produto (CANTINA)
PUT    /api/produtos/{id}                                  atualiza
DELETE /api/produtos/{id}                                  remove
```

### Pagamentos (PDV)
```
POST   /api/pagamentos/token                               estudante gera QR
POST   /api/pagamentos/cobrar                              cantina cobra com token + itens
```

### Bloqueios nutricionais
```
GET    /api/bloqueios/estudante/{id}                       lista categorias bloqueadas
POST   /api/bloqueios/estudante/{eId}/categoria/{cId}      bloqueia
DELETE /api/bloqueios/estudante/{eId}/categoria/{cId}      desbloqueia
```

### Painel da Cantina + Relatórios
```
GET    /api/cantina/painel/resumo                          vendas hoje/mês + últimas 20
GET    /api/cantina/painel/relatorios?dias=30              KPIs, top produtos, categorias, série diária
GET    /api/cantina/painel/exportar?dias=30                CSV das transações no período
```

### Webhooks (integração ERP)
```
GET    /api/webhooks                                       lista webhooks da cantina
POST   /api/webhooks                                       cria webhook (gera secret)
DELETE /api/webhooks/{id}                                  remove
```

### Admin (rede)
```
GET    /api/admin/rede/resumo?dias=30                      agregado de todas as cantinas (ADMIN)
```

### Webhook do Mercado Pago
```
POST   /api/webhooks/mercadopago/pix                       público — recebe notificações do MP
```

---

## Variáveis de ambiente

### Backend ([`backend/.env.example`](backend/.env.example))

| Variável | Default | Descrição |
|---|---|---|
| `SPRING_PROFILES_ACTIVE` | (vazio) | Use `prod` para ativar Postgres e desabilitar H2 console |
| `PORT` | `8080` | Porta HTTP. O Render injeta automaticamente (10000). |
| `JWT_SECRET` | (chave demo) | Base64. Gere com `openssl rand -base64 64` |
| `JWT_EXPIRATION_MS` | `86400000` | 24h |
| `CORS_ORIGINS` | `http://localhost:5173` | URLs separadas por vírgula. Use `*` em dev |
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASS` | — | Postgres (profile `prod`) |
| `DATABASE_URL` | — | Alternativa: URL JDBC completa |
| `PAGAMENTO_GATEWAY` | `simulated` | `simulated` ou `mercadopago` |
| `MERCADOPAGO_ACCESS_TOKEN` | — | Obrigatório se gateway = `mercadopago` |
| `MERCADOPAGO_WEBHOOK_SECRET` | — | Para validar assinatura dos webhooks do MP |

### Frontend ([`frontend/.env.example`](frontend/.env.example))

| Variável | Default | Descrição |
|---|---|---|
| `VITE_API_URL` | (vazio = proxy do Vite) | URL pública do backend em produção, ex.: `https://merenda-backend.onrender.com/api` |

---

## Integração Pix (Mercado Pago)

O backend usa um adaptador `PagamentoGateway` com duas implementações:

| Gateway | Quando usar | Cobra? |
|---|---|---|
| `simulated` (default) | desenvolvimento, demo | não — gera QR Code fake e expõe botão "Simular aprovação" |
| `mercadopago` | sandbox e produção | sandbox grátis; produção tem taxa por transação (sem mensalidade) |

### Ativar Mercado Pago

1. Crie uma conta em [mercadopago.com.br/developers](https://www.mercadopago.com.br/developers/panel/app).
2. Crie uma aplicação → copie o **Access Token** (use o `TEST-...` para sandbox primeiro).
3. Defina as env vars no Render:
   ```
   PAGAMENTO_GATEWAY=mercadopago
   MERCADOPAGO_ACCESS_TOKEN=APP_USR-...
   MERCADOPAGO_WEBHOOK_SECRET=<gere uma string secreta>
   ```
4. No painel do Mercado Pago → **Notificações → Webhooks**, configure:
   - URL: `https://merenda-backend.onrender.com/api/webhooks/mercadopago/pix`
   - Eventos: **Payments**
   - Cole o mesmo `MERCADOPAGO_WEBHOOK_SECRET` que você definiu no Render.

### Como funciona

1. O responsável clica em **Pagar via Pix QR** na tela do dependente.
2. Backend chama `gateway.criarCobrancaPix(...)` → MP devolve QR + copia-e-cola.
3. Modal exibe QR e faz **polling de status a cada 4s**.
4. Quando o pagador conclui o Pix, o **MP envia webhook** para `/api/webhooks/mercadopago/pix`.
5. Backend confirma com `GET /v1/payments/{id}` (defesa em profundidade), atualiza saldo da carteira e cria `Transacao` do tipo `RECARGA`. Tudo atômico.
6. Frontend detecta a mudança no próximo polling e fecha o modal.

---

## Webhooks (integração ERP)

Cada cantina pode cadastrar URLs externas que serão notificadas em eventos como **compra realizada**. Útil para integrar com ERPs, planilhas de conciliação ou dashboards próprios.

- Cadastro pela tela **Cantina → Integrações** ou via `POST /api/webhooks`.
- A cada disparo, enviamos `POST` com `Content-Type: application/json` e os headers:
  - `X-Merenda-Event: COMPRA_REALIZADA`
  - `X-Merenda-Signature: sha256=<hex>` — HMAC-SHA256 do body com o `secret` exibido na criação.
- Dispatcher é `@Async` — não impacta a latência da cobrança no PDV.
- Falhas de entrega são registradas (`ultimoStatusHttp` no GET).

Exemplo de validação em Node:
```js
const crypto = require('crypto');
const esperado = crypto.createHmac('sha256', SECRET)
  .update(rawBody)
  .digest('hex');
const assinado = req.headers['x-merenda-signature'].split('=')[1];
const ok = crypto.timingSafeEqual(Buffer.from(esperado), Buffer.from(assinado));
```

---

## Deploy

### Backend → Render

**Opção A — Blueprint (1 clique):**
1. Suba o projeto para o GitHub.
2. Render → [Blueprints](https://dashboard.render.com/blueprints) → **New Blueprint Instance** → conecte o repo.
   O [`render.yaml`](render.yaml) na raiz provisiona:
   - Postgres free (1 GB / 90 dias)
   - Web Service Docker rodando o backend
   - `JWT_SECRET` gerado automaticamente
   - Health check em `/api/health`
3. Após subir, ajuste `CORS_ORIGINS` para a URL da Vercel e faça Manual Deploy.

**Opção B — Manual:**
1. Render → **New Web Service** → conecte o repo.
2. Root Directory: `backend` · Runtime: **Docker**
3. Variáveis (veja [backend/.env.example](backend/.env.example)).
4. Aponte Health Check Path para `/api/health` (em **Settings**).

> ⚠️ **Free tier do Render dorme após 15 min** de inatividade. O primeiro request acorda o serviço em ~30s. Boot frio pode levar 90–130s (Postgres + Hibernate + Spring).
>
> ⚠️ **Memória apertada**: o `Dockerfile` já vem com `-Xms128m -Xmx320m -XX:+UseSerialGC` para caber nos 512 MB do free tier.

### Frontend → Vercel

1. Vercel → **Add New → Project** → conecte o repo.
2. Root Directory: `frontend` · Framework: **Vite** (detectado automaticamente).
3. Variável de ambiente:
   - `VITE_API_URL=https://merenda-backend.onrender.com/api`
4. Deploy.

O arquivo [`frontend/vercel.json`](frontend/vercel.json) faz rewrites para o React Router não dar 404 ao recarregar uma rota interna.

### Ordem recomendada
1. Backend no Render (anote a URL).
2. Frontend na Vercel apontando para essa URL (anote a URL).
3. Volte ao Render → `CORS_ORIGINS` = URL exata da Vercel → Manual Deploy.

### Desenvolvimento local
Em dev, os defaults funcionam sem nenhuma env var:
- Backend usa H2 file local.
- Frontend usa proxy `/api → :8080`.

---

## Roadmap

- **Fase 1 — MVP** ✅
  - Cadastro de responsáveis, dependentes, cantinas e operadores
  - Recarga manual + recarga Pix (gateway simulated e Mercado Pago)
  - QR Code dinâmico no app do aluno
  - PDV da cantina
  - Extratos
- **Fase 2 — Controle** ✅
  - Limites diário/semanal
  - Bloqueio nutricional por categoria
  - Gestão de cardápio e estoque
- **Fase 3 — Visibilidade & Integração** ✅
  - Relatórios avançados + export CSV
  - Painel da rede (admin)
  - Webhooks com HMAC-SHA256
  - Planos e cotas por cantina
- **Fase 4 — Próximos passos** ⏳
  - Mesada programada com recorrência (cartão de crédito)
  - Pré-venda / fura-fila (pedido antes do recreio)
  - Gamificação para o estudante (metas, cashback saudável)
  - Pagamento NFC (pulseiras / tags)
  - SSO corporativo (OIDC/SAML) para redes de escolas
  - Migrations versionadas (Flyway/Liquibase)

---

## Licença

Projeto MVP educacional. Uso comercial sob consulta.
