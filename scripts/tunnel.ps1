# Ejecuta build + servidor + Cloudflare Tunnel en un solo comando.
# Uso: .\scripts\tunnel.ps1
# Requisito: cloudflared (cloudflared.exe en la raíz del repo o en PATH)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "Instalando dependencias si hace falta..." -ForegroundColor Cyan
npm install

Write-Host "`nIniciando build, servidor y tunnel (Ctrl+C detiene todo)...`n" -ForegroundColor Green
npm run tunnel:all
