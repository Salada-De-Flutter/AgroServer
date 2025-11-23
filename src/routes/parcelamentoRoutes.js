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

module.exports = router;
