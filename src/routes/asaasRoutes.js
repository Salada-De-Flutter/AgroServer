const express = require('express');
const router = express.Router();
const asaasService = require('../services/asaasService');

// Rota para testar conexão com Asaas
router.get('/asaas/test', async (req, res) => {
  try {
    const result = await asaasService.testConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao testar conexão',
      error: error.message
    });
  }
});

// Rota para obter informações da conta Asaas
router.get('/asaas/account', async (req, res) => {
  try {
    const accountInfo = await asaasService.getAccountInfo();
    res.json({
      success: true,
      data: accountInfo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao obter informações da conta',
      error: error.message
    });
  }
});

// Rota para listar clientes
router.get('/asaas/customers', async (req, res) => {
  try {
    const customers = await asaasService.listCustomers(req.query);
    res.json({
      success: true,
      data: customers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao listar clientes',
      error: error.message
    });
  }
});

// Rota para criar cliente
router.post('/asaas/customers', async (req, res) => {
  try {
    const customer = await asaasService.createCustomer(req.body);
    res.status(201).json({
      success: true,
      data: customer
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao criar cliente',
      error: error.message
    });
  }
});

// Rota para listar cobranças
router.get('/asaas/payments', async (req, res) => {
  try {
    const payments = await asaasService.listPayments(req.query);
    res.json({
      success: true,
      data: payments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao listar cobranças',
      error: error.message
    });
  }
});

// Rota para criar cobrança
router.post('/asaas/payments', async (req, res) => {
  try {
    const payment = await asaasService.createPayment(req.body);
    res.status(201).json({
      success: true,
      data: payment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao criar cobrança',
      error: error.message
    });
  }
});

// Rota para obter detalhes de uma cobrança
router.get('/asaas/payments/:id', async (req, res) => {
  try {
    const payment = await asaasService.getPayment(req.params.id);
    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao obter cobrança',
      error: error.message
    });
  }
});

module.exports = router;
