const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Multi-Platform Inventory Management API",
      version: "1.0.0",
      description:
        "REST API for the Multi-Platform Inventory Management System"
    },

    servers: [
      {
        url: "http://localhost:8080"
      }
    ],

    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      }
    },

    security: [
      {
        BearerAuth: []
      }
    ]
  },

  apis: [
    "./src/routes/*.js"
  ]
};

module.exports = swaggerJsdoc(options);