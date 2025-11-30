/**
 * @swagger
 * /asaas/sync:
 *   post:
 *     summary: Sincroniza dados do Asaas com o banco local
 *     tags: [Asaas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tipo:
 *                 type: string
 *                 enum: [clientes, pagamentos, todos]
 *                 description: Tipo de dados para sincronizar
 *     responses:
 *       200:
 *         description: Sincronização realizada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 detalhes:
 *                   type: object
 *                   additionalProperties: true
 *       400:
 *         description: Erro de validação
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */

/**
 * @swagger
 * /asaas/diagnostics:
 *   get:
 *     summary: Diagnóstico da integração com o Asaas
 *     tags: [Asaas]
 *     responses:
 *       200:
 *         description: Status da integração
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 detalhes:
 *                   type: object
 *                   additionalProperties: true
 */
