const express = require('express');
const router = express.Router();
const databaseService = require('../services/databaseService');

/**
 * POST /api/dashboard/metricas
 * Retorna métricas completas do dashboard
 */
router.post('/metricas', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { usuario_id, data_inicio, data_fim } = req.body;
    
    // Validação
    if (!usuario_id) {
      return res.status(400).json({
        success: false,
        message: 'usuario_id é obrigatório'
      });
    }
    
    // Define período padrão se não informado
    const hoje = new Date();
    const dataInicio = data_inicio || new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
    const dataFim = data_fim || hoje.toISOString().split('T')[0];
    
    // ============================================
    // BUSCAR TODAS AS MÉTRICAS EM PARALELO
    // ============================================
    
    const [
      metricasFinanceiras,
      indicadoresOperacionais,
      analiseParcelas,
      alertas
    ] = await Promise.all([
      calcularMetricasFinanceiras(dataInicio, dataFim),
      calcularIndicadoresOperacionais(dataInicio, dataFim),
      calcularAnaliseParcelas(dataInicio, dataFim),
      calcularAlertas()
    ]);
    
    // ============================================
    // RESPOSTA
    // ============================================
    
    const tempoProcessamento = Date.now() - startTime;
    
    res.json({
      success: true,
      data: {
        metricasFinanceiras,
        indicadoresOperacionais,
        analiseParcelas,
        alertas
      },
      performance: {
        tempoProcessamento: `${tempoProcessamento}ms`,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao calcular métricas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao calcular métricas do dashboard',
      error: error.message
    });
  }
});

// ============================================
// FUNÇÕES DE CÁLCULO
// ============================================

/**
 * Calcula métricas financeiras
 */
async function calcularMetricasFinanceiras(dataInicio, dataFim) {
  const hoje = new Date().toISOString().split('T')[0];
  
  const query = `
    SELECT
      -- Faturamento Total (todas as parcelas)
      COALESCE(SUM(valor), 0) as faturamento_total,
      
      -- Receita Recebida (pagas)
      COALESCE(SUM(CASE 
        WHEN status IN ('RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH') 
        THEN valor ELSE 0 
      END), 0) as receita_recebida,
      
      -- Receita a Receber (não vencidas e não pagas)
      COALESCE(SUM(CASE 
        WHEN data_vencimento > $3 
        AND status NOT IN ('RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH')
        THEN valor ELSE 0 
      END), 0) as receita_a_receber,
      
      -- Receita Vencida (vencidas e não pagas)
      COALESCE(SUM(CASE 
        WHEN data_vencimento <= $3 
        AND status NOT IN ('RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH')
        THEN valor ELSE 0 
      END), 0) as receita_vencida
      
    FROM cobrancas
    WHERE data_criacao >= $1 AND data_criacao <= $2
      AND deletado IS NOT TRUE
  `;
  
  const result = await databaseService.query(query, [dataInicio, dataFim, hoje]);
  const row = result.rows[0];
  
  const faturamentoTotal = parseFloat(row.faturamento_total) || 0;
  const receitaRecebida = parseFloat(row.receita_recebida) || 0;
  const receitaAReceber = parseFloat(row.receita_a_receber) || 0;
  const receitaVencida = parseFloat(row.receita_vencida) || 0;
  
  // Taxa de inadimplência: (vencido / (recebido + vencido)) * 100
  const baseCalculo = receitaRecebida + receitaVencida;
  const taxaInadimplencia = baseCalculo > 0 
    ? parseFloat(((receitaVencida / baseCalculo) * 100).toFixed(3))
    : 0;
  
  return {
    faturamentoTotal: parseFloat(faturamentoTotal.toFixed(2)),
    receitaRecebida: parseFloat(receitaRecebida.toFixed(2)),
    receitaAReceber: parseFloat(receitaAReceber.toFixed(2)),
    receitaVencida: parseFloat(receitaVencida.toFixed(2)),
    taxaInadimplencia
  };
}

/**
 * Calcula indicadores operacionais
 */
async function calcularIndicadoresOperacionais(dataInicio, dataFim) {
  // Query para contar clientes, vendas, etc
  const query = `
    SELECT
      -- Total de clientes distintos com cobranças
      COUNT(DISTINCT c.cliente_id) as total_clientes,
      
      -- Total de vendas (parcelamentos distintos)
      COUNT(DISTINCT c.parcelamento_id) FILTER (WHERE c.parcelamento_id IS NOT NULL) as total_vendas,
      
      -- Faturamento total para calcular ticket médio
      COALESCE(SUM(c.valor), 0) as faturamento_total
      
    FROM cobrancas c
    WHERE c.data_criacao >= $1 AND c.data_criacao <= $2
      AND c.deletado IS NOT TRUE
  `;
  
  const result = await databaseService.query(query, [dataInicio, dataFim]);
  const row = result.rows[0];
  
  // Clientes novos no mês atual
  const primeiroDiaMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const clientesNovosQuery = `
    SELECT COUNT(DISTINCT cliente_id) as novos_clientes
    FROM cobrancas
    WHERE data_criacao >= $1
      AND deletado IS NOT TRUE
  `;
  const clientesNovosResult = await databaseService.query(clientesNovosQuery, [primeiroDiaMes]);
  
  // Total de rotas ativas (sem data_termino ou com data_termino no futuro)
  const rotasQuery = `
    SELECT COUNT(*) as total_rotas
    FROM rotas
    WHERE data_termino IS NULL OR data_termino > NOW()
  `;
  const rotasResult = await databaseService.query(rotasQuery);
  
  // Total de vendedores ativos
  const vendedoresQuery = `
    SELECT COUNT(DISTINCT vendedor_id) as total_vendedores
    FROM rotas
    WHERE data_termino IS NULL OR data_termino > NOW()
  `;
  const vendedoresResult = await databaseService.query(vendedoresQuery);
  
  const totalClientes = parseInt(row.total_clientes) || 0;
  const totalVendas = parseInt(row.total_vendas) || 0;
  const faturamentoTotal = parseFloat(row.faturamento_total) || 0;
  const novosClientesMes = parseInt(clientesNovosResult.rows[0].novos_clientes) || 0;
  const totalRotas = parseInt(rotasResult.rows[0].total_rotas) || 0;
  const totalVendedores = parseInt(vendedoresResult.rows[0].total_vendedores) || 0;
  
  // Ticket médio
  const ticketMedio = totalVendas > 0 
    ? parseFloat((faturamentoTotal / totalVendas).toFixed(2))
    : 0;
  
  return {
    totalClientes,
    novosClientesMes,
    totalVendas,
    totalRotas,
    totalVendedores,
    ticketMedio
  };
}

