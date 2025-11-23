const axios = require('axios');

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
  async getInstallmentPayments(installmentId) {
    try {
      const response = await this.client.get(`/payments`, {
        params: {
          installment: installmentId
        }
      });
      return response.data.data || [];
    } catch (error) {
      throw new Error(`Erro ao obter parcelas: ${error.message}`);
    }
  }
}

module.exports = new AsaasService();
