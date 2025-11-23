# Script para instalar o servidor como serviço do Windows usando PM2

Write-Host "`n🔧 Configurando AgroServer como serviço do Windows...`n" -ForegroundColor Cyan

# Verifica se PM2 está instalado globalmente
$pm2Installed = Get-Command pm2 -ErrorAction SilentlyContinue

if (-not $pm2Installed) {
    Write-Host "📦 Instalando PM2 globalmente..." -ForegroundColor Yellow
    npm install -g pm2
    npm install -g pm2-windows-startup
}

# Para qualquer instância em execução
Write-Host "`n🛑 Parando instâncias anteriores..." -ForegroundColor Yellow
pm2 delete agroserver -ErrorAction SilentlyContinue

# Inicia a aplicação com PM2
Write-Host "`n🚀 Iniciando AgroServer com PM2..." -ForegroundColor Green
pm2 start src/server.js --name agroserver --time

# Salva a configuração
Write-Host "`n💾 Salvando configuração do PM2..." -ForegroundColor Green
pm2 save

# Configura para iniciar automaticamente com o Windows
Write-Host "`n⚙️ Configurando inicialização automática..." -ForegroundColor Green
pm2-startup install

Write-Host "`n╔════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✅ SERVIDOR CONFIGURADO COM SUCESSO!     ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════╝`n" -ForegroundColor Green

Write-Host "📋 Comandos úteis:" -ForegroundColor Cyan
Write-Host "  pm2 status          - Ver status do servidor"
Write-Host "  pm2 logs agroserver - Ver logs em tempo real"
Write-Host "  pm2 restart agroserver - Reiniciar servidor"
Write-Host "  pm2 stop agroserver - Parar servidor"
Write-Host "  pm2 start agroserver - Iniciar servidor`n"

# Mostra o status
pm2 status
