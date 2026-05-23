#!/bin/bash

# Script para auxiliar na configuração de secrets do GitHub para CI/CD
# Uso: bash .github/setup-secrets.sh

set -e

echo "=========================================="
echo "🔐 GitHub Secrets Configuration Helper"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI não está instalado${NC}"
    echo "Instale em: https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}❌ Você não está autenticado no GitHub${NC}"
    echo "Execute: gh auth login"
    exit 1
fi

echo -e "${GREEN}✅ GitHub CLI autenticado${NC}"
echo ""

# Get repository
REPO=$(gh repo view --json nameWithOwner -q . 2>/dev/null || echo "")
if [ -z "$REPO" ]; then
    echo -e "${RED}❌ Não foi possível determinar o repositório${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Repositório: $REPO${NC}"
echo ""

# Backend Secrets
echo "=========================================="
echo "Backend (Render)"
echo "=========================================="
echo ""

read -p "RENDER_SERVICE_ID (encontre em Render → Service → Settings): " RENDER_SERVICE_ID
if [ -n "$RENDER_SERVICE_ID" ]; then
    gh secret set RENDER_SERVICE_ID --body "$RENDER_SERVICE_ID" -R "$REPO"
    echo -e "${GREEN}✅ RENDER_SERVICE_ID configurado${NC}"
fi

read -p "RENDER_API_KEY (encontre em Render → Account Settings → API Keys): " RENDER_API_KEY
if [ -n "$RENDER_API_KEY" ]; then
    gh secret set RENDER_API_KEY --body "$RENDER_API_KEY" -R "$REPO"
    echo -e "${GREEN}✅ RENDER_API_KEY configurado${NC}"
fi

read -p "RENDER_BACKEND_URL (ex: https://merenda-backend.onrender.com): " RENDER_BACKEND_URL
if [ -n "$RENDER_BACKEND_URL" ]; then
    gh secret set RENDER_BACKEND_URL --body "$RENDER_BACKEND_URL" -R "$REPO"
    echo -e "${GREEN}✅ RENDER_BACKEND_URL configurado${NC}"
fi

echo ""

# Frontend Secrets
echo "=========================================="
echo "Frontend (Vercel)"
echo "=========================================="
echo ""

read -p "VERCEL_TOKEN (encontre em Vercel → Settings → Tokens): " VERCEL_TOKEN
if [ -n "$VERCEL_TOKEN" ]; then
    gh secret set VERCEL_TOKEN --body "$VERCEL_TOKEN" -R "$REPO"
    echo -e "${GREEN}✅ VERCEL_TOKEN configurado${NC}"
fi

read -p "VERCEL_ORG_ID (encontre em Vercel → Settings → General → Team ID): " VERCEL_ORG_ID
if [ -n "$VERCEL_ORG_ID" ]; then
    gh secret set VERCEL_ORG_ID --body "$VERCEL_ORG_ID" -R "$REPO"
    echo -e "${GREEN}✅ VERCEL_ORG_ID configurado${NC}"
fi

read -p "VERCEL_PROJECT_ID (encontre em Vercel → Project Settings → Project ID): " VERCEL_PROJECT_ID
if [ -n "$VERCEL_PROJECT_ID" ]; then
    gh secret set VERCEL_PROJECT_ID --body "$VERCEL_PROJECT_ID" -R "$REPO"
    echo -e "${GREEN}✅ VERCEL_PROJECT_ID configurado${NC}"
fi

read -p "VITE_API_URL (ex: https://merenda-backend.onrender.com/api): " VITE_API_URL
if [ -n "$VITE_API_URL" ]; then
    gh secret set VITE_API_URL --body "$VITE_API_URL" -R "$REPO"
    echo -e "${GREEN}✅ VITE_API_URL configurado${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✅ Configuração concluída!${NC}"
echo "=========================================="
echo ""
echo "Próximos passos:"
echo "1. Faça um push para main ou develop"
echo "2. Acesse GitHub → Actions"
echo "3. Acompanhe o build automático"
echo ""
echo "Para mais informações, consulte: .github/CI_CD_SETUP.md"
