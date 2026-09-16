import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import apiRouter from './routes/api';

export const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[AURELIS-API] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    platform: 'AURELIS Private Wealth API Core',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Mount V1 API
app.use('/v1', apiRouter);

// Interactive OpenAPI Specification & Visual Docs
app.get('/v1/openapi.json', (req: Request, res: Response) => {
  res.json({
    openapi: '3.0.3',
    info: {
      title: 'AURELIS Global Wealth & Transfers API',
      description: 'Production-grade private banking, multi-currency ledger, FX rate locks, and global transfer endpoints.',
      version: '1.0.0',
      contact: {
        name: 'AURELIS Engineering & Treasury',
        email: 'api@aurelis.com',
      },
    },
    servers: [
      { url: 'http://localhost:4000/v1', description: 'Local Development Core' },
      { url: 'https://api.aurelis.com/v1', description: 'Production Sovereign Gateway' },
    ],
    paths: {
      '/auth/login': {
        post: {
          summary: 'Client authentication',
          tags: ['Auth'],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { email: { type: 'string' }, password: { type: 'string' } },
                },
              },
            },
          },
          responses: { '200': { description: 'Authenticated successfully' } },
        },
      },
      '/wallets': {
        get: {
          summary: 'Retrieve all multi-currency accounts and total portfolio valuation',
          tags: ['Wallets'],
          responses: { '200': { description: 'List of wallets and consolidated USD balance' } },
        },
        post: {
          summary: 'Provision a new multi-currency account',
          tags: ['Wallets'],
          responses: { '201': { description: 'Account provisioned' } },
        },
      },
      '/transfers/execute': {
        post: {
          summary: 'Atomically execute a money transfer with double-entry ledger settlement',
          tags: ['Transfers'],
          parameters: [
            {
              name: 'Idempotency-Key',
              in: 'header',
              required: false,
              schema: { type: 'string' },
            },
          ],
          responses: { '201': { description: 'Transfer settled' } },
        },
      },
      '/fx/rates': {
        get: {
          summary: 'Get real-time spot foreign exchange matrix',
          tags: ['Foreign Exchange'],
          responses: { '200': { description: 'Real-time interbank rates' } },
        },
      },
      '/fx/convert': {
        post: {
          summary: 'Execute instantaneous currency conversion with 60-second rate lock',
          tags: ['Foreign Exchange'],
          responses: { '201': { description: 'Converted successfully' } },
        },
      },
      '/recipients': {
        get: {
          summary: 'Retrieve beneficiary directory',
          tags: ['Beneficiaries'],
          responses: { '200': { description: 'Beneficiaries list' } },
        },
      },
      '/cards': {
        get: {
          summary: 'Retrieve physical and virtual luxury cards',
          tags: ['Cards'],
          responses: { '200': { description: 'Cards list' } },
        },
      },
      '/transactions': {
        get: {
          summary: 'Audit ledger and transaction history',
          tags: ['Transactions'],
          responses: { '200': { description: 'Paginated transactions list' } },
        },
      },
    },
  });
});

// Interactive HTML Documentation Viewer
app.get('/api-docs', (req: Request, res: Response) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>AURELIS API Documentation — Swagger UI</title>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
        <style>
          body { margin: 0; background: #F7F6F2; font-family: 'Plus Jakarta Sans', sans-serif; }
          .topbar { background-color: #123C32 !important; padding: 14px 20px !important; border-bottom: 2px solid #B69A62; }
          .topbar-wrapper { max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; }
          .brand { font-family: 'Playfair Display', serif; font-size: 20px; font-weight: bold; color: #FAF9F5; letter-spacing: 0.15em; text-decoration: none; }
          .badge { background: #B69A62; color: #123C32; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; }
          .swagger-ui .info { margin: 30px 0 !important; }
          .swagger-ui .btn.authorize { color: #123C32 !important; border-color: #123C32 !important; }
        </style>
      </head>
      <body>
        <div class="topbar">
          <div class="topbar-wrapper">
            <a href="/" class="brand">AURELIS</a>
            <span class="badge">PRIVATE WEALTH API CORE v1.0</span>
          </div>
        </div>
        <div id="swagger-ui"></div>
        <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
        <script>
          window.onload = () => {
            window.ui = SwaggerUIBundle({
              url: '/v1/openapi.json',
              dom_id: '#swagger-ui',
              deepLinking: true,
              presets: [
                SwaggerUIBundle.presets.apis,
                SwaggerUIBundle.SwaggerUIStandalonePreset
              ],
            });
          };
        </script>
      </body>
    </html>
  `);
});

// ================= PRODUCTION STATIC SERVING & SPA FALLBACK =================
const distPath = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));

  app.get('*', (req: Request, res: Response, next) => {
    if (
      req.path.startsWith('/v1') ||
      req.path.startsWith('/api-docs') ||
      req.path.startsWith('/health') ||
      req.path.startsWith('/ws')
    ) {
      return next();
    }
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    next();
  });
}

