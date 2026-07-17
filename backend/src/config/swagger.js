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
        // Use an env override when available, otherwise default to local server + API prefix
        url: process.env.SWAGGER_BASE_URL || `http://localhost:${process.env.PORT || 8040}/api/v1`
      }
    ],

    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Not Found' },
            details: { type: 'object' }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 25 },
            total: { type: 'integer', example: 123 }
          }
        },
        AuthTokens: {
          type: 'object',
          properties: {
            accessToken: { type: 'string', example: 'eyJhbGciOiJI...' },
            refreshToken: { type: 'string', example: 'eyJhbGciOiJI...' }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            username: { type: 'string' },
            email: { type: 'string', format: 'email' },
            full_name: { type: 'string' }
          }
        },
        Product: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            sku: { type: 'string' },
            price: { type: 'number', format: 'float' },
            cost_price: { type: 'number', format: 'float' }
          }
        },
        Branch: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            code: { type: 'string' },
            address: { type: 'string' }
          }
        },
        InventoryItem: {
          type: 'object',
          properties: {
            product_id: { type: 'string', format: 'uuid' },
            branch_id: { type: 'string', format: 'uuid' },
            quantity: { type: 'number', example: 100 }
          }
        },
        AuditLog: {
          type: 'object',
          properties: {
            audit_id: { type: 'string' },
            user_id: { type: 'string' },
            action: { type: 'string' },
            entity_type: { type: 'string' },
            entity_id: { type: 'string' },
            details: { type: 'object' },
            ip_address: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        BusinessSetting: {
          type: 'object',
          properties: {
            key: { type: 'string' },
            value: { type: 'string' },
            meta: { type: 'object' }
          }
        },
        SystemSetting: {
          type: 'object',
          properties: {
            key: { type: 'string' },
            value: { type: 'string' },
            meta: { type: 'object' }
          }
        }
      }
    },

    security: [ { BearerAuth: [] } ],

    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Users', description: 'User management' },
      { name: 'Products', description: 'Product management' },
      { name: 'Categories', description: 'Category management' },
      { name: 'UoM', description: 'Units of measure' },
      { name: 'Suppliers', description: 'Suppliers' },
      { name: 'Customers', description: 'Customers' },
      { name: 'Inventory', description: 'Inventory operations' },
      { name: 'Sales', description: 'Sales and POS' },
      { name: 'Purchases', description: 'Purchase orders' },
      { name: 'Reports', description: 'Reporting endpoints' },
      { name: 'Notifications', description: 'Notifications' },
      { name: 'Sync', description: 'Synchronization endpoints' },
      { name: 'Branches', description: 'Branch management' },
      { name: 'Business', description: 'Business settings' },
      { name: 'System', description: 'System settings' },
      { name: 'Audit', description: 'Audit logs' }
    ],
  },

    apis: [
      // Relative to this file (src/config), route definitions live in ../routes
      "../routes/*.js"
    ]
};

module.exports = swaggerJsdoc(options);