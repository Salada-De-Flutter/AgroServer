const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');

// Swagger UI setup
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerOptions = require('./docs/swagger');
const swaggerSpec = swaggerJsdoc(swaggerOptions);

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger docs route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'AgroServer API Docs',
}));

// Rotas
app.use('/api', routes);

// Rota de health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'API está funcionando!' });
});

// Handler de erros
app.use(errorHandler);

module.exports = app;
