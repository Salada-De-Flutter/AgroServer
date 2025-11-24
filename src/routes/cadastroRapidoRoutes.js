const express = require('express');
const router = express.Router();
const asaasService = require('../services/asaasService');
const databaseService = require('../services/databaseService');

/**
 * Rota para cadastro rápido de múltiplos clientes em uma rota por CPF
 * POST /api/cadastro-rapido/clientes-por-cpf
 * 
 * Body: {
 *   rota_id: "123",
 *   cpfs: ["931.830.541-91", "883.304.353-34", ...]
 * }
 * 
 * Regras:
 * - Cliente deve existir no Asaas
 * - Cliente deve ter EXATAMENTE 1 parcelamento
 * - Se tiver 0 ou 2+ parcelamentos, ignora
 */
router.post('/cadastro-rapido/clientes-por-cpf', async (req, res) => {
  try {
    const { rota_id, cpfs } = req.body;

    // Validação
    if (!rota_id) {
      return res.status(400).json({
        success: false,
        message: 'rota_id é obrigatório'
      });
    }

    if (!cpfs || !Array.isArray(cpfs) || cpfs.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'cpfs deve ser um array com pelo menos 1 CPF'
      });
    }

    console.log('\n========================================');
    console.log('🚀 CADASTRO RÁPIDO DE CLIENTES POR CPF');
    console.log('========================================');
    console.log('Rota ID:', rota_id);
    console.log('Total de CPFs:', cpfs.length);
    console.log('========================================\n');

    // Verifica se a rota existe
    const rotaResult = await databaseService.query(
      'SELECT id, nome FROM rotas WHERE id = $1',
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
    console.log('');

    // Resultados
    const resultados = {
      sucesso: [],
      ignorados: [],
      erros: []
    };

    // Processa CPFs em lotes de 5 para não sobrecarregar a API
    const BATCH_SIZE = 5;
    const tempoInicio = Date.now();

    for (let i = 0; i < cpfs.length; i += BATCH_SIZE) {
      const batch = cpfs.slice(i, i + BATCH_SIZE);
      
      const batchResults = await Promise.all(
        batch.map(async (cpf) => {
          const cpfLimpo = cpf.replace(/\D/g, ''); // Remove formatação
          
          console.log(`\n📋 Processando CPF: ${cpf}`);
          
          try {
            // 1. Busca cliente no Asaas por CPF
            console.log('  🔍 Buscando cliente no Asaas...');
            const clienteResponse = await asaasService.listCustomers({ cpfCnpj: cpfLimpo });
            
            if (!clienteResponse.data || clienteResponse.data.length === 0) {
              console.log('  ⚠️  Cliente não encontrado no Asaas');
              return {
                cpf,
                status: 'ignorado',
                motivo: 'Cliente não encontrado no Asaas'
              };
            }

            const cliente = clienteResponse.data[0];
            console.log(`  ✅ Cliente encontrado: ${cliente.name}`);

            // 2. Busca parcelamentos do cliente
            console.log('  🔍 Buscando parcelamentos...');
            const parcelamentosResponse = await asaasService.client.get('/installments', {
              params: { customer: cliente.id }
            });

            const parcelamentos = parcelamentosResponse.data.data || [];
            console.log(`  📊 Parcelamentos encontrados: ${parcelamentos.length}`);

            // 3. Valida quantidade de parcelamentos
            if (parcelamentos.length === 0) {
              console.log('  ⚠️  Cliente sem parcelamento - IGNORADO');
              return {
                cpf,
                clienteNome: cliente.name,
                status: 'ignorado',
                motivo: 'Cliente não possui parcelamento'
              };
            }

            if (parcelamentos.length > 1) {
              console.log(`  ⚠️  Cliente com ${parcelamentos.length} parcelamentos - IGNORADO`);
              return {
                cpf,
                clienteNome: cliente.name,
                status: 'ignorado',
                motivo: `Cliente possui ${parcelamentos.length} parcelamentos (esperado: 1)`
              };
            }

            // 4. Cliente tem exatamente 1 parcelamento - pode cadastrar!
            const parcelamento = parcelamentos[0];
            console.log(`  ✅ 1 parcelamento encontrado: ${parcelamento.id}`);
            console.log(`     Valor: R$ ${parcelamento.value}`);
            console.log(`     Parcelas: ${parcelamento.installmentCount}x`);

            // 5. Verifica se já está cadastrado nesta rota
            const jaExiste = await databaseService.query(
              'SELECT id FROM vendas WHERE id = $1 AND rota_id = $2',
              [parcelamento.id, rota_id]
            );

            if (jaExiste.rows.length > 0) {
              console.log('  ⚠️  Já cadastrado nesta rota - IGNORADO');
              return {
                cpf,
                clienteNome: cliente.name,
                parcelamentoId: parcelamento.id,
                status: 'ignorado',
                motivo: 'Já cadastrado nesta rota'
              };
            }

            // 6. Cadastra na rota
            await databaseService.query(
              `INSERT INTO vendas (id, rota_id) 
               VALUES ($1, $2) 
               ON CONFLICT (id) DO UPDATE SET rota_id = $2`,
              [parcelamento.id, rota_id]
            );

            console.log('  ✅ CADASTRADO COM SUCESSO!');

            return {
              cpf,
              clienteId: cliente.id,
              clienteNome: cliente.name,
              parcelamentoId: parcelamento.id,
              valor: parcelamento.value,
              parcelas: parcelamento.installmentCount,
              status: 'sucesso'
            };

          } catch (error) {
            console.log(`  ❌ Erro: ${error.message}`);
            return {
              cpf,
              status: 'erro',
              erro: error.message
            };
          }
        })
      );

      // Organiza resultados
      batchResults.forEach(result => {
        if (result.status === 'sucesso') {
          resultados.sucesso.push(result);
        } else if (result.status === 'ignorado') {
          resultados.ignorados.push(result);
        } else {
          resultados.erros.push(result);
        }
      });

      // Delay entre lotes
      if (i + BATCH_SIZE < cpfs.length) {
        await new Promise(resolve => setTimeout(resolve, 300));
        console.log('\n  ⏳ Aguardando 300ms antes do próximo lote...');
      }
    }

    const tempoTotal = ((Date.now() - tempoInicio) / 1000).toFixed(2);

    console.log('\n========================================');
    console.log('📊 RESUMO DO PROCESSAMENTO');
    console.log('========================================');
    console.log(`✅ Cadastrados: ${resultados.sucesso.length}`);
    console.log(`⚠️  Ignorados: ${resultados.ignorados.length}`);
    console.log(`❌ Erros: ${resultados.erros.length}`);
    console.log(`⏱️  Tempo total: ${tempoTotal}s`);
    console.log('========================================\n');

    // Resposta
    res.json({
      success: true,
      rota: {
        id: rota.id,
        nome: rota.nome
      },
      processamento: {
        total: cpfs.length,
        cadastrados: resultados.sucesso.length,
        ignorados: resultados.ignorados.length,
        erros: resultados.erros.length,
        tempoTotal: `${tempoTotal}s`
      },
      detalhes: {
        sucesso: resultados.sucesso,
        ignorados: resultados.ignorados,
        erros: resultados.erros
      }
    });

  } catch (error) {
    console.error('\n❌ ERRO NO CADASTRO RÁPIDO:', error.message);
    
    res.status(500).json({
      success: false,
      message: 'Erro ao processar cadastro rápido',
      error: error.message
    });
  }
});

module.exports = router;
