# Merenda - Carteira Digital Escolar

Carteira digital (e-wallet) focada no público infanto-juvenil para facilitar a compra de lanches em cantinas escolares.

- **Backend:** Spring Boot 3.2 + Spring Security (JWT) + JPA + H2
- **Frontend:** React 18 + Vite + Tailwind CSS + React Router

---

## Estrutura

```
carteira-merenda/
├── backend/        # Spring Boot (porta 8080)
├── frontend/       # React + Vite (porta 5173)
└── merenda_prd.md  # Documento de requisitos
```

---

## Pré-requisitos

- **Java 17+** (JDK)
- **Maven 3.8+** (ou use o `mvnw` que pode ser adicionado posteriormente)
- **Node.js 18+** e **npm**

---

## Como rodar

### 1. Backend (Spring Boot)

```bash
cd backend
mvn spring-boot:run
```

API ficará disponível em **http://localhost:8080**.

- Console H2: http://localhost:8080/h2-console
  - JDBC URL: `jdbc:h2:file:./data/merendadb`
  - Usuário: `sa` (sem senha)
- Banco persistente em `backend/data/` (deletar pasta = reset).

### 2. Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Acesse **http://localhost:5173**.

O Vite faz proxy de `/api/*` para `http://localhost:8080`.

---

## Contas de teste (criadas no primeiro start)

| Perfil       | Email                  | Senha    |
| ------------ | ---------------------- | -------- |
| Responsável  | maria@merenda.com      | 123456   |
| Estudante    | joao@merenda.com       | 123456   |
| Cantina      | cantina@merenda.com    | 123456   |
| Admin        | admin@merenda.com      | admin123 |

O estudante já começa com saldo de **R$ 50,00** e limite diário de **R$ 25,00**.

---

## Funcionalidades implementadas (MVP - Fases 1 e 2 do PRD)

### Responsável
- Cadastrar dependentes (estudantes)
- Recarregar carteira (via Pix simulado)
- Definir limites diário/semanal de gastos
- Bloqueio nutricional por categoria
- Extrato detalhado das compras dos filhos

### Estudante
- Visualizar saldo e limites
- Gerar **QR Code dinâmico de pagamento** (token expira em 90s)
- Consultar cardápio da cantina
- Extrato pessoal

### Cantina
- Cadastro de produtos e categorias
- **PDV** com leitura de token / colagem do código do QR
- Aplicação automática de bloqueios e limites na cobrança
- Painel com vendas do dia/mês e últimas transações

### Segurança & Regras
- Autenticação JWT
- BCrypt para senhas
- Tokens de pagamento de uso único, com expiração curta
- Validação de saldo e limites em transação atômica
- Bloqueio por categoria respeitado no PDV

---

## Endpoints REST principais

```
POST   /api/auth/login                          → login (qualquer perfil)
POST   /api/auth/register                       → cadastro de responsável/cantina
GET    /api/me                                  → dados do usuário logado

POST   /api/dependentes                         → criar estudante
GET    /api/dependentes                         → listar filhos do responsável
PUT    /api/dependentes/{id}/limites            → limites diário/semanal

GET    /api/carteira/me                         → saldo do estudante logado
GET    /api/carteira/me/extrato                 → extrato do estudante logado
GET    /api/carteira/estudante/{id}             → saldo de um estudante
POST   /api/carteira/recarga                    → recarregar

GET    /api/cantinas/publicas                   → listar cantinas (público)
GET    /api/produtos/cantina/{id}               → cardápio
POST   /api/produtos                            → criar produto (cantina)

POST   /api/pagamentos/token                    → gerar token QR (estudante)
POST   /api/pagamentos/cobrar                   → cobrar carrinho (cantina)

GET    /api/bloqueios/estudante/{id}            → listar categorias bloqueadas
POST   /api/bloqueios/estudante/{eId}/categoria/{cId}  → bloquear
DELETE /api/bloqueios/estudante/{eId}/categoria/{cId}  → desbloquear

GET    /api/cantina/painel/resumo               → painel da cantina
```

Todos os endpoints (exceto `/api/auth/**`, `/api/cantinas/publicas` e `/h2-console`) exigem header
`Authorization: Bearer <token>`.

---

## Deploy

### Backend → Render

**Opção A — Blueprint (1 clique):**
1. Suba o projeto para o GitHub.
2. Render → [Blueprints](https://dashboard.render.com/blueprints) → **New Blueprint Instance** → conecte o repo.
   O `render.yaml` na raiz já provisiona:
   - Postgres free
   - Web Service Docker rodando o backend
   - `JWT_SECRET` gerado automaticamente
   - `CORS_ORIGINS=*` inicial (ajuste depois para a URL da Vercel)

**Opção B — Manual:**
1. Render → **New Web Service** → conecte o repo.
2. Configuração:
   - Root Directory: `backend`
   - Runtime: **Docker** (Dockerfile incluso)
3. Variáveis de ambiente (veja [`backend/.env.example`](backend/.env.example)):
   - `SPRING_PROFILES_ACTIVE=prod`
   - `JWT_SECRET=...` (gere com `openssl rand -base64 64`)
   - `CORS_ORIGINS=https://seu-app.vercel.app`
   - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS` — pegue do Postgres provisionado.

⚠️ **Free tier do Render dorme após 15 min** de inatividade. O primeiro request acorda o serviço em ~30s.

### Frontend → Vercel

1. Vercel → **Add New → Project** → conecte o repo.
2. Configuração:
   - Root Directory: `frontend`
   - Framework: Vite (detectado automaticamente)
3. Variáveis de ambiente:
   - `VITE_API_URL=https://merenda-backend.onrender.com/api`
4. Deploy. Anote a URL gerada e atualize `CORS_ORIGINS` no Render com ela. Redeploy do backend.

### Desenvolvimento local

Os defaults em `application.properties` (H2 file + porta 8080) e o proxy do Vite (`/api → :8080`) continuam funcionando sem nenhuma variável de ambiente. Para apontar o frontend para um backend remoto em dev, crie `frontend/.env.local`:
```
VITE_API_URL=https://merenda-backend.onrender.com/api
```

---

## Roadmap (do PRD)

- **Fase 1 (MVP):** ✅ Cadastro, recarga via Pix, QR Code, extrato
- **Fase 2 (Controle):** ✅ Limites, bloqueio nutricional, gestão de cardápio
- **Fase 3 (Expansão):** ⏳ Gamificação, pré-venda (fura-fila), mesada programada, integração real com gateway de pagamento, NFC

---

## Licença

Projeto educacional / MVP.