/**
 * Calcula análise de parcelas
 */
async function calcularAnaliseParcelas(dataInicio, dataFim) {
  const hoje = new Date().toISOString().split('T')[0];
  
  const query = `
    SELECT
      -- Parcelas Pagas
      COUNT(*) FILTER (
        WHERE status IN ('RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH')
      ) as pagas_qtd,
      COALESCE(SUM(valor) FILTER (
        WHERE status IN ('RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH')
      ), 0) as pagas_valor,
      
      -- Parcelas a Vencer
      COUNT(*) FILTER (
        WHERE data_vencimento > $3
        AND status NOT IN ('RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH')
      ) as a_vencer_qtd,
      COALESCE(SUM(valor) FILTER (
        WHERE data_vencimento > $3
        AND status NOT IN ('RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH')
      ), 0) as a_vencer_valor,
      
      -- Parcelas Vencidas
      COUNT(*) FILTER (
        WHERE data_vencimento <= $3
        AND status NOT IN ('RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH')
      ) as vencidas_qtd,
      COALESCE(SUM(valor) FILTER (
        WHERE data_vencimento <= $3
        AND status NOT IN ('RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH')
      ), 0) as vencidas_valor
      
    FROM cobrancas
    WHERE data_criacao >= $1 AND data_criacao <= $2
      AND deletado IS NOT TRUE
  `;
  
  const result = await databaseService.query(query, [dataInicio, dataFim, hoje]);
  const row = result.rows[0];
  
  return {
    pagas: {
      quantidade: parseInt(row.pagas_qtd) || 0,
      valor: parseFloat(row.pagas_valor) || 0
    },
    aVencer: {
      quantidade: parseInt(row.a_vencer_qtd) || 0,
      valor: parseFloat(row.a_vencer_valor) || 0
    },
    vencidas: {
      quantidade: parseInt(row.vencidas_qtd) || 0,
      valor: parseFloat(row.vencidas_valor) || 0
    }
  };
}

/**
 * Calcula alertas
 */
async function calcularAlertas() {
  const hoje = new Date().toISOString().split('T')[0];
  const trintaDiasAtras = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  // Parcelas vencendo hoje
  const vencendoHojeQuery = `
    SELECT COUNT(*) as total
    FROM cobrancas
    WHERE data_vencimento = $1
      AND status NOT IN ('RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH')
      AND deletado IS NOT TRUE
  `;
  const vencendoHojeResult = await databaseService.query(vencendoHojeQuery, [hoje]);
  
  // Clientes com atraso de 30+ dias
  const atraso30DiasQuery = `
    SELECT COUNT(DISTINCT cliente_id) as total
    FROM cobrancas
    WHERE data_vencimento <= $1
      AND status NOT IN ('RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH')
      AND deletado IS NOT TRUE
  `;
  const atraso30DiasResult = await databaseService.query(atraso30DiasQuery, [trintaDiasAtras]);
  
  // Top 10 maiores devedores
  const maioresDevedoresQuery = `
    SELECT 
      c.cliente_id as "clienteId",
      cl.nome as "nomeCliente",
      SUM(c.valor) as "valorDevido"
    FROM cobrancas c
    JOIN clientes cl ON cl.id = c.cliente_id
    WHERE c.data_vencimento <= $1
      AND c.status NOT IN ('RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH')
      AND c.deletado IS NOT TRUE
    GROUP BY c.cliente_id, cl.nome
    ORDER BY "valorDevido" DESC
    LIMIT 10
  `;
  const maioresDevedoresResult = await databaseService.query(maioresDevedoresQuery, [hoje]);
  
  return {
    parcelasVencendoHoje: parseInt(vencendoHojeResult.rows[0].total) || 0,
    clientesAtraso30Dias: parseInt(atraso30DiasResult.rows[0].total) || 0,
    maioresDevedores: maioresDevedoresResult.rows.map(row => ({
      clienteId: row.clienteId,
      nomeCliente: row.nomeCliente,
      valorDevido: parseFloat(row.valorDevido) || 0
    }))
  };
}

module.exports = router;
