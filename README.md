# Merenda — Carteira Digital Escolar

Carteira digital para estudantes, com o responsável recarregando por Pix/cartão/boleto e o aluno pagando na cantina por QR Code ou NFC. Backend Spring Boot, frontend React, deploy em Render + Vercel.

---

## Visão geral

**Problema.** Crianças e adolescentes que levam dinheiro para a escola enfrentam três atritos típicos:

- **Filas no recreio** — pagar em dinheiro é lento; o recreio é curto.
- **Pais sem visibilidade** — não sabem o que o filho comeu nem quanto gastou.
- **Cantina gerenciando troco** — fechamento de caixa manual e risco de inadimplência (fiado).

**Abordagem.** Um e-wallet específico para o contexto escolar, com três perfis:

- **Responsável** — recarrega a carteira do filho (Pix, cartão ou boleto), define limites diários/semanais, bloqueia categorias (ex: refrigerantes) ou alérgenos, recebe notificação a cada compra.
- **Estudante** — vê o saldo no app, gera um QR Code ou token NFC com TTL curto (90s / 30s) e mostra/encosta no PDV da cantina.
- **Cantina** — opera o PDV (leitor de QR ou NFC), cadastra cardápio e estoque, vê relatórios e fechamento de caixa.

Plus: uma camada SaaS B2B2C (planos de mensalidade para a cantina + take rate por transação) e um painel admin de rede.

---

## Stack técnica

### Backend (`/backend`)

| Item | Escolha |
|---|---|
| Linguagem | Java 17 |
| Framework | Spring Boot 3.2 (Web, Data JPA, Security, Validation) |
| Build | Maven (com Maven Wrapper — `./mvnw`) |
| Banco — dev | H2 file (`./data/merendadb`) |
| Banco — prod | PostgreSQL (Render Postgres) |
| Migrations | Flyway (modo baseline; schema gerenciado por Hibernate `ddl-auto=update`) |
| Auth | JWT (`jjwt` 0.12) + Google OAuth 2.0 (`google-api-client`) |
| Pagamentos | Mercado Pago — Pix, Cartão (Bricks), Boleto, Customer/Cards API (cobrança recorrente) |
| Webhook MP | Validação HMAC-SHA256 + roteamento por método (pix/boleto) |
| Push | Firebase Admin SDK 9.3 (opcional via env) |
| Notificações in-app | Server-Sent Events (SSE) |
| Container | Docker multi-stage (`maven:3.9-eclipse-temurin-17` → `eclipse-temurin:17-jre`) |

### Frontend (`/frontend`)

| Item | Escolha |
|---|---|
| Framework | React 18 + Vite 5 |
| Estilo | Tailwind CSS 3 |
| Roteamento | React Router 6 |
| HTTP | axios |
| OAuth Google | `@react-oauth/google` |
| Mercado Pago | `@mercadopago/sdk-react` (CardPayment Brick) |
| Push | `firebase` (Web SDK — opcional) |
| QR Code | `qrcode.react` (geração) + `@zxing/browser` (leitura PDV) |
| NFC | Web NFC API nativa (Android + Chrome + HTTPS) |
| PWA | `vite-plugin-pwa` + service worker próprio para FCM em background |

### Deploy

- **Backend:** Render Web Service (Docker) + Render Postgres
- **Frontend:** Vercel (build estático + CDN)
- Blueprint Render disponível em [`render.yaml`](./render.yaml)

---

## Como rodar o projeto

### Pré-requisitos

- JDK 17+
- Node.js 20+ e npm
- (Opcional) Docker e Docker Compose

### Sem Docker — dev local

**1. Backend** (porta 8080, banco H2 em arquivo)

```bash
cd backend
./mvnw spring-boot:run
```

