const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AgroServer API',
      version: '1.0.0',
      description: 'Documentação da API AgroServer',
    },
    servers: [
      {
        url: '/api',
        description: 'API local'
      }
    ],
  },
  apis: ['./src/docs/swagger/*.js'], // Caminho para os comentários JSDoc
};

module.exports = swaggerOptions;
