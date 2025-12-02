# ✅ WEBHOOK SYSTEM - IMPLEMENTAÇÃO COMPLETA

## 📦 O que foi implementado

### 1. **Rotas do Webhook** (`src/routes/webhookRoutes.js`)
- Endpoint: `POST /api/webhook/asaas`
- Funcionalidades:
  - ✅ Recebe eventos do Asaas
  - ✅ Registra todos os eventos na tabela `webhook_eventos`
  - ✅ Sincroniza dados do cliente (upsert)
  - ✅ Sincroniza dados da cobrança (upsert)
  - ✅ Retorna status 200 para o Asaas
  - ✅ Tratamento de erros com logs detalhados

### 2. **Serviço de Webhook** (`src/services/webhookService.js`)
- Funcionalidades:
  - ✅ `ensureWebhookExists()` - Verifica e cria webhook automaticamente
  - ✅ `listWebhooks()` - Lista webhooks configurados
  - ✅ `createWebhook()` - Cria novo webhook via API
  - ✅ Subscreve TODOS os eventos de pagamento (13 eventos)
  - ✅ Previne duplicatas (verifica URL antes de criar)

### 3. **Integração no Servidor** (`src/server.js`)
- Funcionalidades:
  - ✅ Chama `setupAsaasWebhook()` no startup
  - ✅ Logs informativos sobre criação/existência do webhook
  - ✅ Validação de `SERVER_URL` obrigatória
  - ✅ Continua funcionando mesmo se webhook falhar

### 4. **Rotas Registradas** (`src/routes/index.js`)
- ✅ Webhook routes adicionadas: `router.use('/webhook', webhookRoutes)`

### 5. **Configuração** (`.env.example`)
- ✅ Variável `SERVER_URL` documentada
- ✅ Exemplos de uso (produção e desenvolvimento)
- ✅ Instruções sobre ngrok para testes locais

### 6. **Documentação** (`docs/WEBHOOKS.md`)
- ✅ Guia completo de configuração
- ✅ Explicação do fluxo de funcionamento
- ✅ Lista de todos os eventos monitorados
- ✅ Estrutura do banco de dados
- ✅ Exemplos de teste (cURL, SQL)
- ✅ Troubleshooting detalhado

### 7. **README Atualizado**
- ✅ Seção sobre sistema de webhooks
- ✅ Endpoint documentado
- ✅ Link para documentação completa

---

## 🚀 COMO TESTAR AGORA

### **Passo 1: Configure a URL do Servidor**

Edite o arquivo `.env` e adicione:

```env
SERVER_URL=https://seu-servidor-publico.com
```

**Opções:**

- **Produção (se já estiver em Render/Heroku):**
  ```env
  SERVER_URL=https://agroserver-it9g.onrender.com
  ```

- **Desenvolvimento Local (com ngrok):**
  
  Instale o ngrok:
  ```powershell
  choco install ngrok
  ```
  
  Execute o túnel:
  ```powershell
  ngrok http 3000
  ```
  
  Copie a URL HTTPS fornecida:
  ```env
  SERVER_URL=https://abc123.ngrok.io
  ```

### **Passo 2: Inicie o Servidor**

```powershell
npm start
```

### **Passo 3: Verifique os Logs**

Você deve ver algo assim:

```
🚀 Servidor rodando na porta 3000
📍 Ambiente: development

🔍 Testando conexão com o banco de dados...
✅ Banco de dados conectado com sucesso!

🔍 Testando conexão com Asaas...
✅ Asaas conectado com sucesso!
   📧 Conta: seu-email@exemplo.com
   👤 Nome: Sua Empresa

🔗 Configurando webhook do Asaas...
✅ Webhook criado com sucesso!
   🔗 URL: https://seu-servidor.com/api/webhook/asaas
   📋 Nome: AgroServer - Eventos de Pagamento
   📊 Eventos: 13 eventos configurados
```

Se o webhook já existir:
```
✅ Webhook já existe!
   🔗 URL: https://seu-servidor.com/api/webhook/asaas
```

### **Passo 4: Teste Manual**

Envie um evento de teste:

```powershell
curl -X POST http://localhost:3000/api/webhook/asaas -H "Content-Type: application/json" -d '{ \"event\": \"PAYMENT_RECEIVED\", \"payment\": { \"id\": \"pay_test123\", \"customer\": \"cus_test123\", \"billingType\": \"PIX\", \"value\": 150.00, \"status\": \"RECEIVED\", \"dueDate\": \"2024-01-15\", \"description\": \"Teste\", \"invoiceUrl\": \"https://exemplo.com\" } }'
```

### **Passo 5: Verifique no Banco de Dados**

Conecte ao banco e execute:

```sql
-- Ver eventos recebidos
SELECT * FROM webhook_eventos ORDER BY recebido_em DESC LIMIT 5;

-- Ver clientes sincronizados
SELECT * FROM clientes WHERE id = 'cus_test123';

-- Ver cobranças sincronizadas
SELECT * FROM cobrancas WHERE id = 'pay_test123';
```

### **Passo 6: Teste Real com Asaas**

