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


    // Monta query SQL dinâmica para busca
    let whereClause = '';
    let values = [];
    if (search) {
      const apenasNumeros = search.replace(/\D/g, '');
      if (apenasNumeros.length >= 11) {
        // Busca por CPF/CNPJ
        whereClause = 'WHERE cpf_cnpj ILIKE $1';
        values.push(`%${apenasNumeros}%`);
        console.log(`   📋 Buscando por CPF/CNPJ: ${apenasNumeros}`);
      } else {
        // Busca por nome
        whereClause = 'WHERE nome ILIKE $1';
        values.push(`%${search}%`);
        console.log(`   👤 Buscando por nome: ${search}`);
      }
    }

    // Conta total de clientes para paginação
    const countQuery = `SELECT COUNT(*) AS total FROM clientes ${whereClause}`;
    const countResult = await databaseService.query(countQuery, values);
    const totalCount = parseInt(countResult.rows[0].total);

    // Busca clientes paginados
    const clientesQuery = `
      SELECT id, nome, cpf_cnpj, email, telefone, celular, cidade_nome, estado
      FROM clientes
      ${whereClause}
      ORDER BY nome ASC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;
    const clientesResult = await databaseService.query(clientesQuery, [...values, limit, offset]);
    const clientes = clientesResult.rows;
    const hasMore = offset + clientes.length < totalCount;

    // Formata a resposta para o frontend
    const clientesFormatados = clientes.map(cliente => ({
      id: cliente.id,
      nome: cliente.nome,
      cpfCnpj: cliente.cpf_cnpj || 'Não informado',
      email: cliente.email || 'Não informado',
      telefone: cliente.celular || cliente.telefone || 'Não informado',
      cidade: cliente.cidade_nome || '',
      estado: cliente.estado || ''
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


    // Busca informações do cliente no banco
    const clienteResult = await databaseService.query(
      'SELECT id, nome, cpf_cnpj FROM clientes WHERE id = $1',
      [cliente_id]
    );
    if (clienteResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cliente não encontrado'
      });
    }
    const cliente = clienteResult.rows[0];

    // Busca parcelamentos (vendas) do cliente
    // Agrupa por parcelamento_id quando existe, senão usa o id da cobrança (à vista)
    const parcelamentosResult = await databaseService.query(
      `SELECT 
         COALESCE(parcelamento_id, id) as parcelamento_id,
         MIN(data_criacao) as data_criacao,
         SUM(valor) as valor_total,
         COUNT(*) as numero_parcelas,
         MAX(descricao) as descricao,
         MAX(status) as status,
         MAX(url_boleto) as url_boleto,
         MAX(url_fatura) as url_fatura
       FROM cobrancas
       WHERE cliente_id = $1 AND (deletado IS NULL OR deletado = false)
       GROUP BY COALESCE(parcelamento_id, id)
       ORDER BY data_criacao DESC`,
      [cliente_id]
    );
    const parcelamentos = parcelamentosResult.rows;

    // Formata parcelamentos para o frontend
    const parcelamentosFormatados = parcelamentos.map(p => ({
      id: p.parcelamento_id,
      valor: Number(p.valor_total),
      numeroParcelas: Number(p.numero_parcelas),
      descricao: p.descricao || 'Sem descrição',
      dataCriacao: p.data_criacao,
      status: p.status,
      urlBoleto: p.url_boleto,
      urlFatura: p.url_fatura,
      tipoVenda: Number(p.numero_parcelas) === 1 ? 'à vista' : 'parcelado'
    }));

    res.json({
      success: true,
      cliente: {
        id: cliente.id,
        nome: cliente.nome,
        cpfCnpj: cliente.cpf_cnpj
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

/**
 * Rota para remover um parcelamento de uma rota
 * DELETE /api/rota/remover-parcelamento
 * Body: { rota_id, parcelamento_id }
 */
router.delete('/rota/remover-parcelamento', async (req, res) => {
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
    console.log('🗑️  Removendo parcelamento da rota');
    console.log('  → Rota ID:', rota_id);
    console.log('  → Parcelamento ID:', parcelamento_id);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Verifica se o parcelamento existe na rota
    const vendaResult = await databaseService.query(
      'SELECT id, rota_id FROM vendas WHERE id = $1 AND rota_id = $2',
      [parcelamento_id, rota_id]
    );

    if (vendaResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Parcelamento não encontrado nesta rota'
      });
    }

    // Remove o parcelamento da tabela vendas
    const deleteResult = await databaseService.query(
      'DELETE FROM vendas WHERE id = $1 AND rota_id = $2',
      [parcelamento_id, rota_id]
    );

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Parcelamento removido com sucesso!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    res.json({
      success: true,
      message: 'Parcelamento removido da rota com sucesso',
      data: {
        parcelamento_id: parcelamento_id,
        rota_id: rota_id
      }
    });

  } catch (error) {
    console.error('\n❌ ERRO ao remover parcelamento:', error.message);
    
    res.status(500).json({
      success: false,
      message: 'Erro ao remover parcelamento',
      error: error.message
    });
  }
});

module.exports = router;
