# 🚀 Configuração do Webhook no Render

## ✅ Suas Informações

- **URL do Servidor:** `https://agroserver-it9g.onrender.com`
- **Email:** `fluteterd001@gmail.com`
- **Endpoint do Webhook:** `https://agroserver-it9g.onrender.com/api/webhook/asaas`

## 📋 Passo a Passo

### 1. Configure as Variáveis de Ambiente no Render

Acesse o dashboard do Render: https://dashboard.render.com

1. Selecione seu serviço **AgroServer**
2. Vá em **Environment** (no menu lateral)
3. Adicione as seguintes variáveis de ambiente:

```env
WEBHOOK_URL=https://agroserver-it9g.onrender.com/api/webhook/asaas
WEBHOOK_EMAIL=fluteterd001@gmail.com
SERVER_URL=https://agroserver-it9g.onrender.com
```

4. Clique em **Save Changes**

### 2. Faça o Deploy das Alterações

Você tem duas opções:

#### Opção A: Deploy Manual
1. No dashboard do Render, clique em **Manual Deploy**
2. Selecione **Deploy latest commit**
3. Aguarde o deploy completar

#### Opção B: Push para o GitHub (Deploy Automático)
```powershell
git add .
git commit -m "feat: adiciona sistema de webhooks do Asaas"
git push origin main
```

O Render detectará automaticamente e fará o deploy.

### 3. Verifique os Logs

Após o deploy:

1. No dashboard do Render, clique em **Logs**
2. Procure pelas mensagens:

```
🚀 Servidor rodando na porta 10000
📍 Ambiente: production

🔍 Testando conexão com o banco de dados...
✅ Banco de dados conectado com sucesso!

🔍 Testando conexão com Asaas...
✅ Asaas conectado com sucesso!
   📧 Conta: seu-email@asaas.com
   👤 Nome: Sua Empresa

🔗 Configurando webhook do Asaas...
✅ Webhook criado com sucesso!
   🔗 URL: https://agroserver-it9g.onrender.com/api/webhook/asaas
   📋 Nome: AgroServer - Cobranças
   📊 Eventos: 13 eventos configurados
```

Se você vir `✅ Webhook já existe e está ativo`, significa que o webhook já foi criado anteriormente.

### 4. Verifique no Dashboard do Asaas

1. Acesse: https://www.asaas.com/
2. Faça login na sua conta
3. Vá em **Configurações → Integrações → Webhooks**
4. Você deve ver um webhook com:
   - **Nome:** "AgroServer - Cobranças"
   - **URL:** `https://agroserver-it9g.onrender.com/api/webhook/asaas`
   - **Status:** Ativo (✅)
   - **Email:** fluteterd001@gmail.com

### 5. Teste o Webhook

#### Teste Rápido: Crie um Pagamento de Teste

1. No dashboard do Asaas, crie uma nova cobrança de teste
2. Aguarde alguns segundos
3. Verifique os logs do Render - você deve ver:

```
📥 Webhook recebido: PAYMENT_CREATED
   💰 Pagamento: pay_xxxxxxxx
   👤 Cliente: cus_xxxxxxxx
```

#### Verifique no Banco de Dados

Execute no seu banco PostgreSQL (Supabase):

```sql
-- Ver eventos recebidos
SELECT * FROM webhook_eventos ORDER BY recebido_em DESC LIMIT 5;

-- Ver clientes sincronizados
SELECT id, nome, cpf_cnpj FROM clientes ORDER BY criado_em DESC LIMIT 5;

-- Ver cobranças sincronizadas
SELECT id, cliente_id, status, valor FROM cobrancas ORDER BY criado_em DESC LIMIT 5;
```

## ⚙️ Variáveis de Ambiente Completas

No Render, certifique-se de ter TODAS estas variáveis:

```env
# Servidor
PORT=10000
NODE_ENV=production

# URLs e Webhook
SERVER_URL=https://agroserver-it9g.onrender.com
WEBHOOK_URL=https://agroserver-it9g.onrender.com/api/webhook/asaas
WEBHOOK_EMAIL=fluteterd001@gmail.com

# Banco de Dados (Supabase)
DATABASE_URL=postgresql://postgres.vqdmwevdlmqdtfbfceoc:SUA_SENHA@aws-1-sa-east-1.pooler.supabase.com:6543/postgres

# Asaas API
ASAAS_API_KEY=sua_chave_api_aqui
ASAAS_API_URL=https://api.asaas.com/v3
```

## 🐛 Solução de Problemas

### ❌ "WEBHOOK_URL não configurada"

**Solução:** Adicione `WEBHOOK_URL` nas variáveis de ambiente do Render e faça redeploy.

### ❌ "Erro ao configurar webhook: 401 Unauthorized"

**Solução:** Verifique se `ASAAS_API_KEY` está correta.

### ❌ "Webhook não está recebendo eventos"

**Verificações:**

1. Webhook está ativo no dashboard do Asaas?
2. URL está correta (HTTPS obrigatório)?
3. Servidor está rodando sem erros?
4. Tabela `webhook_eventos` existe no banco?

### ❌ "Erro ao sincronizar dados"

**Verificações:**

1. Tabelas `clientes` e `cobrancas` existem?
2. Estrutura das tabelas está correta?
3. Conexão com banco está OK?

Execute o script SQL:
```sql
-- Criar tabela webhook_eventos
\i scripts/create_webhook_eventos_table.sql
```

## 📊 Monitoramento

Para monitorar webhooks em tempo real:

1. **Logs do Render:** https://dashboard.render.com → Seu serviço → Logs
2. **Dashboard Asaas:** https://www.asaas.com/ → Configurações → Webhooks → Ver histórico
3. **Banco de Dados:**
   ```sql
   SELECT evento, COUNT(*) as total 
   FROM webhook_eventos 
   GROUP BY evento 
   ORDER BY total DESC;
   ```

## ✅ Checklist Final

- [ ] Variáveis de ambiente configuradas no Render
- [ ] Deploy realizado com sucesso
- [ ] Logs mostram "✅ Webhook criado com sucesso!"
- [ ] Webhook aparece no dashboard do Asaas
- [ ] Webhook está ativo (status verde)
- [ ] Tabela `webhook_eventos` existe no banco
- [ ] Teste criado e evento foi recebido
- [ ] Dados sincronizados nas tabelas `clientes` e `cobrancas`

## 🎉 Pronto!

Agora seu sistema está recebendo eventos do Asaas automaticamente, sem necessidade de polling! 

Cada vez que um pagamento for:
- ✅ Criado
- ✅ Recebido
- ✅ Confirmado
- ✅ Vencido
- ✅ Reembolsado
- ... e mais 8 eventos

O webhook será acionado e seus dados serão sincronizados automaticamente!
