// swagger.js
const swaggerJsDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Cake Sweet',
      version: '1.0.0',
      description: 'Documentación Swagger de la API Cake Sweet',
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Servidor local' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./routes/*.js'] // <- revisa la ruta donde están tus rutas
};

const swaggerSpec = swaggerJsDoc(options);
module.exports = swaggerSpec;
