const { Pool } = require('pg');

class DatabaseService {
  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL não está configurada');
    }

    // Cria o pool de conexões
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false // Necessário para Supabase
      },
      max: 20, // Número máximo de conexões no pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Listener para erros
    this.pool.on('error', (err) => {
      console.error('❌ Erro inesperado no pool de conexões:', err);
    });
  }

  /**
   * Testa a conexão com o banco de dados
   * @returns {Promise<Object>}
   */
  async testConnection() {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW() as now, version() as version');
      client.release();

      return {
        success: true,
        message: 'Conexão com o banco de dados estabelecida com sucesso',
        data: {
          timestamp: result.rows[0].now,
          version: result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao conectar com o banco de dados',
        error: error.message
      };
    }
  }

  /**
   * Executa uma query no banco de dados
   * @param {string} text - Query SQL
   * @param {Array} params - Parâmetros da query
   * @returns {Promise<Object>}
   */
  async query(text, params) {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 Query executada:', { text, duration: `${duration}ms`, rows: result.rowCount });
      }
      
      return result;
    } catch (error) {
      console.error('❌ Erro ao executar query:', error);
      throw error;
    }
  }

  /**
   * Obtém um cliente do pool para transações
   * @returns {Promise<Object>}
   */
  async getClient() {
    return await this.pool.connect();
  }

  /**
   * Fecha todas as conexões do pool
   */
  async close() {
    await this.pool.end();
  }

  /**
   * Retorna informações sobre o pool de conexões
   * @returns {Object}
   */
  getPoolInfo() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount
    };
  }

  // ==========================================
  // MÉTODOS PARA WEBHOOK
  // ==========================================

  /**
   * Registra evento de webhook na tabela webhook_eventos
   * @param {string} evento - Tipo do evento (ex: PAYMENT_RECEIVED)
   * @param {Object} payload - Dados completos do evento
   */
  async registrarWebhookEvento(evento, payload) {
    const query = `
      INSERT INTO webhook_eventos (evento, payload, recebido_em)
      VALUES ($1, $2, NOW())
      RETURNING id
    `;
    const result = await this.query(query, [evento, JSON.stringify(payload)]);
    return result.rows[0];
  }

  /**
   * Busca cliente por ID do Asaas
   * @param {string} clienteId - ID do cliente no Asaas
   */
  async buscarClientePorId(clienteId) {
    const query = 'SELECT * FROM clientes WHERE id = $1';
    const result = await this.query(query, [clienteId]);
    return result.rows[0];
  }

  /**
   * Cria novo cliente
   * @param {Object} cliente - Dados do cliente do Asaas
   */
  async criarCliente(cliente) {
    const query = `
      INSERT INTO clientes (
        id, nome, email, cpf_cnpj, telefone, celular,
        endereco, numero, complemento, bairro, cidade, estado, cep,
        criado_em, atualizado_em
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    `;
    const result = await this.query(query, [
      cliente.id,
      cliente.name,
      cliente.email,
      cliente.cpfCnpj,
      cliente.phone,
      cliente.mobilePhone,
      cliente.address,
      cliente.addressNumber,
      cliente.complement,
      cliente.province,
      cliente.city || cliente.cityName,
      cliente.state,
      cliente.postalCode
    ]);
    return result.rows[0];
  }

  /**
   * Atualiza cliente existente
   * @param {string} clienteId - ID do cliente
   * @param {Object} cliente - Dados atualizados do cliente
   */
  async atualizarCliente(clienteId, cliente) {
    const query = `
      UPDATE clientes SET
        nome = $2,
        email = $3,
        cpf_cnpj = $4,
        telefone = $5,
        celular = $6,
        endereco = $7,
        numero = $8,
        complemento = $9,
        bairro = $10,
        cidade = $11,
        estado = $12,
        cep = $13,
        atualizado_em = NOW()
      WHERE id = $1
      RETURNING id
    `;
    const result = await this.query(query, [
      clienteId,
      cliente.name,
      cliente.email,
      cliente.cpfCnpj,
      cliente.phone,
      cliente.mobilePhone,
      cliente.address,
      cliente.addressNumber,
      cliente.complement,
      cliente.province,
      cliente.city || cliente.cityName,
      cliente.state,
      cliente.postalCode
    ]);
    return result.rows[0];
  }

  /**
   * Busca cobrança por ID do Asaas
   * @param {string} cobrancaId - ID da cobrança no Asaas
   */
  async buscarCobrancaPorId(cobrancaId) {
    const query = 'SELECT * FROM cobrancas WHERE id = $1';
    const result = await this.query(query, [cobrancaId]);
    return result.rows[0];
  }

  /**
   * Cria nova cobrança
   * @param {Object} payment - Dados do pagamento do Asaas
   */
  async criarCobranca(payment) {
    const query = `
      INSERT INTO cobrancas (
        id, cliente_id, valor, status, forma_pagamento,
        data_vencimento, data_pagamento, descricao, url_fatura,
        parcelamento_id, numero_parcela, total_parcelas,
        criado_em, atualizado_em
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    `;
    const result = await this.query(query, [
      payment.id,
      payment.customer,
      payment.value,
      payment.status,
      payment.billingType,
      payment.dueDate,
      payment.paymentDate || payment.clientPaymentDate,
      payment.description,
      payment.invoiceUrl,
      payment.installment,
      payment.installmentNumber,
      payment.installmentCount
    ]);
    return result.rows[0];
  }

  /**
   * Atualiza cobrança existente
   * @param {string} cobrancaId - ID da cobrança
   * @param {Object} payment - Dados atualizados do pagamento
   */
  async atualizarCobranca(cobrancaId, payment) {
    const query = `
      UPDATE cobrancas SET
        cliente_id = $2,
        valor = $3,
        status = $4,
        forma_pagamento = $5,
        data_vencimento = $6,
        data_pagamento = $7,
        descricao = $8,
        url_fatura = $9,
        parcelamento_id = $10,
        numero_parcela = $11,
        total_parcelas = $12,
        atualizado_em = NOW()
      WHERE id = $1
      RETURNING id
    `;
    const result = await this.query(query, [
      cobrancaId,
      payment.customer,
      payment.value,
      payment.status,
      payment.billingType,
      payment.dueDate,
      payment.paymentDate || payment.clientPaymentDate,
      payment.description,
      payment.invoiceUrl,
      payment.installment,
      payment.installmentNumber,
      payment.installmentCount
    ]);
    return result.rows[0];
  }
}

module.exports = new DatabaseService();
