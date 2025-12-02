# ============================================
# SCRIPT DE TESTE - WEBHOOK ASAAS
# Testa o endpoint do webhook localmente
# ============================================

$serverUrl = "http://localhost:3000"
$webhookEndpoint = "$serverUrl/api/webhook/asaas"

Write-Host "🧪 TESTANDO WEBHOOK DO ASAAS" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Verifica se o servidor está rodando
Write-Host "1️⃣ Verificando se servidor está rodando..." -ForegroundColor Yellow
try {
    $healthCheck = Invoke-RestMethod -Uri "$serverUrl/health" -Method Get
    Write-Host "   ✅ Servidor está rodando!" -ForegroundColor Green
    Write-Host "   Status: $($healthCheck.status)" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "   ❌ Servidor não está rodando!" -ForegroundColor Red
    Write-Host "   Inicie o servidor com: npm start" -ForegroundColor Yellow
    exit 1
}

# Testa eventos diferentes
$eventos = @(
    @{
        nome = "PAYMENT_RECEIVED"
        payload = @{
            event = "PAYMENT_RECEIVED"
            payment = @{
                id = "pay_test_$(Get-Random -Maximum 9999)"
                customer = "cus_test_001"
                billingType = "PIX"
                value = 150.00
                status = "RECEIVED"
                dueDate = "2024-01-15"
                description = "Teste de pagamento recebido via PIX"
                invoiceUrl = "https://sandbox.asaas.com/i/teste123"
            }
        }
    },
    @{
        nome = "PAYMENT_CONFIRMED"
        payload = @{
            event = "PAYMENT_CONFIRMED"
            payment = @{
                id = "pay_test_$(Get-Random -Maximum 9999)"
                customer = "cus_test_002"
                billingType = "CREDIT_CARD"
                value = 250.00
                status = "CONFIRMED"
                dueDate = "2024-01-20"
                description = "Teste de pagamento confirmado via cartão"
                invoiceUrl = "https://sandbox.asaas.com/i/teste456"
            }
        }
    },
    @{
        nome = "PAYMENT_OVERDUE"
        payload = @{
            event = "PAYMENT_OVERDUE"
            payment = @{
                id = "pay_test_$(Get-Random -Maximum 9999)"
                customer = "cus_test_003"
                billingType = "BOLETO"
                value = 100.00
                status = "OVERDUE"
                dueDate = "2024-01-01"
                description = "Teste de pagamento vencido"
                invoiceUrl = "https://sandbox.asaas.com/i/teste789"
            }
        }
    }
)

Write-Host "2️⃣ Enviando eventos de teste..." -ForegroundColor Yellow
Write-Host ""

$sucessos = 0
$falhas = 0

foreach ($evento in $eventos) {
    $nomeEvento = $evento.nome
    $paymentId = $evento.payload.payment.id
    
    Write-Host "   📤 Enviando: $nomeEvento (ID: $paymentId)" -ForegroundColor Cyan
    
    try {
        $body = $evento.payload | ConvertTo-Json -Depth 10
        
        $response = Invoke-WebRequest `
            -Uri $webhookEndpoint `
            -Method Post `
            -ContentType "application/json" `
            -Body $body `
            -UseBasicParsing
        
        if ($response.StatusCode -eq 200) {
            Write-Host "   ✅ Evento processado com sucesso!" -ForegroundColor Green
            $sucessos++
        } else {
            Write-Host "   ⚠️  Status inesperado: $($response.StatusCode)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "   ❌ Erro ao enviar evento: $($_.Exception.Message)" -ForegroundColor Red
        $falhas++
    }
    
    Write-Host ""
    Start-Sleep -Milliseconds 500
}

# Resumo
Write-Host "================================" -ForegroundColor Cyan
Write-Host "📊 RESUMO DOS TESTES" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host "✅ Sucessos: $sucessos" -ForegroundColor Green
Write-Host "❌ Falhas: $falhas" -ForegroundColor Red
Write-Host ""

# Consulta ao banco
Write-Host "3️⃣ Para verificar os eventos no banco de dados, execute:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   SELECT id, evento, recebido_em " -ForegroundColor Gray
Write-Host "   FROM webhook_eventos " -ForegroundColor Gray
Write-Host "   ORDER BY recebido_em DESC " -ForegroundColor Gray
Write-Host "   LIMIT 10;" -ForegroundColor Gray
Write-Host ""

Write-Host "   SELECT * FROM clientes WHERE id LIKE 'cus_test%';" -ForegroundColor Gray
Write-Host ""

Write-Host "   SELECT * FROM cobrancas WHERE id LIKE 'pay_test%';" -ForegroundColor Gray
Write-Host ""

Write-Host "✅ Teste concluído!" -ForegroundColor Green
