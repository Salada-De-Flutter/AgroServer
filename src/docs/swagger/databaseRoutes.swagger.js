/**
 * @swagger
 * /database/diagnostics:
 *   get:
 *     summary: Diagnóstico do banco de dados
 *     tags: [Database]
 *     responses:
 *       200:
 *         description: Status do banco de dados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 details:
 *                   type: object
 *                   additionalProperties: true
 */

/**
 * @swagger
 * /database/diagnostics/parcelamentos:
 *   get:
 *     summary: Diagnóstico dos parcelamentos no banco de dados
 *     tags: [Database]
 *     responses:
 *       200:
 *         description: Status dos parcelamentos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 details:
 *                   type: object
 *                   additionalProperties: true
 */
