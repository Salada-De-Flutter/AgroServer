/**
 * @swagger
 * /api/dashboard/metricas:
 *   post:
 *     summary: Retorna métricas completas do dashboard
 *     description: |
 *       Calcula e retorna todas as métricas financeiras, operacionais, análise de parcelas e alertas.
 *       
 *       **Cálculos Realizados:**
 *       
 *       **Métricas Financeiras:**
 *       - faturamentoTotal: Soma de todas as parcelas (pagas + a vencer + vencidas)
 *       - receitaRecebida: Soma das parcelas com status RECEIVED/CONFIRMED/RECEIVED_IN_CASH
 *       - receitaAReceber: Soma das parcelas não vencidas e não pagas
 *       - receitaVencida: Soma das parcelas vencidas e não pagas
 *       - taxaInadimplencia: (receitaVencida / (receitaRecebida + receitaVencida)) * 100
 *       
 *       **Indicadores Operacionais:**
 *       - totalClientes: Clientes distintos com cobranças
 *       - novosClientesMes: Clientes criados no mês atual
 *       - totalVendas: Parcelamentos distintos
 *       - totalRotas: Rotas ativas (sem data_termino)
 *       - totalVendedores: Vendedores em rotas ativas
 *       - ticketMedio: faturamentoTotal / totalVendas
 *       
 *       **Análise de Parcelas:**
 *       - pagas: Quantidade e valor de parcelas pagas
 *       - aVencer: Quantidade e valor de parcelas não vencidas
 *       - vencidas: Quantidade e valor de parcelas vencidas
 *       
 *       **Alertas:**
 *       - parcelasVencendoHoje: Parcelas com vencimento hoje
 *       - clientesAtraso30Dias: Clientes com parcelas vencidas há mais de 30 dias
 *       - maioresDevedores: Top 10 clientes com maior valor em atraso
 *     tags:
 *       - Dashboard
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - usuario_id
 *             properties:
 *               usuario_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID do usuário (obrigatório para autorização)
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *               data_inicio:
 *                 type: string
 *                 format: date
 *                 description: Data de início do período (opcional, padrão = primeiro dia do mês atual)
 *                 example: "2025-01-01"
 *               data_fim:
 *                 type: string
 *                 format: date
 *                 description: Data de fim do período (opcional, padrão = hoje)
 *                 example: "2025-12-31"
 *           examples:
 *             periodoCompleto:
 *               summary: Período completo especificado
 *               value:
 *                 usuario_id: "550e8400-e29b-41d4-a716-446655440000"
 *                 data_inicio: "2025-01-01"
 *                 data_fim: "2025-12-31"
 *             periodoDefault:
 *               summary: Período padrão (mês atual até hoje)
 *               value:
 *                 usuario_id: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Métricas calculadas com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     metricasFinanceiras:
 *                       type: object
 *                       properties:
 *                         faturamentoTotal:
 *                           type: number
 *                           format: float
 *                           description: Soma de todas as parcelas
 *                           example: 150000.00
 *                         receitaRecebida:
 *                           type: number
 *                           format: float
 *                           description: Valor total recebido (parcelas pagas)
 *                           example: 95000.00
 *                         receitaAReceber:
 *                           type: number
 *                           format: float
 *                           description: Valor a receber (parcelas não vencidas)
 *                           example: 35000.00
 *                         receitaVencida:
 *                           type: number
 *                           format: float
 *                           description: Valor vencido (parcelas atrasadas)
 *                           example: 20000.00
 *                         taxaInadimplencia:
 *                           type: number
 *                           format: float
 *                           description: Taxa de inadimplência em percentual (3 casas decimais)
 *                           example: 13.333
 *                     indicadoresOperacionais:
 *                       type: object
 *                       properties:
 *                         totalClientes:
 *                           type: integer
 *                           description: Total de clientes com cobranças
 *                           example: 87
 *                         novosClientesMes:
 *                           type: integer
 *                           description: Novos clientes no mês atual
 *                           example: 12
 *                         totalVendas:
 *                           type: integer
 *                           description: Total de vendas/parcelamentos
 *                           example: 145
 *                         totalRotas:
 *                           type: integer
 *                           description: Total de rotas ativas
 *                           example: 8
 *                         totalVendedores:
 *                           type: integer
 *                           description: Total de vendedores ativos
 *                           example: 5
 *                         ticketMedio:
 *                           type: number
 *                           format: float
 *                           description: Ticket médio por venda (2 casas decimais)
 *                           example: 1724.14
 *                     analiseParcelas:
 *                       type: object
 *                       properties:
 *                         pagas:
 *                           type: object
 *                           properties:
 *                             quantidade:
 *                               type: integer
 *                               example: 320
 *                             valor:
 *                               type: number
 *                               format: float
 *                               example: 95000.00
 *                         aVencer:
 *                           type: object
 *                           properties:
 *                             quantidade:
 *                               type: integer
 *                               example: 120
 *                             valor:
 *                               type: number
 *                               format: float
 *                               example: 35000.00
 *                         vencidas:
 *                           type: object
 *                           properties:
 *                             quantidade:
 *                               type: integer
 *                               example: 45
 *                             valor:
 *                               type: number
 *                               format: float
 *                               example: 20000.00
 *                     alertas:
 *                       type: object
 *                       properties:
 *                         parcelasVencendoHoje:
 *                           type: integer
 *                           description: Parcelas com vencimento hoje
 *                           example: 8
 *                         clientesAtraso30Dias:
 *                           type: integer
 *                           description: Clientes com atraso superior a 30 dias
 *                           example: 5
 *                         maioresDevedores:
 *                           type: array
 *                           description: Top 10 maiores devedores
 *                           items:
 *                             type: object
 *                             properties:
 *                               clienteId:
 *                                 type: string
 *                                 example: "cus_000005116116"
 *                               nomeCliente:
 *                                 type: string
 *                                 example: "João Silva"
 *                               valorDevido:
 *                                 type: number
 *                                 format: float
 *                                 example: 15000.00
 *                 performance:
 *                   type: object
 *                   properties:
 *                     tempoProcessamento:
 *                       type: string
 *                       description: Tempo de processamento em milissegundos
 *                       example: "250ms"
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       description: Timestamp da resposta
 *                       example: "2025-12-05T10:30:00Z"
 *             examples:
 *               sucessoComDados:
 *                 summary: Resposta com dados
 *                 value:
 *                   success: true
 *                   data:
 *                     metricasFinanceiras:
 *                       faturamentoTotal: 150000.00
 *                       receitaRecebida: 95000.00
 *                       receitaAReceber: 35000.00
 *                       receitaVencida: 20000.00
 *                       taxaInadimplencia: 13.333
 *                     indicadoresOperacionais:
 *                       totalClientes: 87
 *                       novosClientesMes: 12
 *                       totalVendas: 145
 *                       totalRotas: 8
 *                       totalVendedores: 5
 *                       ticketMedio: 1724.14
 *                     analiseParcelas:
 *                       pagas:
 *                         quantidade: 320
 *                         valor: 95000.00
 *                       aVencer:
 *                         quantidade: 120
 *                         valor: 35000.00
 *                       vencidas:
 *                         quantidade: 45
 *                         valor: 20000.00
 *                     alertas:
 *                       parcelasVencendoHoje: 8
 *                       clientesAtraso30Dias: 5
 *                       maioresDevedores:
 *                         - clienteId: "cus_000005116116"
 *                           nomeCliente: "João Silva"
 *                           valorDevido: 15000.00
 *                         - clienteId: "cus_000005116117"
 *                           nomeCliente: "Maria Santos"
 *                           valorDevido: 12500.00
 *                   performance:
 *                     tempoProcessamento: "250ms"
 *                     timestamp: "2025-12-05T10:30:00.000Z"
 *               sucessoSemDados:
 *                 summary: Resposta sem dados (valores zerados)
 *                 value:
 *                   success: true
 *                   data:
 *                     metricasFinanceiras:
 *                       faturamentoTotal: 0
 *                       receitaRecebida: 0
 *                       receitaAReceber: 0
 *                       receitaVencida: 0
 *                       taxaInadimplencia: 0
 *                     indicadoresOperacionais:
 *                       totalClientes: 0
 *                       novosClientesMes: 0
 *                       totalVendas: 0
 *                       totalRotas: 0
 *                       totalVendedores: 0
 *                       ticketMedio: 0
 *                     analiseParcelas:
 *                       pagas:
 *                         quantidade: 0
 *                         valor: 0
 *                       aVencer:
 *                         quantidade: 0
 *                         valor: 0
 *                       vencidas:
 *                         quantidade: 0
 *                         valor: 0
 *                     alertas:
 *                       parcelasVencendoHoje: 0
 *                       clientesAtraso30Dias: 0
 *                       maioresDevedores: []
 *                   performance:
 *                     tempoProcessamento: "125ms"
 *                     timestamp: "2025-12-05T10:30:00.000Z"
 *       400:
 *         description: Requisição inválida (falta usuario_id)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "usuario_id é obrigatório"
 *       500:
 *         description: Erro ao calcular métricas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Erro ao calcular métricas do dashboard"
 *                 error:
 *                   type: string
 *                   example: "Connection timeout"
 */