No Windows PowerShell:
```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

Os defaults em `application.properties` funcionam sem env vars — o app sobe em modo simulado (sem cobrança real) com banco H2 local em `./data/merendadb`. Console H2 disponível em http://localhost:8080/h2-console.

Para usar Mercado Pago de verdade, crie `backend/src/main/resources/application-local.properties` (gitignored) e rode com perfil `local`:
```powershell
$env:SPRING_PROFILES_ACTIVE="local"
.\mvnw.cmd spring-boot:run
```

**2. Frontend** (porta 5173, proxy automático `/api/*` → `localhost:8080`)

```bash
cd frontend
npm install
npm run dev
```

Acesse http://localhost:5173. Login com qualquer um dos usuários seed:

| Email | Senha | Papel |
|---|---|---|
| `maria@merenda.com` | `123456` | Responsável |
| `joao@merenda.com` | `123456` | Estudante |
| `cantina@merenda.com` | `123456` | Cantina |
| `admin@merenda.com` | `admin123` | Admin |

### Com Docker — apenas backend

O backend tem `Dockerfile` multi-stage pronto. O frontend é build estático e roda direto na Vercel/qualquer CDN.

```bash
cd backend
docker build -t merenda-backend .
docker run --rm -p 8080:8080 \
  -e SPRING_PROFILES_ACTIVE=prod \
  -e DATABASE_URL="jdbc:postgresql://host.docker.internal:5432/merenda" \
  -e DB_USER=postgres -e DB_PASS=postgres \
  -e JWT_SECRET="$(openssl rand -base64 64)" \
  -e CORS_ORIGINS=http://localhost:5173 \
  merenda-backend
```

> **Sem frontend no Docker** porque o build de produção (`npm run build`) gera estáticos em `frontend/dist/` — não há necessidade de container em runtime. Em dev local, use `npm run dev` direto.

---

## Variáveis de ambiente

Veja [`backend/.env.example`](./backend/.env.example) e [`frontend/.env.example`](./frontend/.env.example) para a lista completa documentada. Resumo das obrigatórias:

**Backend (prod):**
- `DATABASE_URL`, `DB_USER`, `DB_PASS` — Postgres
- `JWT_SECRET` — gere com `openssl rand -base64 64`
- `CORS_ORIGINS` — URLs da Vercel separadas por vírgula
- `GOOGLE_CLIENT_ID` — Client ID OAuth do Google Cloud

**Backend (opcionais — habilitam integrações reais):**
- `PAGAMENTO_GATEWAY=mercadopago` + `MERCADOPAGO_ACCESS_TOKEN` + `MERCADOPAGO_PUBLIC_KEY` + `MERCADOPAGO_WEBHOOK_SECRET`
- `PUSH_ENABLED=true` + `FIREBASE_CREDENTIALS_JSON` (service account inline)

**Frontend:**
- `VITE_GOOGLE_CLIENT_ID` — mesmo Client ID do backend
- `VITE_MERCADOPAGO_PUBLIC_KEY` — opcional (sem ele o modal de cartão cai em mock)
- `VITE_FIREBASE_*` (7 variáveis) — opcionais para FCM real

---

## Principais endpoints

A API tem 27 controllers; abaixo, os caminhos mais usados (todos sob `/api`). Endpoints autenticados exigem header `Authorization: Bearer <jwt>`.

### Autenticação

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/register` | Cria conta de responsável (com consentimento LGPD) |
| POST | `/api/auth/login` | Login email/senha, retorna JWT |
| POST | `/api/auth/google-login` | Login via Google ID token |
| POST | `/api/auth/google-register` | Registro via Google |
| GET | `/api/me` | Dados do usuário autenticado |

### Carteira e recargas

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/carteira/me` | Saldo + limites + gasto hoje (estudante) |
| GET | `/api/carteira/me/extrato` | Últimas transações |
| GET | `/api/carteira/estudante/{id}` | Saldo do dependente (responsável) |
| POST | `/api/carteira/recarga-pix` | Inicia cobrança Pix (retorna QR + copia-cola) |
| GET | `/api/carteira/recarga-pix/{id}` | Polling de status |
| POST | `/api/carteira/recarga-cartao` | Cobra cartão (token tokenizado no Brick MP) |
| POST | `/api/carteira/recarga-boleto` | Gera boleto |
| GET | `/api/carteira/auto-recarga/estudante/{id}` | Configuração de auto-recarga |
| PUT | `/api/carteira/auto-recarga/estudante/{id}` | Configura auto-recarga + salva cartão |

### Mesada

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/mesadas/estudante/{id}` | Mesada vigente |
| PUT | `/api/mesadas/estudante/{id}` | Cria/atualiza mesada (DIARIA/SEMANAL/QUINZENAL/MENSAL) |
| POST | `/api/mesadas/estudante/{id}/cartao` | Vincula cartão para cobrança recorrente |
| DELETE | `/api/mesadas/estudante/{id}/cartao` | Remove cartão |

### Pagamento na cantina

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/pagamentos/token` | Estudante gera token QR (TTL 90s) |
| POST | `/api/pagamentos/token-nfc` | Estudante gera token NFC (TTL 30s) |
| POST | `/api/pagamentos/cobrar` | Cantina cobra usando token + lista de itens |

### Cantina (operação)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/produtos/cantina/{id}` | Cardápio (com filtro de disponibilidade) |
| POST | `/api/produtos` | Cadastra produto (estoque + alérgenos + nutricional) |
| GET | `/api/pedidos/fila` | Fila de pré-pedidos por status |
| PUT | `/api/pedidos/{id}/status` | Avança status do pedido (PREPARANDO/PRONTO/ENTREGUE) |
| GET | `/api/cantina/painel/resumo` | KPIs do dia |
| GET | `/api/cantina/painel/relatorios?dias=30` | Vendas, top produtos, por categoria |
| POST | `/api/cantina/caixa/fechar` | Fechamento de caixa |

### Webhooks

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/webhooks/mercadopago` | Recebe notificação do MP (HMAC validado); roteia pix/boleto |

### Outros

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/dependentes` | Lista filhos vinculados (responsável) |
| POST | `/api/dependentes` | Cria dependente (bloqueia <13 sem verificação parental — COPPA) |
| POST | `/api/coppa/estudante/{id}/verificar` | Registra verificação parental |
| GET | `/api/notificacoes/stream` | SSE stream de notificações em tempo real |
| GET | `/api/lgpd/exportar` | Exporta todos os dados do usuário (JSON) |
| DELETE | `/api/lgpd/conta` | Anonimiza a conta (LGPD) |
| GET | `/api/admin/rede/resumo?dias=30` | Painel admin de rede |
| GET | `/api/health` | Health check (público) |

---

## Estrutura do projeto

```
.
├── backend/
│   ├── src/main/java/com/merenda/
│   │   ├── config/           # SecurityConfig, PagamentoConfig, FirebaseConfig, exception/, security/
│   │   ├── domain/           # Organizado por feature
│   │   │   ├── bloqueio/     # Bloqueio nutricional e por categoria
│   │   │   ├── cantina/      # Cantina, produtos, categorias, faturas, caixa
│   │   │   ├── carteira/     # Saldo, recargas, mesada, auto-recarga, pagamento
│   │   │   ├── gamificacao/  # Badges e metas
│   │   │   ├── pedido/       # Pedidos antecipados (fura-fila)
│   │   │   └── usuario/      # Usuario, auth, dependentes, COPPA, push tokens
│   │   ├── infrastructure/
│   │   │   ├── gateway/      # Mercado Pago + simulados (cartão/boleto/pix)
│   │   │   └── webhook/      # Webhooks inbound (MP) e outbound (cantinas)
│   │   ├── controller/       # Controllers shared (admin, notificações, LGPD)
│   │   └── service/          # Services shared (NotificacaoService SSE, LgpdService)
│   ├── src/main/resources/
│   │   ├── application.properties           # dev + defaults
│   │   ├── application-prod.properties      # Postgres + Flyway
│   │   └── db/migration/V1__baseline.sql    # marcador Flyway
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/       # Layout, UI (Field, QrScanner), PwaInstallPrompt
│   │   ├── context/          # AuthContext, NotificacoesContext (SSE)
│   │   ├── features/         # Slices por papel
│   │   │   ├── admin/        # Painel da rede
│   │   │   ├── auth/         # Login + Registro (+ Google)
│   │   │   ├── cantina/      # PDV, produtos, pedidos, relatórios, caixa, faturas
│   │   │   ├── estudante/    # Dashboard QR/NFC, pedidos, conquistas
│   │   │   └── responsavel/  # Dashboard, dependente, mesada, auto-recarga
│   │   ├── pages/            # Landing, MinhaConta, PoliticaPrivacidade
│   │   └── services/         # api.js (axios), nfc.js, push.js, firebase.js
│   ├── public/firebase-messaging-sw.js   # SW dedicado FCM
│   └── vite.config.js                    # PWA + proxy /api
└── render.yaml               # Blueprint Render (Postgres + Web Service)
```

---

## Decisões técnicas

### 1. Banco: H2 em dev, Postgres em prod (mesmo dialeto JPA)

Quem clona o repo roda `./mvnw spring-boot:run` e tem um banco funcional **sem instalar nada**. O profile `prod` troca para Postgres sem mudar código de entidade. Custo: dialeto SQL nativo divergir entre H2 e Postgres em queries complexas — todas as queries hoje usam JPQL (portável).

### 2. Flyway em modo baseline, schema ainda controlado pelo Hibernate

`spring.flyway.baseline-on-migrate=true` + `baseline-version=1` permite adotar Flyway sem precisar reescrever o schema existente. Mudanças futuras vão como `V2__*.sql`. Decisão pragmática para um MVP: trocar `ddl-auto=update` por `validate` só quando o time tiver disciplina de gerar migration a cada PR.

### 3. Gateway de pagamento com bean condicional (simulated vs Mercado Pago)

`PagamentoConfig` cria `PagamentoGateway`, `CartaoGateway` e `BoletoGateway` baseado em `PAGAMENTO_GATEWAY` (env). Em dev sem credenciais MP, tudo cai automaticamente em simulated — útil para CI, demos, novos contribuidores. O contrato do gateway é o mesmo; o service não sabe qual implementação está rodando.

### 4. Cartão recorrente via Customer/Cards API do MP (não Subscriptions)

Para **mesada** (cobrança em data fixa) e **auto-recarga** (cobrança quando saldo cai), usei `POST /v1/customers` + `POST /v1/customers/{id}/cards` e cobrança via `payer.type=customer`. A alternativa (`/preapproval` Subscriptions) é mais limpa para mesada, mas:
- Auto-recarga não tem frequência fixa, não cabe em Subscriptions.
- Implementar dois fluxos (Customer para uma feature, Preapproval para outra) duplica código.

Trade-off: em produção, MIT (merchant-initiated transaction) com cartão salvo pode exigir acordo específico com o MP. Em sandbox funciona com o token original.

### 5. SSE para notificações em vez de WebSocket

Notificações de compra são unidirecionais (servidor → cliente). SSE roda sobre HTTP/1.1 normal (passa por qualquer proxy), reconecta sozinho, não precisa de biblioteca extra. WebSocket seria overkill aqui.

### 6. QR Code com TTL de 90s + NFC com TTL de 30s

Token de pagamento expira rápido para reduzir janela de fraude se o aluno deixar a tela aberta. Sem TTL, o token vira "vale-refeição" permanente — quem pegar a tela paga em qualquer cantina conectada.

### 7. Web NFC API nativa (sem app nativo)

A leitura/escrita NFC roda direto no Chrome Android via `NDEFReader`. Zero infraestrutura extra, zero dependência. Limitação clara: só Android + Chrome + HTTPS — em iOS o caminho seria Capacitor ou app nativo (fora do escopo MVP). Para o MVP, QR Code é o fallback universal.

### 8. LGPD: anonimização em vez de DELETE

Endpoint `DELETE /api/lgpd/conta` não apaga o registro do usuário — apaga PII (nome, email, CPF, telefone) e marca a conta como inativa. Transações ficam intactas (obrigação contábil/fiscal). O usuário recebe a explicação no response.

### 9. COPPA implementado como serviço dedicado

Para estudantes < 13 anos, o cadastro só passa com `verificacaoParental=true` explícito do responsável. `CoppaService` sanitiza CPF/telefone do menor automaticamente. Justificativa: LGPD/ECA tratam menores em geral, COPPA é mais restrito para o subgrupo < 13 — ter código separado deixa a regra auditável.

### 10. `IllegalStateException` no `GlobalExceptionHandler` → HTTP 502

Integrações externas (MP, Firebase) lançam `IllegalStateException` com a mensagem do gateway. O handler retorna 502 + a mensagem real do MP. Antes era 500 genérico engolindo o erro — depurar era impossível sem ler o log do servidor.

---

## Próximos passos

Realistas, em ordem de impacto:

### Curto prazo

1. **Testes automatizados.** Hoje o repo tem 0 arquivos em `src/test/`. Começar com testes de integração dos services críticos (`PagamentoService`, `RecargaPixService`, `MesadaService`) usando `@SpringBootTest` + Testcontainers Postgres.
2. **Migrar `ddl-auto=update` para `validate` em prod.** Gerar `V2__init.sql` com o schema atual via `mvn flyway:baseline + spring.jpa.properties.hibernate.hbm2ddl.scripts.create-target`.
3. **Rate limiting** em `/api/auth/*` e `/api/pagamentos/cobrar`. Bucket4j ou um `OncePerRequestFilter` simples com Caffeine.
4. **Spring Actuator + Prometheus.** Endpoints `/actuator/health`, `/actuator/metrics`, `/actuator/prometheus` para observabilidade básica.
5. **Code-splitting do frontend.** Hoje o bundle único tem ~900 KB (gzip ~245 KB). Lazy-load das páginas por rota (`React.lazy`).

### Médio prazo

6. **Email transacional.** SMTP via Spring Mail (recibos de recarga, alerta de auto-recarga falhada). Hoje só existe push + SSE.
7. **Subscriptions API do MP** para mesada (em vez de MIT manual com cartão salvo), quando o volume justificar.
8. **CI/CD com GitHub Actions** — build + test + deploy automático para Render/Vercel.
9. **App nativo iOS via Capacitor** se NFC virar requisito não-negociável.
10. **Internacionalização.** Hoje strings hardcoded em pt-BR.

---

## Licença

MIT — ver [LICENSE](./LICENSE) se aplicável. Em ambiente sem licença explícita, considere "uso interno" até definir.
