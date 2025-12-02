require('dotenv').config();
const app = require('./app');
const asaasService = require('./services/asaasService');
const databaseService = require('./services/databaseService');
const webhookService = require('./services/webhookService');

const PORT = process.env.PORT || 3000;

// Função para testar conexão com o banco de dados
async function testDatabaseConnection() {
  console.log('🔍 Testando conexão com o banco de dados...');
  const result = await databaseService.testConnection();
  
  if (result.success) {
    console.log('✅ Banco de dados conectado com sucesso!');
    console.log(`   🕐 Timestamp: ${result.data.timestamp}`);
    console.log(`   🗄️  Versão: ${result.data.version}`);
  } else {
    console.error('❌ Erro ao conectar com o banco de dados:', result.error);
    console.error('⚠️  O servidor continuará rodando, mas operações de banco de dados não funcionarão.');
  }
  console.log('');
}

// Função para testar conexão com Asaas
async function testAsaasConnection() {
  console.log('🔍 Testando conexão com Asaas...');
  const result = await asaasService.testConnection();
  
  if (result.success) {
    console.log('✅ Asaas conectado com sucesso!');
    console.log(`   📧 Conta: ${result.data.email}`);
    console.log(`   👤 Nome: ${result.data.name}`);
    console.log(`   💼 Wallet ID: ${result.data.walletId}`);
  } else {
    console.error('❌ Erro ao conectar com Asaas:', result.error);
    console.error('⚠️  O servidor continuará rodando, mas a integração com Asaas pode não funcionar.');
  }
  console.log('');
}

// Função para configurar webhook do Asaas
async function setupAsaasWebhook() {
  console.log('🔗 Configurando webhook do Asaas...');
  
  if (!process.env.WEBHOOK_URL) {
    console.error('⚠️  WEBHOOK_URL não configurada no .env - webhook não será criado');
    console.error('   Configure WEBHOOK_URL com a URL pública do webhook (ex: https://agroserver-it9g.onrender.com/api/webhook/asaas)');
    console.log('');
    return;
  }
  
  try {
    const resultado = await webhookService.criarWebhook();
    
    if (resultado) {
      console.log('✅ Webhook criado com sucesso!');
      console.log(`   🔗 URL: ${resultado.url}`);
      console.log(`   📋 Nome: ${resultado.name}`);
      console.log(`   📊 Eventos: ${resultado.events.length} eventos configurados`);
    }
  } catch (error) {
    console.error('❌ Erro ao configurar webhook:', error.message);
    console.error('⚠️  O servidor continuará rodando, mas eventos do Asaas não serão recebidos.');
  }
  console.log('');
}

app.listen(PORT, async () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log('');
  
  // Testa conexões após o servidor iniciar
  await testDatabaseConnection();
  await testAsaasConnection();
  await setupAsaasWebhook();
});
