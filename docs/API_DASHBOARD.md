# 📊 API de Dashboard - Documentação

## Visão Geral

Endpoint completo para obter todas as métricas do dashboard em uma única requisição otimizada.

**Endpoint:** `POST /api/dashboard/metricas`

**Performance:** < 500ms (com cache de 5 minutos recomendado no frontend)

---

## 🔐 Autenticação

Requer `usuario_id` válido no body da requisição.

---

## 📥 Request

### Body Parameters

| Campo | Tipo | Obrigatório | Descrição | Padrão |
|-------|------|-------------|-----------|--------|
| `usuario_id` | `string (uuid)` | ✅ Sim | ID do usuário | - |
| `data_inicio` | `string (date)` | ❌ Não | Data inicial (YYYY-MM-DD) | Primeiro dia do mês atual |
| `data_fim` | `string (date)` | ❌ Não | Data final (YYYY-MM-DD) | Hoje |

### Exemplo de Request

```json
{
  "usuario_id": "550e8400-e29b-41d4-a716-446655440000",
  "data_inicio": "2025-01-01",
  "data_fim": "2025-12-31"
}
```

---

## 📤 Response

### Estrutura Completa

```json
{
  "success": true,
  "data": {
    "metricasFinanceiras": {
      "faturamentoTotal": 150000.00,
      "receitaRecebida": 95000.00,
      "receitaAReceber": 35000.00,
      "receitaVencida": 20000.00,
      "taxaInadimplencia": 13.333
    },
    "indicadoresOperacionais": {
      "totalClientes": 87,
      "novosClientesMes": 12,
      "totalVendas": 145,
      "totalRotas": 8,
      "totalVendedores": 5,
      "ticketMedio": 1724.14
    },
    "analiseParcelas": {
      "pagas": {
        "quantidade": 320,
        "valor": 95000.00
      },
      "aVencer": {
        "quantidade": 120,
        "valor": 35000.00
      },
      "vencidas": {
        "quantidade": 45,
        "valor": 20000.00
      }
    },
    "alertas": {
      "parcelasVencendoHoje": 8,
      "clientesAtraso30Dias": 5,
      "maioresDevedores": [
        {
          "clienteId": "cus_000005116116",
          "nomeCliente": "João Silva",
          "valorDevido": 15000.00
        }
      ]
    }
  },
  "performance": {
    "tempoProcessamento": "250ms",
    "timestamp": "2025-12-05T10:30:00Z"
  }
}
```

---

## 📊 Métricas Detalhadas

### 💰 Métricas Financeiras

| Métrica | Descrição | Cálculo |
|---------|-----------|---------|
| `faturamentoTotal` | Valor total de todas as parcelas | `SUM(todas as parcelas)` |
| `receitaRecebida` | Valor recebido (parcelas pagas) | `SUM(status = RECEIVED/CONFIRMED/RECEIVED_IN_CASH)` |
| `receitaAReceber` | Valor a receber (não vencido) | `SUM(data_vencimento > hoje AND não pago)` |
| `receitaVencida` | Valor em atraso | `SUM(data_vencimento <= hoje AND não pago)` |
| `taxaInadimplencia` | Taxa de inadimplência (%) | `(vencida / (recebida + vencida)) * 100` |

### 📈 Indicadores Operacionais

| Indicador | Descrição | Cálculo |
|-----------|-----------|---------|
| `totalClientes` | Clientes com cobranças | `COUNT DISTINCT(cliente_id)` |
| `novosClientesMes` | Novos clientes no mês | `COUNT(created_at >= início do mês)` |
| `totalVendas` | Total de parcelamentos | `COUNT DISTINCT(parcelamento_id)` |
| `totalRotas` | Rotas ativas | `COUNT(data_termino IS NULL)` |
| `totalVendedores` | Vendedores ativos | `COUNT DISTINCT(vendedor_id em rotas ativas)` |
| `ticketMedio` | Ticket médio por venda | `faturamentoTotal / totalVendas` |

### 📦 Análise de Parcelas

Categoriza todas as parcelas em 3 status:

- **Pagas**: `status IN ('RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH')`
- **A Vencer**: `data_vencimento > hoje AND não paga`
- **Vencidas**: `data_vencimento <= hoje AND não paga`

