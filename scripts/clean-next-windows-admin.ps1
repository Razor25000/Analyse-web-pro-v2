# Script PowerShell pour nettoyer .next sur Windows
# À exécuter en tant qu'administrateur

$nextDir = "$PSScriptRoot\..\.next"

Write-Host "🧹 Nettoyage forcé du dossier .next..." -ForegroundColor Yellow

if (Test-Path $nextDir) {
    # Arrêter tous les processus Node.js qui pourraient bloquer
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

    # Attendre un peu
    Start-Sleep -Seconds 1

    # Supprimer avec force
    try {
        Remove-Item -Path $nextDir -Recurse -Force -ErrorAction Stop
        Write-Host "✅ Dossier .next supprimé avec succès" -ForegroundColor Green
    } catch {
        Write-Host "❌ Erreur: $_" -ForegroundColor Red
        Write-Host "💡 Essai avec takeown..." -ForegroundColor Yellow

        # Prendre possession et donner tous les droits
        takeown /f $nextDir /r /d y 2>&1 | Out-Null
        icacls $nextDir /grant everyone:F /t 2>&1 | Out-Null

        # Réessayer la suppression
        Remove-Item -Path $nextDir -Recurse -Force -ErrorAction Stop
        Write-Host "✅ Dossier .next supprimé après prise de contrôle" -ForegroundColor Green
    }
} else {
    Write-Host "✅ Le dossier .next n'existe pas" -ForegroundColor Green
}

Write-Host "🎯 Nettoyage terminé" -ForegroundColor Cyan
