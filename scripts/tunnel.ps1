# Ejecuta build + servidor + Cloudflare Tunnel en un solo comando.
# Uso: .\scripts\tunnel.ps1
# cloudflared: en Windows se puede descargar solo al arrancar el tunnel (ver README).

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "Instalando dependencias si hace falta..." -ForegroundColor Cyan
npm install

Write-Host "`nIniciando build, servidor y tunnel (Ctrl+C detiene todo)...`n" -ForegroundColor Green
npm run tunnel:all
