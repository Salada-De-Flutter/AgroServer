const express = require('express');
const router = express.Router();
const asaasService = require('../services/asaasService');
const databaseService = require('../services/databaseService');

/**
 * Rota para processar vendas de uma rota
 * POST /api/rota/vendas
 */
router.post('/rota/vendas', async (req, res) => {
  try {
    const { rota_id } = req.body;

    // Validação básica
    if (!rota_id) {
      return res.status(400).json({
        success: false,
        message: 'ID da rota é obrigatório'
      });
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('�️  ID da rota recebido:', rota_id);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

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

    // 2. Busca todas as vendas dessa rota
    console.log('🔍 Buscando vendas da rota...');
    const vendasResult = await databaseService.query(
      'SELECT id FROM vendas WHERE rota_id = $1',
      [rota_id]
    );

    if (vendasResult.rows.length === 0) {
      console.log('⚠️  Nenhuma venda encontrada para esta rota\n');
      return res.json({
        success: true,
        message: 'Nenhuma venda encontrada para esta rota',
        data: {
          rota: {
            id: rota.id,
            nome: rota.nome,
            vendedor: rota.vendedor_nome
          },
          vendas: [],
          totalVendas: 0
        }
      });
    }

    console.log(`✅ Encontradas ${vendasResult.rows.length} venda(s)\n`);

    // 3. Para cada venda, busca informações no Asaas
    const vendasComDetalhes = [];
    
    for (const venda of vendasResult.rows) {
      console.log(`📦 Processando venda: ${venda.id}`);
      
      try {
        // Busca informações do parcelamento/venda no Asaas
        const parcelamento = await asaasService.getInstallment(venda.id);
        
        // Busca informações do cliente
        const cliente = await asaasService.getCustomer(parcelamento.customer);

        // Busca as parcelas do parcelamento
        const parcelas = await asaasService.getInstallmentPayments(venda.id);

        // Classifica as parcelas por status
        const hoje = new Date();
        const parcelasPagas = [];
        const parcelasVencidas = [];
        const parcelasAVencer = [];

        parcelas.forEach(parcela => {
          const dataVencimento = new Date(parcela.dueDate);
          
          if (parcela.status === 'RECEIVED') {
            parcelasPagas.push({
              valor: parcela.value,
              dataVencimento: parcela.dueDate,
              dataPagamento: parcela.paymentDate
            });
          } else if (parcela.status === 'OVERDUE' || (dataVencimento < hoje && parcela.status !== 'RECEIVED')) {
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

        vendasComDetalhes.push({
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
        });

      } catch (error) {
        console.log(`  ❌ Erro ao processar venda ${venda.id}:`, error.message);
        console.log('');
        
        // Continua processando as outras vendas mesmo se uma falhar
        vendasComDetalhes.push({
          nomeCliente: 'Erro ao processar',
          status: 'Erro',
          erro: error.message
        });
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Processamento concluído: ${vendasComDetalhes.length} vendas`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Resposta de sucesso - retorna apenas as informações solicitadas
    res.json(vendasComDetalhes);

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

/**
 * Rota para processar vendas de uma rota COM PROGRESSO EM TEMPO REAL
 * POST /api/rota/vendas/stream
 * Usa Server-Sent Events (SSE) para enviar atualizações de progresso
 */
router.post('/rota/vendas/stream', async (req, res) => {
  const { rota_id } = req.body;

  // Validação básica
  if (!rota_id) {
    return res.status(400).json({
      success: false,
      message: 'ID da rota é obrigatório'
    });
  }

  // Configura headers para Server-Sent Events
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Função auxiliar para enviar eventos SSE
  const sendEvent = (eventType, data) => {
    res.write(`event: ${eventType}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📡 Iniciando processamento com streaming');
    console.log('   ID da rota:', rota_id);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Envia evento inicial
    sendEvent('start', { message: 'Iniciando processamento...' });

    // 1. Busca informações da rota
    sendEvent('progress', { 
      step: 'database',
      message: 'Buscando informações da rota...' 
    });

    const rotaResult = await databaseService.query(
      `SELECT r.*, v.nome as vendedor_nome 
       FROM rotas r 
       LEFT JOIN vendedores v ON r.vendedor_id = v.id 
       WHERE r.id = $1`,
      [rota_id]
    );

    if (rotaResult.rows.length === 0) {
      sendEvent('error', { message: 'Rota não encontrada' });
      return res.end();
    }

    const rota = rotaResult.rows[0];
    console.log('✅ Rota encontrada:', rota.nome);

    // 2. Busca vendas
    sendEvent('progress', { 
      step: 'database',
      message: 'Buscando vendas da rota...' 
    });

    const vendasResult = await databaseService.query(
      'SELECT id FROM vendas WHERE rota_id = $1',
      [rota_id]
    );

    const totalVendas = vendasResult.rows.length;

    if (totalVendas === 0) {
      sendEvent('complete', { 
        message: 'Nenhuma venda encontrada',
        vendas: [] 
      });
      return res.end();
    }

    console.log(`✅ Encontradas ${totalVendas} venda(s)\n`);

    // Envia total de vendas
    sendEvent('total', { 
      total: totalVendas,
      message: `Processando ${totalVendas} cliente(s)...` 
    });

    // 3. Processa cada venda
    const vendasComDetalhes = [];
    let processados = 0;

    for (const venda of vendasResult.rows) {
      processados++;
      
      console.log(`📦 [${processados}/${totalVendas}] Processando: ${venda.id}`);
      
      try {
        // Notifica que está processando este cliente
        sendEvent('processing', {
          current: processados,
          total: totalVendas,
          percentage: Math.round((processados / totalVendas) * 100),
          message: `Processando cliente ${processados} de ${totalVendas}...`,
          step: 'fetching'
        });

        // Busca parcelamento
        sendEvent('processing', {
          current: processados,
          total: totalVendas,
          percentage: Math.round((processados / totalVendas) * 100),
          message: `Aguardando resposta do Asaas (cliente ${processados}/${totalVendas})...`,
          step: 'waiting_asaas'
        });

        const parcelamento = await asaasService.getInstallment(venda.id);
        const cliente = await asaasService.getCustomer(parcelamento.customer);
        const parcelas = await asaasService.getInstallmentPayments(venda.id);

        // Classifica parcelas
        const hoje = new Date();
        const parcelasPagas = [];
        const parcelasVencidas = [];
        const parcelasAVencer = [];

        parcelas.forEach(parcela => {
          const dataVencimento = new Date(parcela.dueDate);
          
          if (parcela.status === 'RECEIVED') {
            parcelasPagas.push({
              valor: parcela.value,
              dataVencimento: parcela.dueDate,
              dataPagamento: parcela.paymentDate
            });
          } else if (parcela.status === 'OVERDUE' || (dataVencimento < hoje && parcela.status !== 'RECEIVED')) {
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

        // Define status
        let statusGeral;
        if (parcelasVencidas.length > 0) {
          statusGeral = 'Inadimplente';
        } else if (parcelasPagas.length === parcelas.length) {
          statusGeral = 'Pago';
        } else {
          statusGeral = 'A vencer';
        }

        const vendaDetalhada = {
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

        vendasComDetalhes.push(vendaDetalhada);

        console.log(`  ✅ [${processados}/${totalVendas}] ${cliente.name} - ${statusGeral}`);

        // Envia progresso com dados do cliente processado
        sendEvent('client_processed', {
          current: processados,
          total: totalVendas,
          percentage: Math.round((processados / totalVendas) * 100),
          message: `Cliente processado: ${cliente.name} (${processados}/${totalVendas})`,
          cliente: vendaDetalhada
        });

      } catch (error) {
        console.log(`  ❌ [${processados}/${totalVendas}] Erro: ${error.message}`);
        
        sendEvent('client_error', {
          current: processados,
          total: totalVendas,
          message: `Erro ao processar cliente ${processados}`,
          error: error.message
        });

        vendasComDetalhes.push({
          parcelamentoId: venda.id,
          nomeCliente: 'Erro ao processar',
          status: 'Erro',
          erro: error.message
        });
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Processamento concluído: ${vendasComDetalhes.length} vendas`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Envia resultado final
    sendEvent('complete', {
      message: 'Processamento concluído!',
      total: totalVendas,
      vendas: vendasComDetalhes
    });

    // Encerra a conexão
    res.end();

  } catch (error) {
    console.error('\n❌ ERRO AO PROCESSAR VENDAS:', error.message);
    
    sendEvent('error', {
      message: 'Erro ao processar vendas da rota',
      error: error.message
    });
    
    res.end();
  }
});

module.exports = router;
