# 🔗 Sistema de Webhooks do Asaas

## 📋 Visão Geral

O sistema de webhooks permite sincronização automática dos dados de pagamentos entre o Asaas e o banco de dados local, sem necessidade de polling ou consultas periódicas.

## 🚀 Como Funciona

1. **Servidor inicia** → Verifica se webhook existe no Asaas
2. **Webhook não existe** → Cria automaticamente com todos os eventos de pagamento
3. **Asaas detecta evento** (pagamento criado, confirmado, recebido, etc.) → Envia POST para sua URL
4. **Servidor recebe webhook** → Processa e sincroniza dados no banco

## ⚙️ Configuração

### 1. Configure a URL Pública do Servidor

No arquivo `.env`, adicione:

```env
SERVER_URL=https://seu-servidor.com
```

**Opções de URL:**

- **Produção (Render, Heroku, etc.):**
  ```
  SERVER_URL=https://agroserver-it9g.onrender.com
  ```

- **Desenvolvimento Local (com ngrok):**
  ```
  SERVER_URL=https://abc123.ngrok.io
  ```
  
  Para usar ngrok:
  ```bash
  # Instale o ngrok
  choco install ngrok  # Windows
  
  # Execute o túnel
  ngrok http 3000
  
  # Copie a URL HTTPS fornecida (ex: https://abc123.ngrok.io)
  ```

### 2. Verifique as Credenciais do Asaas

Certifique-se de que `ASAAS_API_KEY` está configurada no `.env`:

```env
ASAAS_API_KEY=sua_chave_api_aqui
```

### 3. Inicie o Servidor

```bash
npm start
```

O servidor irá:
- ✅ Testar conexão com banco de dados
- ✅ Testar conexão com Asaas
- ✅ Verificar/criar webhook automaticamente

Você verá logs assim:

```
🚀 Servidor rodando na porta 3000
📍 Ambiente: development

🔍 Testando conexão com o banco de dados...
✅ Banco de dados conectado com sucesso!

🔍 Testando conexão com Asaas...
✅ Asaas conectado com sucesso!

🔗 Configurando webhook do Asaas...
✅ Webhook criado com sucesso!
   🔗 URL: https://seu-servidor.com/api/webhook/asaas
   📋 Nome: AgroServer - Eventos de Pagamento
   📊 Eventos: 13 eventos configurados
```

## 📊 Eventos Monitorados

O webhook está configurado para receber TODOS os eventos de pagamento:

- `PAYMENT_CREATED` - Pagamento criado
- `PAYMENT_UPDATED` - Pagamento atualizado
- `PAYMENT_CONFIRMED` - Pagamento confirmado
- `PAYMENT_RECEIVED` - Pagamento recebido
- `PAYMENT_RECEIVED_IN_CASH` - Pagamento recebido em dinheiro
- `PAYMENT_OVERDUE` - Pagamento vencido
- `PAYMENT_DELETED` - Pagamento deletado
- `PAYMENT_RESTORED` - Pagamento restaurado
- `PAYMENT_REFUNDED` - Pagamento reembolsado
- `PAYMENT_PARTIALLY_REFUNDED` - Pagamento parcialmente reembolsado
- `PAYMENT_ANTICIPATED` - Pagamento antecipado
- `PAYMENT_AWAITING_RISK_ANALYSIS` - Aguardando análise de risco
- `PAYMENT_APPROVED_BY_RISK_ANALYSIS` - Aprovado pela análise de risco

## 🗄️ Estrutura do Banco de Dados

### Tabela: `webhook_eventos`

Armazena todos os eventos recebidos do Asaas:

```sql
CREATE TABLE webhook_eventos (
  id SERIAL PRIMARY KEY,
  evento VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  recebido_em TIMESTAMP DEFAULT NOW()
);
```

### Sincronização Automática

Quando um evento é recebido:

1. **Registra o evento** na tabela `webhook_eventos`
2. **Sincroniza cliente** (INSERT ou UPDATE na tabela `clientes`)
3. **Sincroniza cobrança** (INSERT ou UPDATE na tabela `cobrancas`)

## 🧪 Testando o Webhook

### Teste Manual via cURL

```bash
curl -X POST http://localhost:3000/api/webhook/asaas \
  -H "Content-Type: application/json" \
  -d '{
    "event": "PAYMENT_RECEIVED",
    "payment": {
      "id": "pay_test123",
      "customer": "cus_test123",
      "billingType": "PIX",
      "value": 150.00,
      "status": "RECEIVED",
      "dueDate": "2024-01-15",
      "description": "Teste de webhook",
      "invoiceUrl": "https://exemplo.com"
    }
  }'
```

