/**
 * @swagger
 * tags:
 *   name: Webhooks
 *   description: Endpoints para receber eventos do Asaas via webhook
 */

/**
 * @swagger
 * /webhook/asaas:
 *   post:
 *     summary: Recebe eventos de pagamento do Asaas
 *     description: |
 *       Este endpoint recebe webhooks do Asaas quando eventos de pagamento ocorrem.
 *       
 *       **Funcionalidades:**
 *       - Registra todos os eventos na tabela `webhook_eventos`
 *       - Sincroniza automaticamente dados do cliente (upsert)
 *       - Sincroniza automaticamente dados da cobrança (upsert)
 *       
 *       **Eventos Monitorados:**
 *       - PAYMENT_CREATED - Pagamento criado
 *       - PAYMENT_UPDATED - Pagamento atualizado
 *       - PAYMENT_CONFIRMED - Pagamento confirmado
 *       - PAYMENT_RECEIVED - Pagamento recebido
 *       - PAYMENT_RECEIVED_IN_CASH - Pagamento recebido em dinheiro
 *       - PAYMENT_OVERDUE - Pagamento vencido
 *       - PAYMENT_DELETED - Pagamento deletado
 *       - PAYMENT_RESTORED - Pagamento restaurado
 *       - PAYMENT_REFUNDED - Pagamento reembolsado
 *       - PAYMENT_PARTIALLY_REFUNDED - Pagamento parcialmente reembolsado
 *       - PAYMENT_ANTICIPATED - Pagamento antecipado
 *       - PAYMENT_AWAITING_RISK_ANALYSIS - Aguardando análise de risco
 *       - PAYMENT_APPROVED_BY_RISK_ANALYSIS - Aprovado pela análise de risco
 *       
 *       **Configuração:**
 *       O webhook é criado automaticamente ao iniciar o servidor se a variável
 *       `WEBHOOK_URL` estiver configurada no `.env`.
 *       
 *       **Documentação completa:** Ver `docs/WEBHOOKS.md`
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - event
 *               - payment
 *             properties:
 *               event:
 *                 type: string
 *                 description: Tipo do evento que ocorreu
 *                 enum:
 *                   - PAYMENT_CREATED
 *                   - PAYMENT_UPDATED
 *                   - PAYMENT_CONFIRMED
 *                   - PAYMENT_RECEIVED
 *                   - PAYMENT_RECEIVED_IN_CASH
 *                   - PAYMENT_OVERDUE
 *                   - PAYMENT_DELETED
 *                   - PAYMENT_RESTORED
 *                   - PAYMENT_REFUNDED
 *                   - PAYMENT_PARTIALLY_REFUNDED
 *                   - PAYMENT_ANTICIPATED
 *                   - PAYMENT_AWAITING_RISK_ANALYSIS
 *                   - PAYMENT_APPROVED_BY_RISK_ANALYSIS
 *                 example: PAYMENT_RECEIVED
 *               payment:
 *                 type: object
 *                 description: Dados completos do pagamento
 *                 required:
 *                   - id
 *                   - customer
 *                   - billingType
 *                   - value
 *                   - status
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: ID único do pagamento no Asaas
 *                     example: pay_1234567890abcdef
 *                   customer:
 *                     type: string
 *                     description: ID do cliente no Asaas
 *                     example: cus_0987654321fedcba
 *                   billingType:
 *                     type: string
 *                     description: Forma de pagamento
 *                     enum:
 *                       - BOLETO
 *                       - CREDIT_CARD
 *                       - PIX
 *                       - UNDEFINED
 *                     example: PIX
 *                   value:
 *                     type: number
 *                     format: float
 *                     description: Valor da cobrança
 *                     example: 150.00
 *                   status:
 *                     type: string
 *                     description: Status atual do pagamento
 *                     enum:
 *                       - PENDING
 *                       - RECEIVED
 *                       - CONFIRMED
 *                       - OVERDUE
 *                       - REFUNDED
 *                       - RECEIVED_IN_CASH
 *                     example: RECEIVED
 *                   dueDate:
 *                     type: string
 *                     format: date
 *                     description: Data de vencimento
 *                     example: "2024-01-15"
 *                   description:
 *                     type: string
 *                     description: Descrição da cobrança
 *                     example: Venda #123 - Produto XYZ
 *                   invoiceUrl:
 *                     type: string
 *                     format: uri
 *                     description: URL da fatura/cobrança
 *                     example: https://www.asaas.com/i/1234567890
 *                   invoiceNumber:
 *                     type: string
 *                     description: Número da nota fiscal
 *                     example: "001234"
 *                   paymentDate:
 *                     type: string
 *                     format: date
 *                     description: Data em que o pagamento foi recebido
 *                     example: "2024-01-10"
 *                   clientPaymentDate:
 *                     type: string
 *                     format: date
 *                     description: Data em que o pagamento foi creditado
 *                     example: "2024-01-10"
 *                   installmentNumber:
 *                     type: integer
 *                     description: Número da parcela (se parcelado)
 *                     example: 1
 *                   installmentCount:
 *                     type: integer
 *                     description: Total de parcelas
 *                     example: 12
 *           examples:
 *             paymentReceived:
 *               summary: Pagamento Recebido via PIX
 *               value:
 *                 event: PAYMENT_RECEIVED
 *                 payment:
 *                   id: pay_abc123xyz789
 *                   customer: cus_def456uvw012
 *                   billingType: PIX
 *                   value: 150.00
 *                   status: RECEIVED
 *                   dueDate: "2024-01-15"
 *                   paymentDate: "2024-01-10"
 *                   description: Venda #123
 *                   invoiceUrl: https://www.asaas.com/i/abc123
 *             paymentConfirmed:
 *               summary: Pagamento Confirmado via Cartão
 *               value:
 *                 event: PAYMENT_CONFIRMED
 *                 payment:
 *                   id: pay_xyz789abc123
 *                   customer: cus_uvw012def456
 *                   billingType: CREDIT_CARD
 *                   value: 250.00
 *                   status: CONFIRMED
 *                   dueDate: "2024-01-20"
 *                   description: Venda #456
 *                   invoiceUrl: https://www.asaas.com/i/xyz789
 *                   installmentNumber: 1
 *                   installmentCount: 3
 *             paymentOverdue:
 *               summary: Pagamento Vencido
 *               value:
 *                 event: PAYMENT_OVERDUE
 *                 payment:
 *                   id: pay_overdue123
 *                   customer: cus_client789
 *                   billingType: BOLETO
 *                   value: 100.00
 *                   status: OVERDUE
 *                   dueDate: "2024-01-01"
 *                   description: Venda #789
 *                   invoiceUrl: https://www.asaas.com/i/overdue123
 *     responses:
 *       200:
 *         description: Webhook processado com sucesso
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: OK
 *       500:
 *         description: Erro ao processar webhook
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Erro ao processar webhook
 *                 message:
 *                   type: string
 *                   example: Detalhes do erro...
 */
