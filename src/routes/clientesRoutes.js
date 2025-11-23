const express = require('express');
const router = express.Router();
const asaasService = require('../services/asaasService');
const databaseService = require('../services/databaseService');

/**
 * Rota para listar clientes do Asaas com paginação e busca
 * GET /api/clientes/listar?page=1&limit=20&search=nome
 */
router.get('/clientes/listar', async (req, res) => {
  try {
    // Parâmetros de paginação (com valores padrão)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    if (search) {
      console.log(`\n🔍 Buscando clientes com termo: "${search}" - Página ${page}`);
    } else {
      console.log(`\n🔍 Buscando clientes - Página ${page} (${limit} por página)...`);
    }

    // Monta parâmetros para a API do Asaas
    const params = {
      limit: limit,
      offset: offset
    };

    // Se houver termo de busca, adiciona aos parâmetros
    // A API do Asaas aceita 'name' para buscar por nome
    if (search) {
      // Verifica se é CPF/CNPJ (apenas números)
      const apenasNumeros = search.replace(/\D/g, '');
      
      if (apenasNumeros.length >= 11) {
        // Se tiver 11+ dígitos, busca por CPF/CNPJ
        params.cpfCnpj = apenasNumeros;
        console.log(`   📋 Buscando por CPF/CNPJ: ${apenasNumeros}`);
      } else {
        // Senão, busca por nome
        params.name = search;
        console.log(`   👤 Buscando por nome: ${search}`);
      }
    }

    // Busca clientes do Asaas com paginação e filtro
    const response = await asaasService.listCustomers(params);

    const clientes = response.data || [];
    const hasMore = response.hasMore || false;
    const totalCount = response.totalCount || 0;

    console.log(`✅ ${clientes.length} cliente(s) encontrado(s)\n`);

    // Formata a resposta para o frontend
    const clientesFormatados = clientes.map(cliente => ({
      id: cliente.id,
      nome: cliente.name,
      cpfCnpj: cliente.cpfCnpj || 'Não informado',
      email: cliente.email || 'Não informado',
      telefone: cliente.mobilePhone || cliente.phone || 'Não informado',
      cidade: cliente.city || '',
      estado: cliente.state || ''
    }));

    res.json({
      success: true,
      pagination: {
        page: page,
        limit: limit,
        total: totalCount,
        hasMore: hasMore,
        totalPages: Math.ceil(totalCount / limit)
      },
      search: search,
      clientes: clientesFormatados
    });

  } catch (error) {
    console.error('\n❌ Erro ao listar clientes:', error.message);
    
    res.status(500).json({
      success: false,
      message: 'Erro ao listar clientes',
      error: error.message
    });
  }
});

/**
 * Rota para adicionar cliente (via parcelamento) a uma rota
 * POST /api/rota/adicionar-cliente
 */
router.post('/rota/adicionar-cliente', async (req, res) => {
  try {
    const { rota_id, cliente_id } = req.body;

    // Validação
    if (!rota_id || !cliente_id) {
      return res.status(400).json({
        success: false,
        message: 'rota_id e cliente_id são obrigatórios'
      });
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 Adicionando cliente à rota');
    console.log('  → Rota ID:', rota_id);
    console.log('  → Cliente ID:', cliente_id);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

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

    // Busca informações do cliente no Asaas
    console.log('🔍 Buscando informações do cliente no Asaas...');
    const cliente = await asaasService.getCustomer(cliente_id);
    console.log(`✅ Cliente encontrado: ${cliente.name}\n`);

    // Busca parcelamentos do cliente no Asaas
    console.log('🔍 Buscando parcelamentos do cliente...');
    const installmentsResponse = await asaasService.client.get('/installments', {
      params: { customer: cliente_id }
    });

    const parcelamentos = installmentsResponse.data.data || [];

    if (parcelamentos.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cliente não possui parcelamentos cadastrados',
        cliente: {
          nome: cliente.name,
          cpfCnpj: cliente.cpfCnpj
        }
      });
    }

    console.log(`✅ Encontrados ${parcelamentos.length} parcelamento(s)\n`);

    // Adiciona cada parcelamento como venda na rota
    let vendasAdicionadas = 0;
    const vendasDetalhes = [];

    for (const parcelamento of parcelamentos) {
      try {
        await databaseService.query(
          `INSERT INTO vendas (id, rota_id) 
           VALUES ($1, $2) 
           ON CONFLICT (id) DO UPDATE SET rota_id = $2`,
          [parcelamento.id, rota_id]
        );

        vendasAdicionadas++;
        vendasDetalhes.push({
          parcelamentoId: parcelamento.id,
          valor: parcelamento.value,
          parcelas: parcelamento.installmentCount,
          descricao: parcelamento.description
        });

        console.log(`  ✅ Parcelamento ${parcelamento.id} adicionado`);
      } catch (err) {
        console.log(`  ⚠️  Erro ao adicionar parcelamento ${parcelamento.id}:`, err.message);
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ ${vendasAdicionadas} venda(s) adicionada(s) com sucesso`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    res.json({
      success: true,
      message: `${vendasAdicionadas} venda(s) adicionada(s) com sucesso`,
      data: {
        rota: rotaResult.rows[0],
        cliente: {
          id: cliente.id,
          nome: cliente.name,
          cpfCnpj: cliente.cpfCnpj
        },
        vendasAdicionadas: vendasAdicionadas,
        vendas: vendasDetalhes
      }
    });

  } catch (error) {
    console.error('\n❌ ERRO ao adicionar cliente:', error.message);
    
    res.status(500).json({
      success: false,
      message: 'Erro ao adicionar cliente',
      error: error.message
    });
  }
});

module.exports = router;
