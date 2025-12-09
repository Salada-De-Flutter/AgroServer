/**
 * @swagger
 * /clientes/listar:
 *   get:
 *     summary: Lista todos os clientes cadastrados
 *     tags: [Clientes]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Página para paginação
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Limite de itens por página
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Busca por nome, CPF ou CNPJ
 *     responses:
 *       200:
 *         description: Lista de clientes
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
 *                       id:
 *                         type: string
 *                       nome:
 *                         type: string
 *                       cpfCnpj:
 *                         type: string
 *                       email:
 *                         type: string
 *                       telefone:
 *                         type: string
 *                       status:
 *                         type: string
 */

/**
 * @swagger
 * /clientes/{cliente_id}/parcelamentos:
 *   get:
 *     summary: Lista todos os parcelamentos e cobranças à vista de um cliente
 *     description: |
 *       Retorna todas as cobranças (parceladas e à vista) de um cliente específico.
 *       
 *       **Comportamento:**
 *       - Cobranças **parceladas**: Agrupadas por `parcelamento_id`
 *       - Cobranças **à vista**: Identificadas pelo próprio `id` (quando `parcelamento_id` é NULL)
 *       
 *       **Distinção:**
 *       - `numeroParcelas = 1` e sem `parcelamento_id` = À vista
 *       - `numeroParcelas > 1` ou com `parcelamento_id` = Parcelado
 *     tags: [Clientes]
 *     parameters:
 *       - in: path
 *         name: cliente_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do cliente (formato Asaas - cus_XXXXX)
 *         example: "cus_000151909025"
 *     responses:
 *       200:
 *         description: Lista de parcelamentos e cobranças à vista do cliente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 cliente:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "cus_000151909025"
 *                     nome:
 *                       type: string
 *                       example: "João Silva"
 *                     cpfCnpj:
 *                       type: string
 *                       example: "123.456.789-00"
 *                 parcelamentos:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: ID do parcelamento ou da cobrança (se à vista)
 *                         example: "pay_37iifvjle7js4zeu"
 *                       valor:
 *                         type: number
 *                         format: float
 *                         description: Valor total da cobrança ou soma das parcelas
 *                         example: 1500
 *                       numeroParcelas:
 *                         type: integer
 *                         description: Número de parcelas (1 = à vista)
 *                         example: 1
 *                       descricao:
 *                         type: string
 *                         description: Descrição da cobrança
 *                         example: "Compra de produtos"
 *                       dataCriacao:
 *                         type: string
 *                         format: date-time
 *                         description: Data de criação da cobrança
 *                         example: "2025-12-09T14:19:30.811Z"
 *                       status:
 *                         type: string
 *                         description: Status da cobrança
 *                         enum: [PENDING, RECEIVED, CONFIRMED, OVERDUE, REFUNDED, RECEIVED_IN_CASH, REFUND_REQUESTED, CHARGEBACK_REQUESTED, CHARGEBACK_DISPUTE, AWAITING_CHARGEBACK_REVERSAL, DUNNING_REQUESTED, DUNNING_RECEIVED, AWAITING_RISK_ANALYSIS]
 *                         example: "PENDING"
 *                       urlBoleto:
 *                         type: string
 *                         nullable: true
 *                         description: URL do boleto bancário
 *                         example: null
 *                       urlFatura:
 *                         type: string
 *                         nullable: true
 *                         description: URL da fatura/visualização do pagamento
 *                         example: "https://www.asaas.com/i/37iifvjle7js4zeu"
 *                       tipoVenda:
 *                         type: string
 *                         description: Tipo de venda
 *                         enum: ["à vista", "parcelado"]
 *                         example: "à vista"
 *             examples:
 *               comParcelamentosEAVista:
 *                 summary: Cliente com cobranças parceladas e à vista
 *                 value:
 *                   success: true
 *                   cliente:
 *                     id: "cus_000151909025"
 *                     nome: "João Silva"
 *                     cpfCnpj: "123.456.789-00"
 *                   parcelamentos:
 *                     - id: "pay_37iifvjle7js4zeu"
 *                       valor: 1500
 *                       numeroParcelas: 1
 *                       descricao: "Sem descrição"
 *                       dataCriacao: "2025-12-09T14:19:30.811Z"
 *                       status: "PENDING"
 *                       urlBoleto: null
 *                       urlFatura: "https://www.asaas.com/i/37iifvjle7js4zeu"
 *                       tipoVenda: "à vista"
 *                     - id: "pay_123456789"
 *                       valor: 3000
 *                       numeroParcelas: 3
 *                       descricao: "Compra parcelada"
 *                       dataCriacao: "2025-12-01T10:00:00.000Z"
 *                       status: "CONFIRMED"
 *                       urlBoleto: "https://..."
 *                       urlFatura: "https://www.asaas.com/i/123456789"
 *                       tipoVenda: "parcelado"
 *               somenteAVista:
 *                 summary: Cliente apenas com cobranças à vista
 *                 value:
 *                   success: true
 *                   cliente:
 *                     id: "cus_000151909025"
 *                     nome: "Maria Santos"
 *                     cpfCnpj: "987.654.321-00"
 *                   parcelamentos:
 *                     - id: "pay_abc123"
 *                       valor: 500
 *                       numeroParcelas: 1
 *                       descricao: "Pagamento único"
 *                       dataCriacao: "2025-12-09T10:00:00.000Z"
 *                       status: "RECEIVED"
 *                       urlBoleto: null
 *                       urlFatura: "https://www.asaas.com/i/abc123"
 *                       tipoVenda: "à vista"
 *       404:
 *         description: Cliente não encontrado
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
 *                   example: "Cliente não encontrado"
 *       500:
 *         description: Erro ao buscar parcelamentos
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
 *                   example: "Erro ao buscar parcelamentos"
 *                 error:
 *                   type: string
 */