1. Acesse o [Dashboard do Asaas](https://www.asaas.com/)
2. Vá em **Configurações → Webhooks**
3. Verifique se o webhook foi criado automaticamente
4. Crie um pagamento de teste (ou atualize um existente)
5. Observe os logs do servidor
6. Verifique a tabela `webhook_eventos` no banco

---

## 🔍 VERIFICAÇÕES IMPORTANTES

### ✅ Webhook foi criado no Asaas?

Acesse: https://www.asaas.com/config/webhooks

Deve existir um webhook com:
- **Nome:** "AgroServer - Eventos de Pagamento"
- **URL:** `https://seu-servidor.com/api/webhook/asaas`
- **Status:** Ativo
- **Eventos:** 13 eventos de pagamento

### ✅ Endpoint está funcionando?

Teste o health check:

```powershell
curl http://localhost:3000/health
```

Resposta esperada:
```json
{"status":"OK","message":"API está funcionando!"}
```

### ✅ Banco de dados tem a tabela webhook_eventos?

Execute no banco:

```sql
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'webhook_eventos'
);
```

Se retornar `false`, crie a tabela:

```sql
CREATE TABLE webhook_eventos (
  id SERIAL PRIMARY KEY,
  evento VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  recebido_em TIMESTAMP DEFAULT NOW()
);
```

---

## 📊 EVENTOS MONITORADOS

O webhook está configurado para receber:

1. ✅ `PAYMENT_CREATED` - Pagamento criado
2. ✅ `PAYMENT_UPDATED` - Pagamento atualizado
3. ✅ `PAYMENT_CONFIRMED` - Pagamento confirmado
4. ✅ `PAYMENT_RECEIVED` - Pagamento recebido
5. ✅ `PAYMENT_RECEIVED_IN_CASH` - Recebido em dinheiro
6. ✅ `PAYMENT_OVERDUE` - Pagamento vencido
7. ✅ `PAYMENT_DELETED` - Pagamento deletado
8. ✅ `PAYMENT_RESTORED` - Pagamento restaurado
9. ✅ `PAYMENT_REFUNDED` - Pagamento reembolsado
10. ✅ `PAYMENT_PARTIALLY_REFUNDED` - Reembolso parcial
11. ✅ `PAYMENT_ANTICIPATED` - Pagamento antecipado
12. ✅ `PAYMENT_AWAITING_RISK_ANALYSIS` - Aguardando análise
13. ✅ `PAYMENT_APPROVED_BY_RISK_ANALYSIS` - Aprovado

---

## 🎯 FLUXO COMPLETO

```
1. Servidor inicia
   └─> setupAsaasWebhook() é chamado

2. Verifica se SERVER_URL existe
   ├─> ❌ Não existe: Log de aviso, webhook não é criado
   └─> ✅ Existe: Continua

3. Lista webhooks via GET /v3/webhooks
   └─> Procura por webhook com URL igual a SERVER_URL/api/webhook/asaas

4. Webhook não existe?
   └─> Cria via POST /v3/webhooks com 13 eventos

5. Asaas detecta evento de pagamento
   └─> Envia POST /api/webhook/asaas

6. Servidor recebe webhook
   ├─> Registra em webhook_eventos
   ├─> Sincroniza cliente (upsert)
   ├─> Sincroniza cobrança (upsert)
   └─> Retorna 200 OK

7. Dados atualizados automaticamente!
```

---

## 🐛 PROBLEMAS COMUNS

### ❌ "SERVER_URL não configurada"

**Solução:** Adicione no `.env`:
```env
SERVER_URL=https://seu-servidor.com
```

### ❌ "Erro ao configurar webhook"

**Causas possíveis:**
- ASAAS_API_KEY inválida
- Sem conexão com internet
- URL mal formatada

**Solução:** Verifique as credenciais e conexão.

### ❌ Eventos não chegam

**Verificações:**
1. Webhook existe no dashboard do Asaas?
2. Servidor está acessível publicamente?
3. URL está correta (deve ser HTTPS em produção)?
4. Firewall bloqueando requisições?

---

## 📚 PRÓXIMOS PASSOS

Melhorias futuras:

- [ ] Implementar autenticação do webhook (authToken do Asaas)
- [ ] Criar handlers específicos para cada tipo de evento
- [ ] Adicionar retry logic para falhas no banco
- [ ] Criar painel admin para visualizar eventos
- [ ] Implementar alertas para webhooks que falharem
- [ ] Adicionar suporte para eventos de assinatura (SUBSCRIPTION_*)
- [ ] Implementar rate limiting no endpoint do webhook
- [ ] Adicionar validação de IP de origem (IPs do Asaas)

---

## 🎉 RESULTADO FINAL

Com essa implementação, você tem:

✅ **Sincronização automática** de clientes e cobranças  
✅ **Sem polling** - eventos em tempo real  
✅ **Auto-configuração** - webhook criado automaticamente  
✅ **Registro completo** - todos os eventos salvos  
✅ **Pronto para produção** - tratamento de erros e logs  
✅ **Documentação completa** - guias e exemplos  

**Agora o sistema está 100% funcional e pronto para uso!** 🚀
