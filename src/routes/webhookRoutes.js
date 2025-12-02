const express = require('express');
const router = express.Router();
const databaseService = require('../services/databaseService');

/**
 * Endpoint para receber webhooks do Asaas
 * POST /webhook/asaas
 */
router.post('/asaas', async (req, res) => {
  try {
    const { event, payment } = req.body;

    console.log(`\n🔔 Webhook recebido: ${event}`);
    console.log(`   Payment ID: ${payment?.id}`);
    console.log(`   Customer ID: ${payment?.customer}`);

    // 1. Registra o evento na tabela webhook_eventos
    await databaseService.registrarWebhookEvento(event, req.body);

    // 2. Processa evento de cobrança
    if (event && payment) {
      await processarEventoCobranca(event, payment);
    }

    // Retorna 200 OK para o Asaas
    res.status(200).json({ received: true });

  } catch (error) {
    console.error('❌ Erro ao processar webhook:', error);
    // Retorna 200 mesmo com erro para não reenviar o webhook
    res.status(200).json({ received: true, error: error.message });
  }
});

/**
 * Processa eventos de cobrança do Asaas
 */
async function processarEventoCobranca(event, payment) {
  const { id, customer, installment, subscription } = payment;

  console.log(`   📦 Processando evento: ${event}`);

  // 1. Sincroniza/atualiza o cliente
  if (customer) {
    await sincronizarCliente(customer);
  }

  // 2. Sincroniza/atualiza a cobrança
  await sincronizarCobranca(payment);

  console.log(`   ✅ Evento processado com sucesso`);
}

/**
 * Sincroniza cliente do Asaas com o banco de dados
 */
async function sincronizarCliente(customerId) {
  const asaasService = require('../services/asaasService');
  
  try {
    console.log(`   👤 Sincronizando cliente: ${customerId}`);
    
    // Busca dados completos do cliente no Asaas
    const clienteAsaas = await asaasService.getCustomer(customerId);
    
    // Verifica se cliente já existe no banco
    const clienteExistente = await databaseService.buscarClientePorId(customerId);

    if (clienteExistente) {
      // Atualiza cliente existente
      await databaseService.atualizarCliente(customerId, clienteAsaas);
      console.log(`   ✅ Cliente atualizado: ${clienteAsaas.name}`);
    } else {
      // Cria novo cliente
      await databaseService.criarCliente(clienteAsaas);
      console.log(`   ✅ Cliente criado: ${clienteAsaas.name}`);
    }
  } catch (error) {
    console.error(`   ⚠️  Erro ao sincronizar cliente ${customerId}:`, error.message);
  }
}

/**
 * Sincroniza cobrança do Asaas com o banco de dados
 */
async function sincronizarCobranca(payment) {
  try {
    console.log(`   💳 Sincronizando cobrança: ${payment.id}`);

    // Verifica se cobrança já existe no banco
    const cobrancaExistente = await databaseService.buscarCobrancaPorId(payment.id);

    if (cobrancaExistente) {
      // Atualiza cobrança existente
      await databaseService.atualizarCobranca(payment.id, payment);
      console.log(`   ✅ Cobrança atualizada: ${payment.id}`);
    } else {
      // Cria nova cobrança
      await databaseService.criarCobranca(payment);
      console.log(`   ✅ Cobrança criada: ${payment.id}`);
    }
  } catch (error) {
    console.error(`   ⚠️  Erro ao sincronizar cobrança ${payment.id}:`, error.message);
  }
}

module.exports = router;