### Verificar Logs no Banco

```sql
-- Ver todos os eventos recebidos
SELECT * FROM webhook_eventos ORDER BY recebido_em DESC LIMIT 10;

-- Ver clientes sincronizados
SELECT * FROM clientes ORDER BY criado_em DESC LIMIT 10;

-- Ver cobranças sincronizadas
SELECT * FROM cobrancas ORDER BY criado_em DESC LIMIT 10;
```

### Testar com Sandbox do Asaas

1. Acesse o [Dashboard do Asaas](https://www.asaas.com/)
2. Vá em **Configurações → Webhooks**
3. Verifique se o webhook foi criado automaticamente
4. Crie um pagamento de teste no sandbox
5. Verifique os logs do servidor e do banco de dados

## 📝 Endpoint do Webhook

### POST `/api/webhook/asaas`

Recebe eventos do Asaas e sincroniza dados.

**Request Body (enviado pelo Asaas):**

```json
{
  "event": "PAYMENT_RECEIVED",
  "payment": {
    "id": "pay_123456",
    "customer": "cus_789012",
    "billingType": "PIX",
    "value": 150.00,
    "status": "RECEIVED",
    "dueDate": "2024-01-15",
    "description": "Venda #123",
    "invoiceUrl": "https://sandbox.asaas.com/i/abc123"
  }
}
```

**Response:**

```json
"OK"
```

**Status Codes:**

- `200 OK` - Evento processado com sucesso
- `500 Internal Server Error` - Erro ao processar evento

## 🔧 Arquivos do Sistema

```
src/
├── routes/
│   └── webhookRoutes.js          # Endpoint POST /webhook/asaas
├── services/
│   └── webhookService.js         # Gerenciamento de webhooks via API
└── server.js                     # Auto-criação do webhook no startup
```

## 🐛 Troubleshooting

### Webhook não foi criado

**Sintoma:** Log mostra `⚠️ SERVER_URL não configurada no .env`

**Solução:** Adicione `SERVER_URL` no arquivo `.env`

---

### Eventos não estão sendo recebidos

**Verificações:**

1. Servidor está rodando e acessível publicamente?
   ```bash
   curl https://seu-servidor.com/health
   ```

2. Webhook existe no Asaas?
   - Acesse Dashboard → Configurações → Webhooks

3. URL do webhook está correta?
   - Deve ser `https://seu-servidor.com/api/webhook/asaas`

4. Firewall bloqueando requests do Asaas?
   - IPs do Asaas: consulte documentação oficial

---

### Erro ao sincronizar dados

**Sintoma:** Log mostra `❌ Erro ao processar webhook`

**Verificações:**

1. Tabelas existem no banco?
   ```sql
   SELECT * FROM clientes LIMIT 1;
   SELECT * FROM cobrancas LIMIT 1;
   SELECT * FROM webhook_eventos LIMIT 1;
   ```

2. Estrutura das tabelas está correta?
   - Verifique se as colunas batem com o código em `webhookRoutes.js`

3. Conexão com banco está ok?
   ```bash
   curl http://localhost:3000/api/database/test
   ```

---

### Webhook duplicado no Asaas

**Sintoma:** Múltiplos webhooks com a mesma URL

**Solução:** O sistema já verifica URLs duplicadas, mas se houver:

1. Acesse Dashboard → Configurações → Webhooks
2. Delete webhooks duplicados manualmente
3. Reinicie o servidor (ele criará apenas 1)

## 📚 Referências

- [Documentação Oficial Asaas - Webhooks](https://docs.asaas.com/reference/webhooks)
- [Eventos de Pagamento](https://docs.asaas.com/reference/eventos-de-cobranca)
- [API de Webhooks](https://docs.asaas.com/reference/webhooks-1)

## 💡 Próximos Passos

- [ ] Implementar autenticação do webhook (authToken)
- [ ] Criar handlers específicos para cada tipo de evento
- [ ] Adicionar retry logic para falhas no banco
- [ ] Criar painel admin para visualizar eventos
- [ ] Implementar alertas para falhas no webhook
- [ ] Adicionar suporte para outros tipos de evento (SUBSCRIPTION, INVOICE, etc.)
