# Script PowerShell pour supprimer un utilisateur de la BDD Prisma
# Usage: .\scripts\delete-user.ps1

Write-Host "🗑️  Suppression de l'utilisateur redjice@gmail.com" -ForegroundColor Yellow
Write-Host ""

# Vérifier que nous sommes dans le bon répertoire
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Erreur: Veuillez exécuter ce script depuis la racine du projet" -ForegroundColor Red
    exit 1
}

# Vérifier que node_modules existe
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installation des dépendances..." -ForegroundColor Cyan
    pnpm install
}

# Exécuter le script TypeScript
Write-Host "🚀 Exécution du script de suppression..." -ForegroundColor Cyan
Write-Host ""

pnpm tsx scripts/delete-user-direct.ts

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Opération terminée avec succès!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Une erreur s'est produite" -ForegroundColor Red
    exit 1
}
