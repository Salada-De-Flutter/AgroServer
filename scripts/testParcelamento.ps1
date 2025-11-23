# Script PowerShell para testar a rota de parcelamento

$url = "http://localhost:3000/api/parcelamento"
$body = @{
    id = "3ef2fc4b-8459-4270-822d-b6dc9dc61369"
} | ConvertTo-Json

Write-Host "`n🧪 TESTANDO ROTA DE PARCELAMENTO" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n"
Write-Host "📤 URL: $url" -ForegroundColor Yellow
Write-Host "📦 Body: $body`n" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n"

try {
    $response = Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType "application/json"
    
    Write-Host "✅ RESPOSTA DA API:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
    Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n"
    Write-Host "✅ Teste concluído com sucesso!`n" -ForegroundColor Green
}
catch {
    Write-Host "`n❌ ERRO NO TESTE:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        Write-Host "Resposta: $responseBody" -ForegroundColor Red
    }
    Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n"
}
