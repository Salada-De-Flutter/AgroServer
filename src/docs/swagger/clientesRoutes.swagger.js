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
