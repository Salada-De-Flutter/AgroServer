const axios = require('axios');

/**
 * Serviço para gerenciar webhooks do Asaas
 */
class WebhookService {
  constructor() {
    this.apiKey = process.env.ASAAS_API_KEY;
    this.apiUrl = process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3';
    this.webhookUrl = process.env.WEBHOOK_URL; // Ex: https://agroserver-it9g.onrender.com/api/webhook/asaas
    this.webhookEmail = process.env.WEBHOOK_EMAIL || 'contato@example.com';
    
    if (!this.apiKey) {
      throw new Error('ASAAS_API_KEY não configurada');
    }

    this.client = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'access_token': this.apiKey,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Lista todos os webhooks configurados
   */
  async listarWebhooks() {
    try {
      const response = await this.client.get('/webhooks');
      return response.data.data || [];
    } catch (error) {
      console.error('Erro ao listar webhooks:', error.message);
      return [];
    }
  }

  /**
   * Verifica se webhook já existe
   */
  async webhookExiste() {
    const webhooks = await this.listarWebhooks();
    return webhooks.some(wh => wh.url === this.webhookUrl && wh.enabled);
  }

  /**
   * Cria webhook para eventos de cobrança
   */
  async criarWebhook() {
    try {
      if (!this.webhookUrl) {
        console.warn('⚠️  WEBHOOK_URL não configurada. Pulando criação de webhook.');
        return null;
      }

      // Verifica se webhook já existe
      const existe = await this.webhookExiste();
      if (existe) {
        console.log('✅ Webhook já existe e está ativo');
        return null;
      }

      console.log('📡 Criando webhook no Asaas...');

      const webhookData = {
        name: 'AgroServer - Cobranças',
        url: this.webhookUrl,
        email: this.webhookEmail,
        enabled: true,
        interrupted: false,
        apiVersion: 3,
        sendType: 'SEQUENTIALLY',
        events: [
          // Eventos principais de cobrança
          'PAYMENT_CREATED',
          'PAYMENT_UPDATED',
          'PAYMENT_CONFIRMED',
          'PAYMENT_RECEIVED',
          'PAYMENT_OVERDUE',
          'PAYMENT_DELETED',
          'PAYMENT_RESTORED',
          'PAYMENT_REFUNDED',
          'PAYMENT_PARTIALLY_REFUNDED',
          
          // Eventos de cartão
          'PAYMENT_AUTHORIZED',
          'PAYMENT_AWAITING_RISK_ANALYSIS',
          'PAYMENT_APPROVED_BY_RISK_ANALYSIS',
          'PAYMENT_REPROVED_BY_RISK_ANALYSIS',
          'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED',
          
          // Eventos de chargeback
          'PAYMENT_CHARGEBACK_REQUESTED',
          'PAYMENT_CHARGEBACK_DISPUTE',
          'PAYMENT_AWAITING_CHARGEBACK_REVERSAL',
          
          // Eventos de antecipação
          'PAYMENT_ANTICIPATED',
          
          // Eventos de dinheiro
          'PAYMENT_RECEIVED_IN_CASH_UNDONE',
          
          // Eventos de estorno
          'PAYMENT_REFUND_IN_PROGRESS',
          'PAYMENT_REFUND_DENIED',
          
          // Eventos de visualização
          'PAYMENT_BANK_SLIP_VIEWED',
          'PAYMENT_CHECKOUT_VIEWED'
        ]
      };

      const response = await this.client.post('/webhooks', webhookData);
      
      console.log('✅ Webhook criado com sucesso!');
      console.log(`   ID: ${response.data.id}`);
      console.log(`   URL: ${response.data.url}`);
      console.log(`   Eventos: ${response.data.events.length} eventos configurados`);

      return response.data;

    } catch (error) {
      console.error('❌ Erro ao criar webhook:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Inicializa webhook na inicialização do servidor
   */
  async inicializar() {
    try {
      console.log('\n🔧 Inicializando serviço de webhook...');
      
      if (!this.webhookUrl) {
        console.warn('⚠️  WEBHOOK_URL não configurada. Webhook não será criado.');
        console.warn('   Configure WEBHOOK_URL no .env para ativar webhooks.');
        return;
      }

      await this.criarWebhook();
      console.log('✅ Serviço de webhook inicializado\n');

    } catch (error) {
      console.error('❌ Erro ao inicializar webhook:', error.message);
      // Não lança erro para não impedir inicialização do servidor
    }
  }
}

module.exports = new WebhookService();
