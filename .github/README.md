# 🚀 CI/CD Pipeline

Configuração automática de Integração Contínua e Entrega Contínua (CI/CD) para deployar backend e frontend.

## 📁 Estrutura

```
.github/
├── workflows/
│   ├── backend-ci-cd.yml      # Pipeline do backend (Render)
│   └── frontend-ci-cd.yml     # Pipeline do frontend (Vercel)
├── CI_CD_SETUP.md              # Guia de configuração detalhado
├── setup-secrets.sh            # Script de configuração (Linux/Mac)
├── setup-secrets.ps1           # Script de configuração (Windows)
└── README.md                   # Este arquivo
```

## ⚡ Quick Start

### 1️⃣ Configure os Secrets (escolha uma opção)

**Opção A: Script Linux/Mac**
```bash
chmod +x .github/setup-secrets.sh
bash .github/setup-secrets.sh
```

**Opção B: Script Windows**
```powershell
powershell -ExecutionPolicy Bypass -File .github/setup-secrets.ps1
```

**Opção C: Manual via GitHub**
1. Acesse seu repositório
2. Settings → Secrets and variables → Actions
3. Clique em "New repository secret"
4. Adicione cada secret necessário

### 2️⃣ Faça um Push

```bash
git add .
git commit -m "ci: implementar CI/CD automático"
git push
```

### 3️⃣ Acompanhe o Build

Acesse seu repositório no GitHub → **Actions** para visualizar o progresso

## 🔑 Secrets Necessários

### Backend (Render)
- `RENDER_SERVICE_ID` - ID do serviço
- `RENDER_API_KEY` - Chave de API do Render
- `RENDER_BACKEND_URL` - URL do backend

### Frontend (Vercel)
- `VERCEL_TOKEN` - Token do Vercel
- `VERCEL_ORG_ID` - ID da organização
- `VERCEL_PROJECT_ID` - ID do projeto
- `VITE_API_URL` - URL da API

## 📊 Fluxo Automático

### Backend
```
Push em main/develop (alterando backend/)
    ↓
[✓] Executar testes Maven
    ↓
[✓] Construir imagem Docker
    ↓
[✓] Push para GitHub Container Registry
    ↓
[✓] Deploy no Render
    ↓
[✓] Health check automático
```

### Frontend
```
Push em main/develop (alterando frontend/)
    ↓
[✓] Instalar dependências
    ↓
[✓] Executar build
    ↓
[✓] Deploy no Vercel
```

## 📝 Detalhes dos Workflows

### backend-ci-cd.yml
- **Trigger**: Push ou PR em `main`/`develop` com mudanças em `backend/`
- **Jobs**:
  1. `test` - Executa testes Maven
  2. `build` - Constrói imagem Docker
  3. `deploy` - Deploy em Render
  4. `notify` - Notifica resultado

### frontend-ci-cd.yml
- **Trigger**: Push ou PR em `main`/`develop` com mudanças em `frontend/`
- **Jobs**:
  1. `test` - Build e lint
  2. `deploy` - Deploy em Vercel

## 🧪 Testando Localmente

### Backend
```bash
cd backend
mvn clean test
mvn clean package
docker build -t merenda-backend:latest .
docker run -p 8080:8080 merenda-backend:latest
```

### Frontend
```bash
cd frontend
npm install
npm run build
npm run preview
```

## 📊 Monitorando

### GitHub Actions
- Acesse seu repositório
- Clique na aba "Actions"
- Clique no workflow em execução
- Veja logs detalhados de cada step

### Render
- Acesse https://dashboard.render.com
- Selecione seu serviço
- Clique em "Logs" ou "Events"

### Vercel
- Acesse https://vercel.com
- Clique no seu projeto
- Acesse "Deployments"

## 🆘 Troubleshooting

### Build falha em testes
```bash
# Teste localmente
cd backend
mvn clean test -X  # -X para debug
```

### Deploy falha no Render
- Verifique os secrets (especialmente `RENDER_SERVICE_ID`)
- Confirme que a URL está acessível
- Acesse logs do Render para detalhes

### Deploy falha no Vercel
- Verifique `VITE_API_URL` apontando para backend correto
- Confirme que `vercel.json` existe e está correto
- Acesse logs do Vercel

### Health check timeout
- Pode ser que o backend está demorando para subir
- Aumente o timeout em `backend-ci-cd.yml` (padrão: 5 min)
- Verifique logs do Render

## 🔒 Segurança

✅ **Boas práticas implementadas:**
- Secrets encriptografados
- Tokens não expostos em logs
- Cache de Docker para performance
- Health checks antes de considerar sucesso
- Permissões mínimas necessárias

## 📈 Próximas Melhorias

- [ ] Notificações Slack/Discord
- [ ] Rollback automático em falha
- [ ] Coverage reports (CodeCov)
- [ ] Análise estática (SonarQube)
- [ ] Database migrations automáticas
- [ ] Performance monitoring

## 📖 Documentação

- [CI/CD_SETUP.md](./CI_CD_SETUP.md) - Guia completo de configuração
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Render Deploy Documentation](https://render.com/docs)
- [Vercel Deployment Documentation](https://vercel.com/docs)

## 💡 Dicas

- **Branches de proteção**: Configure em Settings → Branches para exigir que CI/CD passe antes de merge
- **Status badges**: Adicione ao README para mostrar status do build:
  ```markdown
  ![Backend CI/CD](https://github.com/seu-usuario/carteira-merenda/actions/workflows/backend-ci-cd.yml/badge.svg)
  ![Frontend CI/CD](https://github.com/seu-usuario/carteira-merenda/actions/workflows/frontend-ci-cd.yml/badge.svg)
  ```

---

**Criado em**: 2026-05-23
**Status**: ✅ Ativo e Funcional
