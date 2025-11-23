const express = require('express');
const router = express.Router();
const asaasRoutes = require('./asaasRoutes');
const databaseRoutes = require('./databaseRoutes');
const parcelamentoRoutes = require('./parcelamentoRoutes');

// Rota principal
router.get('/', (req, res) => {
  res.json({
    message: 'Bem-vindo à API AgroServer!',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api',
      rotas: {
        vendas: 'POST /api/rota/vendas - Busca vendas e clientes de uma rota'
      },
      database: {
        test: '/api/database/test',
        poolInfo: '/api/database/pool-info',
        tables: '/api/database/tables'
      },
      asaas: {
        test: '/api/asaas/test',
        account: '/api/asaas/account',
        customers: '/api/asaas/customers',
        payments: '/api/asaas/payments'
      }
    }
  });
});

// Rotas oficiais da API
router.use('/', parcelamentoRoutes);

// Rotas do Database
router.use('/', databaseRoutes);

// Rotas do Asaas
router.use('/', asaasRoutes);

// Exemplo de rota com parâmetros
router.get('/example/:id', (req, res) => {
  const { id } = req.params;
  res.json({
    message: 'Rota de exemplo',
    id: id
  });
});

// Exemplo de rota POST
router.post('/example', (req, res) => {
  const data = req.body;
  res.status(201).json({
    message: 'Dados recebidos com sucesso',
    data: data
  });
});

module.exports = router;
