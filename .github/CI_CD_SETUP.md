# CI/CD Configuration Guide

## 🚀 Configuração de CI/CD com GitHub Actions

Este projeto implementa um pipeline automático de integração contínua e entrega contínua (CI/CD) para backend (Render) e frontend (Vercel).

### 📋 Fluxo do Pipeline

```
Push para main/develop
    ↓
[Backend Tests] (Maven)
    ↓
[Build Docker Image] (ghcr.io)
    ↓
[Deploy para Render] (API)
    ↓
[Health Check]

[Frontend Tests] (npm)
    ↓
[Deploy para Vercel]
```

## 🔑 Secrets Necessários no GitHub

### Backend (Render)

1. **RENDER_SERVICE_ID**
   - Obtenha em: Render Dashboard → Select Service → Settings → Service ID
   - Exemplo: `srv-c123abc456def`

2. **RENDER_API_KEY**
   - Obtenha em: Render Dashboard → Account Settings → API Keys
   - Crie uma nova chave com permissão de deploy

3. **RENDER_BACKEND_URL**
   - A URL do seu backend no Render
   - Exemplo: `https://merenda-backend.onrender.com`

### Frontend (Vercel)

1. **VERCEL_TOKEN**
   - Obtenha em: Vercel Dashboard → Settings → Tokens
   - Crie um novo token com escopo `full`

2. **VERCEL_ORG_ID**
   - Obtenha em: Vercel Dashboard → Settings → General
   - Procure por "Team ID" ou "Organization ID"

3. **VERCEL_PROJECT_ID**
   - Obtenha em: Vercel Dashboard → Project Settings → General
   - Procure por "Project ID"

4. **VITE_API_URL**
   - A URL do seu backend no Render
   - Exemplo: `https://merenda-backend.onrender.com/api`

## 📝 Como Configurar os Secrets

### No GitHub:

1. Vá para seu repositório
2. Settings → Secrets and variables → Actions
3. Clique em "New repository secret"
4. Adicione cada secret com seu nome e valor

## ✅ Verificação de Deployment

### Backend (Render)

```bash
# Health check
curl https://merenda-backend.onrender.com/api/health

# Logs
# Acesse em: Render Dashboard → Service → Logs
```

### Frontend (Vercel)

```bash
# Acesse diretamente na URL do seu projeto Vercel
```

## 🔄 Comportamento Automático

### Backend
- **Trigger**: Push em `main` ou `develop` que modifica `backend/**`
- **Ações**:
  1. Executa testes Maven
  2. Constrói imagem Docker
  3. Faz push para GitHub Container Registry
  4. Deploy automático em Render
  5. Health check cada 10 segundos (máx 5 min)

### Frontend
- **Trigger**: Push em `main` ou `develop` que modifica `frontend/**`
- **Ações**:
  1. Instala dependências
  2. Executa build
  3. Deploy em Vercel

## 🛠️ Comandos Manual

### Testando o Backend Localmente

```bash
cd backend
mvn clean test
mvn clean package -DskipTests
```

### Testando o Frontend Localmente

```bash
cd frontend
npm install
npm run build
npm run preview
```

### Construindo a Imagem Docker

```bash
cd backend
docker build -t merenda-backend:latest .
docker run -p 8080:8080 merenda-backend:latest
```

## 📊 Monitorando Builds

1. Acesse seu repositório GitHub
2. Actions tab
3. Clique no workflow que deseja inspecionar
4. Visualize logs detalhados de cada step

## ⚠️ Troubleshooting

### Build falha em testes

```bash
# Verifique testes localmente
cd backend
mvn clean test

# Se passar localmente mas falhar no CI, pode ser variáveis de ambiente
# Configure em: Settings → Secrets
```

### Deploy falha no Render

- Verifique `RENDER_SERVICE_ID` e `RENDER_API_KEY`
- Confirme que o serviço existe no Render
- Acesse Render logs para mais detalhes

### Deploy falha no Vercel

- Verifique `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
- Confirme `VITE_API_URL` apontando para backend correto
- Verifique arquivo `vercel.json` está configurado

## 🔐 Segurança

- Secrets são criptografados e não aparecem em logs
- Cada step tem acesso apenas aos secrets necessários
- Docker images são construidas com cache para performance
- GITHUB_TOKEN é usado automaticamente para acesso ao Container Registry

## 📈 Próximas Melhorias

- [ ] Coverage reports com CodeCov
- [ ] Análise de código estático (SonarQube)
- [ ] Testes de integração E2E
- [ ] Slack/Discord notifications
- [ ] Rollback automático se health check falhar
- [ ] Database migrations automáticas
