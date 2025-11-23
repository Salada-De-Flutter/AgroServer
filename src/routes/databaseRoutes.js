const express = require('express');
const router = express.Router();
const databaseService = require('../services/databaseService');

// Rota para testar conexão com o banco de dados
router.get('/database/test', async (req, res) => {
  try {
    const result = await databaseService.testConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao testar conexão',
      error: error.message
    });
  }
});

// Rota para obter informações do pool de conexões
router.get('/database/pool-info', (req, res) => {
  try {
    const poolInfo = databaseService.getPoolInfo();
    res.json({
      success: true,
      data: poolInfo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao obter informações do pool',
      error: error.message
    });
  }
});

// Exemplo: Rota para executar uma query simples
router.get('/database/tables', async (req, res) => {
  try {
    const result = await databaseService.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    res.json({
      success: true,
      data: {
        tables: result.rows.map(row => row.table_name),
        count: result.rowCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao listar tabelas',
      error: error.message
    });
  }
});

module.exports = router;
