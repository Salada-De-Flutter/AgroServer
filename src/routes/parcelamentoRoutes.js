const express = require('express');
const router = express.Router();
const asaasService = require('../services/asaasService');
const databaseService = require('../services/databaseService');

/**
 * Função auxiliar para processar itens em lotes (batch processing)
 * Evita sobrecarga da API com rate limiting
 * Sistema automático de proteção verifica rate limit a cada 5 requisições
 */
async function processarEmLotes(items, batchSize, processFunction) {
  const results = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processFunction));
    results.push(...batchResults);
    
    // Delay entre lotes (100ms para desempenho máximo)
    // Proteção automática verifica e aguarda se remaining <= 10
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
      console.log(`  ⏳ Aguardando 100ms antes do próximo lote...`);
    }
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
    // Limite padrão alto (1000) para cálculos que precisam de todos os clientes
    // O frontend pode sobrescrever se quiser paginação
    const { rota_id, page = 1, limit = 1000 } = req.body;

    // Validação básica
    if (!rota_id) {
      return res.status(400).json({
        success: false,
        message: 'ID da rota é obrigatório'
      });
    }

    // Validação de paginação
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    console.log('\n==========================================');
    console.log('ID da rota recebido:', rota_id);
    console.log('Paginacao: Pagina', pageNum, '| Limite:', limitNum);
    console.log('==========================================\n');

    // 1. Busca informações da rota no banco de dados
    console.log('🔍 Buscando informações da rota no banco de dados...');
    const rotaResult = await databaseService.query(
      `SELECT r.*, v.nome as vendedor_nome 
       FROM rotas r 
       LEFT JOIN vendedores v ON r.vendedor_id = v.id 
       WHERE r.id = $1`,
      [rota_id]
    );

    if (rotaResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Rota não encontrada'
      });
    }

    const rota = rotaResult.rows[0];
    console.log('✅ Rota encontrada:', rota.nome);
    console.log('   Vendedor:', rota.vendedor_nome || 'N/A');
    console.log('');

    // 2. Conta total de vendas dessa rota
    console.log('🔍 Contando vendas da rota...');
    const countResult = await databaseService.query(
      'SELECT COUNT(*) as total FROM vendas WHERE rota_id = $1',
      [rota_id]
    );
    const totalVendas = parseInt(countResult.rows[0].total);

    // 3. Busca vendas da rota com paginação
    console.log('🔍 Buscando vendas da rota (paginadas)...');
    const vendasResult = await databaseService.query(
      'SELECT id FROM vendas WHERE rota_id = $1 LIMIT $2 OFFSET $3',
      [rota_id, limitNum, offset]
    );

    if (vendasResult.rows.length === 0) {
      console.log('⚠️  Nenhuma venda encontrada nesta pagina\n');
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

    console.log(`✅ Encontradas ${vendasResult.rows.length} venda(s) nesta pagina`);
    console.log(`📊 Total geral: ${totalVendas} venda(s)\n`);

    // 4. Cache para clientes (evita requisições duplicadas)
    const cacheClientes = new Map();

    // 5. Para cada venda, busca informações no Asaas em LOTES (desempenho máximo)
    // Sistema automático de proteção verifica rate limit a cada 5 requisições
    // Se remaining <= 10, aguarda automaticamente o reset
    // BATCH_SIZE = 10 para máximo desempenho (proteção automática previne rate limit)
    const BATCH_SIZE = 10; // Processa 10 vendas por lote
    console.log(`⚡ Processando vendas em lotes de ${BATCH_SIZE}...\n`);
    const tempoInicio = Date.now();
    
    const vendasComDetalhes = await processarEmLotes(
      vendasResult.rows,
      BATCH_SIZE,
      async (venda) => {
        console.log(`📦 Processando venda: ${venda.id}`);
        
        try {
          // Busca informações do parcelamento/venda no Asaas
          const parcelamento = await asaasService.getInstallment(venda.id);
          
          // Busca informações do cliente (com cache)
          let cliente;
          if (cacheClientes.has(parcelamento.customer)) {
            cliente = cacheClientes.get(parcelamento.customer);
            console.log('  💾 Cliente encontrado no cache');
          } else {
            cliente = await asaasService.getCustomer(parcelamento.customer);
            cacheClientes.set(parcelamento.customer, cliente);
          }

          // Busca as parcelas do parcelamento
          const parcelas = await asaasService.getInstallmentPayments(venda.id);

        // Classifica as parcelas por status
        const hoje = new Date();
        const parcelasPagas = [];
        const parcelasVencidas = [];
        const parcelasAVencer = [];

        // Status de pagamento confirmado na API Asaas
        const statusPagos = ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'];

        parcelas.forEach(parcela => {
          const dataVencimento = new Date(parcela.dueDate);
          
          // Verifica se a parcela foi paga (aceita PIX, boleto, dinheiro, etc)
          if (statusPagos.includes(parcela.status)) {
            parcelasPagas.push({
              valor: parcela.value,
              dataVencimento: parcela.dueDate,
              dataPagamento: parcela.paymentDate,
              formaPagamento: parcela.billingType // PIX, BOLETO, etc
            });
          } else if (parcela.status === 'OVERDUE' || (dataVencimento < hoje && !statusPagos.includes(parcela.status))) {
            parcelasVencidas.push({
              valor: parcela.value,
              dataVencimento: parcela.dueDate
            });
          } else {
            parcelasAVencer.push({
              valor: parcela.value,
              dataVencimento: parcela.dueDate
            });
          }
        });

        // Define o status geral
        let statusGeral;
        if (parcelasVencidas.length > 0) {
          statusGeral = 'Inadimplente';
        } else if (parcelasPagas.length === parcelas.length) {
          statusGeral = 'Pago';
        } else {
          statusGeral = 'A vencer';
        }

        console.log('  ✅ Venda processada');
        console.log('     → Cliente:', cliente.name);
        console.log('     → Status:', statusGeral);
        console.log('     → Pagas:', parcelasPagas.length);
        console.log('     → Vencidas:', parcelasVencidas.length);
        console.log('     → A vencer:', parcelasAVencer.length);
        console.log('');

        return {
          parcelamentoId: venda.id,
          clienteId: cliente.id,
          nomeCliente: cliente.name,
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

      } catch (error) {
        console.log(`  ❌ Erro ao processar venda ${venda.id}:`, error.message);
        console.log('');
        
        // Continua processando as outras vendas mesmo se uma falhar
        return {
          parcelamentoId: venda.id,
          nomeCliente: 'Erro ao processar',
          status: 'Erro',
          erro: error.message
        };
      }
    }
  );

    const tempoTotal = ((Date.now() - tempoInicio) / 1000).toFixed(2);
    
    console.log('==========================================');
    console.log(`💾 Cache: ${cacheClientes.size} cliente(s) unicos`);
    console.log(`⚡ Tempo de processamento: ${tempoTotal}s`);
    console.log(`✅ Processamento concluido: ${vendasComDetalhes.length} vendas`);
    console.log('==========================================\n');

    // Resposta de sucesso com paginação e métricas de performance
    res.json({
      success: true,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalVendas,
        totalPages: Math.ceil(totalVendas / limitNum),
        hasMore: pageNum < Math.ceil(totalVendas / limitNum)
      },
      performance: {
        tempoProcessamento: `${tempoTotal}s`,
        clientesCache: cacheClientes.size,
        vendasProcessadas: vendasComDetalhes.length
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
