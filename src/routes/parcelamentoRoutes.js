const express = require('express');
const router = express.Router();
const asaasService = require('../services/asaasService');
const databaseService = require('../services/databaseService');

/**
 * Função auxiliar para processar itens em lotes (batch processing)
 * Sistema automático de proteção verifica rate limit a cada 5 requisições
 * Sem delay artificial - proteção automática controla o ritmo
 */
async function processarEmLotes(items, batchSize, processFunction) {
  const results = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processFunction));
    results.push(...batchResults);
    
    // Sem delay - proteção automática verifica e aguarda se remaining <= 10
  }

  return results;
}

/**
 * Rota OTIMIZADA para processar vendas de uma rota
 * POST /api/rota/vendas
 * Suporta paginação: { rota_id, page, limit }
 * 
 * Otimizações:
 * - Processamento em lotes controlados (evita rate limit 403)
 * - Cache de clientes
 * - Paginação
 */
router.post('/rota/vendas', async (req, res) => {
  try {
    const { rota_id, page = 1, limit = 1000 } = req.body;
    if (!rota_id) {
      return res.status(400).json({ success: false, message: 'ID da rota é obrigatório' });
    }
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Busca total de vendas da rota
    const countResult = await databaseService.query(
      'SELECT COUNT(*) as total FROM vendas WHERE rota_id = $1',
      [rota_id]
    );
    const totalVendas = parseInt(countResult.rows[0].total);

    // Busca vendas paginadas da rota
    const vendasResult = await databaseService.query(
      'SELECT id FROM vendas WHERE rota_id = $1 LIMIT $2 OFFSET $3',
      [rota_id, limitNum, offset]
    );
    if (vendasResult.rows.length === 0) {
      return res.json({
        success: true,
        message: 'Nenhuma venda encontrada nesta pagina',
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalVendas,
          totalPages: Math.ceil(totalVendas / limitNum),
          hasMore: false
        },
        data: []
      });
    }

    // Busca todos os dados necessários em lote para máxima performance
    const vendaIds = vendasResult.rows.map(v => v.id);
    // Busca todas as cobranças desses parcelamentos
    const cobrancasResult = await databaseService.query(
      `SELECT c.*, cl.nome as cliente_nome, cl.id as cliente_id
         FROM cobrancas c
         JOIN clientes cl ON cl.id = c.cliente_id
         WHERE c.parcelamento_id = ANY($1)
      `,
      [vendaIds]
    );

    // Agrupa cobranças por parcelamento_id
    const cobrancasPorParcelamento = {};
    for (const cobranca of cobrancasResult.rows) {
      if (!cobrancasPorParcelamento[cobranca.parcelamento_id]) {
        cobrancasPorParcelamento[cobranca.parcelamento_id] = [];
      }
      cobrancasPorParcelamento[cobranca.parcelamento_id].push(cobranca);
    }

    // Monta resposta rápida
    const vendasComDetalhes = vendaIds.map(parcelamentoId => {
      const cobrancas = cobrancasPorParcelamento[parcelamentoId] || [];
      if (cobrancas.length === 0) {
        return {
          parcelamentoId,
          nomeCliente: 'Cliente não encontrado',
          status: 'Sem cobranças',
          parcelasVencidas: { quantidade: 0, valor: 0, parcelas: [] },
          parcelasPagas: { quantidade: 0, valor: 0, parcelas: [] },
          parcelasAVencer: { quantidade: 0, valor: 0, parcelas: [] }
        };
      }
      const clienteId = cobrancas[0].cliente_id;
      const nomeCliente = cobrancas[0].cliente_nome;
      // Classificação das parcelas
      const hoje = new Date();
      const statusPagos = ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'];
      const parcelasPagas = [];
      const parcelasVencidas = [];
      const parcelasAVencer = [];
      cobrancas.forEach(parcela => {
        const dataVencimento = parcela.data_vencimento ? new Date(parcela.data_vencimento) : null;
        if (statusPagos.includes(parcela.status)) {
          parcelasPagas.push({
            valor: Number(parcela.valor),
            dataVencimento: parcela.data_vencimento,
            dataPagamento: parcela.data_pagamento,
            formaPagamento: parcela.forma_cobranca
          });
        } else if (
          parcela.status === 'OVERDUE' ||
          (dataVencimento && dataVencimento < hoje && !statusPagos.includes(parcela.status))
        ) {
          parcelasVencidas.push({
            valor: Number(parcela.valor),
            dataVencimento: parcela.data_vencimento
          });
        } else {
          parcelasAVencer.push({
            valor: Number(parcela.valor),
            dataVencimento: parcela.data_vencimento
          });
        }
      });
      // Status geral
      let statusGeral;
      if (parcelasVencidas.length > 0) {
        statusGeral = 'Inadimplente';
      } else if (parcelasPagas.length === cobrancas.length && cobrancas.length > 0) {
        statusGeral = 'Pago';
      } else {
        statusGeral = 'A vencer';
      }
      return {
        parcelamentoId,
        clienteId,
        nomeCliente,
        status: statusGeral,
        parcelasVencidas: {
          quantidade: parcelasVencidas.length,
          valor: parcelasVencidas.reduce((acc, p) => acc + p.valor, 0),
          parcelas: parcelasVencidas
        },
        parcelasPagas: {
          quantidade: parcelasPagas.length,
          valor: parcelasPagas.reduce((acc, p) => acc + p.valor, 0),
          parcelas: parcelasPagas
        },
        parcelasAVencer: {
          quantidade: parcelasAVencer.length,
          valor: parcelasAVencer.reduce((acc, p) => acc + p.valor, 0),
          parcelas: parcelasAVencer
        }
      };
    });

    res.json({
      success: true,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalVendas,
        totalPages: Math.ceil(totalVendas / limitNum),
        hasMore: pageNum < Math.ceil(totalVendas / limitNum)
      },
      data: vendasComDetalhes
    });
  } catch (error) {
    console.error('\n❌ ERRO AO PROCESSAR VENDAS DA ROTA:');
    console.error('  → Mensagem:', error.message);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    res.status(500).json({
      success: false,
      message: 'Erro ao processar vendas da rota',
      error: error.message
    });
  }
});


module.exports = router;
