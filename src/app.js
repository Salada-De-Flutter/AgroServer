const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rotas
app.use('/api', routes);

// Rota de health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'API está funcionando!' });
});

// Handler de erros
app.use(errorHandler);

module.exports = app;
