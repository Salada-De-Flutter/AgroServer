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
}

module.exports = new DatabaseService();
