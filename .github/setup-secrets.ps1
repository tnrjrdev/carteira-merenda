# Script para auxiliar na configuração de secrets do GitHub para CI/CD (Windows)
# Uso: powershell -ExecutionPolicy Bypass -File .github/setup-secrets.ps1

Write-Host "==========================================" -ForegroundColor Green
Write-Host "🔐 GitHub Secrets Configuration Helper" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""

# Check if GitHub CLI is installed
$ghCheck = cmd /c where gh 2>$null
if (-not $ghCheck) {
    Write-Host "❌ GitHub CLI não está instalado" -ForegroundColor Red
    Write-Host "Instale em: https://cli.github.com/" -ForegroundColor Yellow
    exit 1
}

# Check if authenticated
$authStatus = gh auth status 2>&1
if ($authStatus -match "not authenticated") {
    Write-Host "❌ Você não está autenticado no GitHub" -ForegroundColor Red
    Write-Host "Execute: gh auth login" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ GitHub CLI autenticado" -ForegroundColor Green
Write-Host ""

# Get repository
try {
    $repo = gh repo view --json nameWithOwner -q . 2>$null
    if (-not $repo) {
        Write-Host "❌ Não foi possível determinar o repositório" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Não foi possível determinar o repositório" -ForegroundColor Red
    exit 1
}

Write-Host "📦 Repositório: $repo" -ForegroundColor Yellow
Write-Host ""

# Function to set secret
function Set-GitHubSecret {
    param(
        [string]$SecretName,
        [string]$SecretValue,
        [string]$Repository
    )
    
    if ($SecretValue) {
        $SecretValue | gh secret set $SecretName -R $Repository
        Write-Host "✅ $SecretName configurado" -ForegroundColor Green
    }
}

# Backend Secrets
Write-Host "==========================================" -ForegroundColor Yellow
Write-Host "Backend (Render)" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Yellow
Write-Host ""

$renderServiceId = Read-Host "RENDER_SERVICE_ID (encontre em Render → Service → Settings)"
Set-GitHubSecret -SecretName "RENDER_SERVICE_ID" -SecretValue $renderServiceId -Repository $repo

$renderApiKey = Read-Host "RENDER_API_KEY (encontre em Render → Account Settings → API Keys)" -AsSecureString
$renderApiKeyPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToCoTaskMemUnicode($renderApiKey))
Set-GitHubSecret -SecretName "RENDER_API_KEY" -SecretValue $renderApiKeyPlain -Repository $repo

$renderBackendUrl = Read-Host "RENDER_BACKEND_URL (ex: https://merenda-backend.onrender.com)"
Set-GitHubSecret -SecretName "RENDER_BACKEND_URL" -SecretValue $renderBackendUrl -Repository $repo

Write-Host ""

# Frontend Secrets
Write-Host "==========================================" -ForegroundColor Yellow
Write-Host "Frontend (Vercel)" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Yellow
Write-Host ""

$vercelToken = Read-Host "VERCEL_TOKEN (encontre em Vercel → Settings → Tokens)" -AsSecureString
$vercelTokenPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToCoTaskMemUnicode($vercelToken))
Set-GitHubSecret -SecretName "VERCEL_TOKEN" -SecretValue $vercelTokenPlain -Repository $repo

$vercelOrgId = Read-Host "VERCEL_ORG_ID (encontre em Vercel → Settings → General → Team ID)"
Set-GitHubSecret -SecretName "VERCEL_ORG_ID" -SecretValue $vercelOrgId -Repository $repo

$vercelProjectId = Read-Host "VERCEL_PROJECT_ID (encontre em Vercel → Project Settings → Project ID)"
Set-GitHubSecret -SecretName "VERCEL_PROJECT_ID" -SecretValue $vercelProjectId -Repository $repo

$viteApiUrl = Read-Host "VITE_API_URL (ex: https://merenda-backend.onrender.com/api)"
Set-GitHubSecret -SecretName "VITE_API_URL" -SecretValue $viteApiUrl -Repository $repo

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "✅ Configuração concluída!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Próximos passos:" -ForegroundColor Yellow
Write-Host "1. Faça um push para main ou develop"
Write-Host "2. Acesse GitHub → Actions"
Write-Host "3. Acompanhe o build automático"
Write-Host ""
Write-Host "Para mais informações, consulte: .github/CI_CD_SETUP.md" -ForegroundColor Cyan
