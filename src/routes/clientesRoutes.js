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
 * Rota para buscar parcelamentos de um cliente específico
 * GET /api/clientes/:cliente_id/parcelamentos
 */
router.get('/clientes/:cliente_id/parcelamentos', async (req, res) => {
  try {
    const { cliente_id } = req.params;

    console.log(`\n🔍 Buscando parcelamentos do cliente: ${cliente_id}`);

    // Busca informações do cliente
    const cliente = await asaasService.getCustomer(cliente_id);
    
    // Busca parcelamentos do cliente
    const installmentsResponse = await asaasService.client.get('/installments', {
      params: { customer: cliente_id }
    });

    const parcelamentos = installmentsResponse.data.data || [];

    console.log(`✅ ${parcelamentos.length} parcelamento(s) encontrado(s)\n`);

    // Formata parcelamentos para o frontend
    const parcelamentosFormatados = parcelamentos.map(p => ({
      id: p.id,
      valor: p.value,
      numeroParcelas: p.installmentCount,
      descricao: p.description || 'Sem descrição',
      dataCriacao: p.dateCreated,
      status: p.status
    }));

    res.json({
      success: true,
      cliente: {
        id: cliente.id,
        nome: cliente.name,
        cpfCnpj: cliente.cpfCnpj
      },
      parcelamentos: parcelamentosFormatados
    });

  } catch (error) {
    console.error('\n❌ Erro ao buscar parcelamentos:', error.message);
    
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar parcelamentos do cliente',
      error: error.message
    });
  }
});

/**
 * Rota para adicionar um parcelamento específico a uma rota
 * POST /api/rota/adicionar-parcelamento
 */
router.post('/rota/adicionar-parcelamento', async (req, res) => {
  try {
    const { rota_id, parcelamento_id } = req.body;

    // Validação
    if (!rota_id || !parcelamento_id) {
      return res.status(400).json({
        success: false,
        message: 'rota_id e parcelamento_id são obrigatórios'
      });
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 Adicionando parcelamento à rota');
    console.log('  → Rota ID:', rota_id);
    console.log('  → Parcelamento ID:', parcelamento_id);
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

    // Busca informações do parcelamento no Asaas
    console.log('🔍 Buscando informações do parcelamento...');
    const parcelamento = await asaasService.getInstallment(parcelamento_id);
    
    // Busca informações do cliente
    const cliente = await asaasService.getCustomer(parcelamento.customer);
    console.log(`✅ Parcelamento encontrado: ${cliente.name} - R$ ${parcelamento.value}\n`);

    // Adiciona o parcelamento como venda na rota
    await databaseService.query(
      `INSERT INTO vendas (id, rota_id) 
       VALUES ($1, $2) 
       ON CONFLICT (id) DO UPDATE SET rota_id = $2`,
      [parcelamento_id, rota_id]
    );

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Parcelamento adicionado com sucesso!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    res.json({
      success: true,
      message: 'Parcelamento adicionado com sucesso',
      data: {
        rota: rotaResult.rows[0],
        cliente: {
          id: cliente.id,
          nome: cliente.name,
          cpfCnpj: cliente.cpfCnpj
        },
        parcelamento: {
          id: parcelamento.id,
          valor: parcelamento.value,
          numeroParcelas: parcelamento.installmentCount,
          descricao: parcelamento.description
        }
      }
    });

  } catch (error) {
    console.error('\n❌ ERRO ao adicionar parcelamento:', error.message);
    
    res.status(500).json({
      success: false,
      message: 'Erro ao adicionar parcelamento',
      error: error.message
    });
  }
});

module.exports = router;
