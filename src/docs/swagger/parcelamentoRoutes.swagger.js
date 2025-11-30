/**
 * @swagger
 * /rota/vendas:
 *   post:
 *     summary: Lista vendas, clientes e status de parcelas de uma rota
 *     tags: [Rotas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rota_id:
 *                 type: string
 *               page:
 *                 type: integer
 *                 default: 1
 *               limit:
 *                 type: integer
 *                 default: 1000
 *     responses:
 *       200:
 *         description: Lista de vendas da rota
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     hasMore:
 *                       type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       parcelamentoId:
 *                         type: string
 *                       clienteId:
 *                         type: string
 *                       nomeCliente:
 *                         type: string
 *                       status:
 *                         type: string
 *                       parcelasVencidas:
 *                         type: object
 *                         properties:
 *                           quantidade:
 *                             type: integer
 *                           valor:
 *                             type: number
 *                           parcelas:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 valor:
 *                                   type: number
 *                                 dataVencimento:
 *                                   type: string
 *                       parcelasPagas:
 *                         type: object
 *                         properties:
 *                           quantidade:
 *                             type: integer
 *                           valor:
 *                             type: number
 *                           parcelas:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 valor:
 *                                   type: number
 *                                 dataVencimento:
 *                                   type: string
 *                                 dataPagamento:
 *                                   type: string
 *                                 formaPagamento:
 *                                   type: string
 *                       parcelasAVencer:
 *                         type: object
 *                         properties:
 *                           quantidade:
 *                             type: integer
 *                           valor:
 *                             type: number
 *                           parcelas:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 valor:
 *                                   type: number
 *                                 dataVencimento:
 *                                   type: string
 */
