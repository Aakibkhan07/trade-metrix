import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const openApiSpec = {
    openapi: '3.0.0',
    info: {
      title: 'Trade Metrix API',
      version: '1.0.0',
      description: 'RESTful API for algorithmic trading on Indian securities markets',
      contact: {
        name: 'Trade Metrix Support',
        url: 'https://trademetrix.com/support',
      },
    },
    servers: [{ url: '/api/v1' }],
    paths: {
      '/strategies': {
        get: {
          summary: 'List trading strategies',
          tags: ['Strategies'],
          security: [{ bearerAuth: ['read:strategies'] }],
          responses: {
            200: {
              description: 'List of strategies',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      strategies: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Strategy' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          summary: 'Create a new strategy',
          tags: ['Strategies'],
          security: [{ bearerAuth: ['write:strategies'] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/StrategyInput' },
              },
            },
          },
          responses: {
            201: { description: 'Strategy created' },
          },
        },
      },
      '/orders': {
        get: {
          summary: 'List orders',
          tags: ['Orders'],
          security: [{ bearerAuth: ['read:orders'] }],
          responses: { 200: { description: 'List of orders' } },
        },
        post: {
          summary: 'Place an order',
          tags: ['Orders'],
          security: [{ bearerAuth: ['write:orders'] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/OrderInput' },
              },
            },
          },
          responses: { 201: { description: 'Order created' } },
        },
      },
      '/webhooks': {
        get: {
          summary: 'List webhooks',
          tags: ['Webhooks'],
          security: [{ bearerAuth: ['read:webhooks'] }],
          responses: { 200: { description: 'List of webhooks' } },
        },
        post: {
          summary: 'Create a webhook',
          tags: ['Webhooks'],
          security: [{ bearerAuth: ['write:webhooks'] }],
          responses: { 201: { description: 'Webhook created' } },
        },
      },
    },
    components: {
      schemas: {
        Strategy: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            strategy_type: { type: 'string' },
            status: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        StrategyInput: {
          type: 'object',
          required: ['name', 'strategy_type'],
          properties: {
            name: { type: 'string' },
            strategy_type: { type: 'string' },
            entry_signal: { type: 'object' },
            exit_signal: { type: 'object' },
          },
        },
        OrderInput: {
          type: 'object',
          required: ['symbol', 'quantity', 'order_type'],
          properties: {
            symbol: { type: 'string' },
            quantity: { type: 'number' },
            order_type: { type: 'string', enum: ['market', 'limit', 'stop'] },
            price: { type: 'number' },
          },
        },
      },
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'API key authentication',
        },
      },
    },
  }

  return NextResponse.json(openApiSpec)
}
