/**
 * @swagger
 * /example/{id}:
 *   get:
 *     summary: Exemplo de rota GET com parâmetro
 *     tags: [Exemplo]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de exemplo
 *     responses:
 *       200:
 *         description: Resposta de exemplo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 id:
 *                   type: string
 */

/**
 * @swagger
 * /example:
 *   post:
 *     summary: Exemplo de rota POST
 *     tags: [Exemplo]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       201:
 *         description: Dados recebidos com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   additionalProperties: true
 */