### 🚨 Alertas

| Alerta | Descrição | Limite |
|--------|-----------|--------|
| `parcelasVencendoHoje` | Parcelas com vencimento hoje | - |
| `clientesAtraso30Dias` | Clientes com atraso > 30 dias | 30 dias |
| `maioresDevedores` | Top 10 clientes por valor vencido | 10 |

---

## 🧪 Como Testar

### 1. Via Script Node.js

```bash
node scripts/testDashboardAPI.js
```

### 2. Via HTTP File (VS Code REST Client)

Abra o arquivo `scripts/testDashboard.http` e execute as requisições.

### 3. Via cURL

```bash
curl -X POST http://localhost:3000/api/dashboard/metricas \
  -H "Content-Type: application/json" \
  -d '{"usuario_id":"550e8400-e29b-41d4-a716-446655440000"}'
```

### 4. Via Swagger UI

Acesse: `http://localhost:3000/api-docs`

Procure por: **Dashboard → POST /api/dashboard/metricas**

---

## ⚡ Performance

### Otimizações Implementadas

1. **Queries Paralelas**: 4 queries executadas simultaneamente com `Promise.all()`
2. **Queries Otimizadas**: Uso de `FILTER` e agregações em uma única query por seção
3. **Índices**: Aproveita índices em `data_criacao`, `data_vencimento`, `status`
4. **Tempo Esperado**: 200-400ms dependendo do volume de dados

### Recomendações de Cache

```javascript
// Frontend - Exemplo com React Query
const { data } = useQuery(
  ['dashboard-metrics', periodo],
  () => fetchMetricas(periodo),
  {
    staleTime: 5 * 60 * 1000, // 5 minutos
    cacheTime: 10 * 60 * 1000, // 10 minutos
  }
);
```

---

## 🎯 Casos de Uso

### Dashboard Principal

```javascript
// Carregar métricas do mês atual
const response = await fetch('/api/dashboard/metricas', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    usuario_id: currentUser.id
  })
});
```

### Relatório Personalizado

```javascript
// Relatório de um período específico
const response = await fetch('/api/dashboard/metricas', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    usuario_id: currentUser.id,
    data_inicio: '2025-01-01',
    data_fim: '2025-03-31'
  })
});
```

---

## ⚠️ Considerações Importantes

### Valores Monetários
- Sempre retornados como `number` (não string)
- Formatados com 2 casas decimais
- Nunca retorna `null` (retorna `0` se não houver dados)

### Datas
- Formato ISO 8601: `YYYY-MM-DD`
- Timezone: considera data do servidor
- Comparações: `>` para futuro, `<=` para vencido

### Taxa de Inadimplência
- Formatada com 3 casas decimais
- Fórmula: `(vencido / (recebido + vencido)) * 100`
- Retorna `0` se não houver base de cálculo

### Status de Pagamento
Considera como **PAGO** os seguintes status:
- `RECEIVED` - Recebido
- `CONFIRMED` - Confirmado
- `RECEIVED_IN_CASH` - Recebido em dinheiro

---

## 🐛 Tratamento de Erros

### 400 - Bad Request

```json
{
  "success": false,
  "message": "usuario_id é obrigatório"
}
```

### 500 - Internal Server Error

```json
{
  "success": false,
  "message": "Erro ao calcular métricas do dashboard",
  "error": "Connection timeout"
}
```

---

## 📚 Links Úteis

- **Swagger UI**: http://localhost:3000/api-docs
- **Código Fonte**: `src/routes/dashboardRoutes.js`
- **Documentação Swagger**: `src/docs/swagger/dashboardRoutes.swagger.js`
- **Script de Teste**: `scripts/testDashboardAPI.js`
- **HTTP Tests**: `scripts/testDashboard.http`

---

## 🔄 Changelog

### v1.0.0 (2025-12-05)
- ✅ Implementação inicial do endpoint
- ✅ Documentação Swagger completa
- ✅ Queries otimizadas com Promise.all
- ✅ Tratamento de valores zerados
- ✅ Cálculo de taxa de inadimplência
- ✅ Top 10 maiores devedores
- ✅ Scripts de teste automatizados
