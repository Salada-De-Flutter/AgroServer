const axios = require('axios');

// ===== ESTADO GLOBAL COMPARTILHADO =====
// Todas as instâncias e requisições compartilham este estado
// Resolve problema de múltiplos usuários/requisições simultâneas
const GLOBAL_RATE_LIMIT = {
  remaining: 999,
  reset: 60,
  limit: 140,
  timestamp: Date.now(),
  updateFromHeaders(headers) {
    if (headers['ratelimit-remaining']) {
      this.remaining = parseInt(headers['ratelimit-remaining'] || '999');
      this.reset = parseInt(headers['ratelimit-reset'] || '60');
      this.limit = parseInt(headers['ratelimit-limit'] || '140');
      this.timestamp = Date.now();
    }
  }
};

class AsaasService {
  constructor() {
    this.apiKey = process.env.ASAAS_API_KEY;
    this.apiUrl = process.env.ASAAS_API_URL;
    
    if (!this.apiKey || !this.apiUrl) {
      throw new Error('Asaas API credentials not configured');
    }

    this.client = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'access_token': this.apiKey,
        'Content-Type': 'application/json'
      }
    });

    // Sistema de controle de rate limit
    this.requestCount = 0; // Contador de requisições
    this.rateLimitThreshold = 10; // Limite mínimo seguro (para de fazer requisições)
    this.checkInterval = 20; // Verifica a cada 20 requisições (menos verificações = mais velocidade)
    
    // Interceptor que atualiza ESTADO GLOBAL de rate limit
    this.client.interceptors.response.use(
      (response) => {
        // Atualiza estado global (compartilhado por TODOS)
        GLOBAL_RATE_LIMIT.updateFromHeaders(response.headers);
        return response;
      },
      (error) => {
        // Atualiza estado global mesmo em erros
        if (error.response?.headers) {
          GLOBAL_RATE_LIMIT.updateFromHeaders(error.response.headers);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Verifica o rate limit usando ESTADO GLOBAL (instantâneo!)
   * Se remaining <= 10, aguarda o reset automaticamente
   * IMPORTANTE: Usa estado compartilhado - atualizado por QUALQUER requisição
   * USA O RESET DA VARIÁVEL GLOBAL para saber quanto tempo aguardar
   */
  async checkRateLimit() {
    // Lê valores ATUALIZADOS da variável global (última requisição de qualquer usuário)
    const { remaining, reset, limit } = GLOBAL_RATE_LIMIT;
    console.log(`📊 Rate Limit Global - Remaining: ${remaining}/${limit} | Reset em: ${reset}s`);

    // Se remaining <= 10, aguarda o tempo de reset da variável global
    if (remaining <= this.rateLimitThreshold) {
      const waitTime = (reset + 2) * 1000; // Usa reset global + 2s de segurança
      console.log(`⚠️  Rate limit baixo (${remaining})! Aguardando ${reset + 2}s (reset global)...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      console.log('✅ Rate limit resetado! Continuando...');
    }

    return { remaining, reset, limit };
  }

  /**
   * Interceptor que verifica rate limit ANTES DE CADA REQUISIÇÃO
   * - Lê estado global (instantâneo, 0ms!)
   * - Se remaining <= 10, aguarda reset automaticamente
   * - Protege contra múltiplos usuários
   */
  async beforeRequest() {
    this.requestCount++;
    
    // VERIFICAÇÃO ANTES DE CADA REQUISIÇÃO (instantânea via estado global)
    const { remaining } = GLOBAL_RATE_LIMIT;
    
    // Se remaining está baixo, aguarda reset
    if (remaining <= this.rateLimitThreshold) {
      console.log(`⚠️  Rate limit baixo (${remaining})! Aguardando antes de fazer requisição...`);
      await this.checkRateLimit(); // Aguarda o reset
    }
  }

  /**
   * Testa a conexão com a API do Asaas
   * @returns {Promise<Object>} Informações da conta
   */
  async testConnection() {
    try {
      const response = await this.client.get('/myAccount');
      return {
        success: true,
        message: 'Conexão com Asaas estabelecida com sucesso',
        data: {
          name: response.data.name,
          email: response.data.email,
          walletId: response.data.walletId
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao conectar com Asaas',
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Obtém informações da conta
   * @returns {Promise<Object>}
   */
  async getAccountInfo() {
    try {
      const response = await this.client.get('/myAccount');
      return response.data;
    } catch (error) {
      throw new Error(`Erro ao obter informações da conta: ${error.message}`);
    }
  }

  /**
   * Lista clientes
   * @param {Object} params - Parâmetros de filtro
   * @returns {Promise<Object>}
   */
  async listCustomers(params = {}) {
    try {
      const response = await this.client.get('/customers', { params });
      return response.data;
    } catch (error) {
      throw new Error(`Erro ao listar clientes: ${error.message}`);
    }
  }

  /**
   * Cria um novo cliente
   * @param {Object} customerData - Dados do cliente
   * @returns {Promise<Object>}
   */
  async createCustomer(customerData) {
    try {
      const response = await this.client.post('/customers', customerData);
      return response.data;
    } catch (error) {
      throw new Error(`Erro ao criar cliente: ${error.message}`);
    }
  }

  /**
   * Lista cobranças
   * @param {Object} params - Parâmetros de filtro
   * @returns {Promise<Object>}
   */
  async listPayments(params = {}) {
    try {
      const response = await this.client.get('/payments', { params });
      return response.data;
    } catch (error) {
      throw new Error(`Erro ao listar cobranças: ${error.message}`);
    }
  }

  /**
   * Cria uma nova cobrança
   * @param {Object} paymentData - Dados da cobrança
   * @returns {Promise<Object>}
   */
  async createPayment(paymentData) {
    try {
      const response = await this.client.post('/payments', paymentData);
      return response.data;
    } catch (error) {
      throw new Error(`Erro ao criar cobrança: ${error.message}`);
    }
  }

  /**
   * Obtém detalhes de uma cobrança
   * @param {string} paymentId - ID da cobrança
   * @returns {Promise<Object>}
   */
  async getPayment(paymentId) {
    try {
      const response = await this.client.get(`/payments/${paymentId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Erro ao obter cobrança: ${error.message}`);
    }
  }

  /**
   * Obtém informações de um parcelamento (installment)
   * @param {string} installmentId - ID do parcelamento
   * @returns {Promise<Object>}
   */
  async getInstallment(installmentId) {
    // Verifica rate limit a cada 9 requisições
    await this.beforeRequest();
    
    try {
      const response = await this.client.get(`/installments/${installmentId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Erro ao obter parcelamento: ${error.message}`);
    }
  }

  /**
   * Obtém informações de um cliente
   * @param {string} customerId - ID do cliente
   * @returns {Promise<Object>}
   */
  async getCustomer(customerId) {
    // Verifica rate limit a cada 9 requisições
    await this.beforeRequest();
    
    try {
      const response = await this.client.get(`/customers/${customerId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Erro ao obter cliente: ${error.message}`);
    }
  }

  /**
   * Obtém as parcelas de um parcelamento
   * @param {string} installmentId - ID do parcelamento
   * @returns {Promise<Array>}
   */
  async getInstallmentPayments(installmentId, retries = 3) {
    // Verifica rate limit a cada 9 requisições
    await this.beforeRequest();
    
    try {
      const response = await this.client.get(`/payments`, {
        params: {
          installment: installmentId
        }
      });
      return response.data.data || [];
    } catch (error) {
      const status = error.response?.status;
      
      // Se for 403 (Forbidden) ou 429 (Too Many Requests) e ainda tem retries
      if ((status === 403 || status === 429) && retries > 0) {
        const waitTime = status === 429 ? 500 : 300; // 500ms para 429, 300ms para 403
        console.log(`  ⏳ Rate limit atingido (${status}), aguardando ${waitTime}ms antes de tentar novamente...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.getInstallmentPayments(installmentId, retries - 1);
      }
      
      throw new Error(`Erro ao obter parcelas: ${error.message}`);
    }
  }
}

module.exports = new AsaasService();
