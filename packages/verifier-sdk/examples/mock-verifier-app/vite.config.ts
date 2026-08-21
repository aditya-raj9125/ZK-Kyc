import path from 'path';
import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const relayStore = new Map<string, any>();

function relayPlugin(): Plugin {
  return {
    name: 'mock-relay-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || '';
        if (url.startsWith('/api/relay')) {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.end();
            return;
          }

          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => {
              body += chunk;
            });
            req.on('end', () => {
              try {
                const data = JSON.parse(body);
                if (data.requestId && data.proof) {
                  relayStore.set(data.requestId, data.proof);
                  res.setHeader('Content-Type', 'application/json');
                  res.statusCode = 200;
                  res.end(JSON.stringify({ ok: true }));
                  return;
                }
              } catch (e) {}
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Invalid payload' }));
            });
            return;
          }

          if (req.method === 'GET') {
            const parts = url.split('/');
            const requestId = parts[parts.length - 1]?.split('?')[0];
            if (requestId && relayStore.has(requestId)) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify({ proof: relayStore.get(requestId) }));
              return;
            }
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Proof not found' }));
            return;
          }
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), relayPlugin()],
  resolve: {
    alias: {
      '@zk-kyc/verifier-sdk': path.resolve(__dirname, '../../src/index.ts'),
      '@zk-kyc/zk-core': path.resolve(__dirname, '../../../zk-core/src/index.ts'),
      '@zk-kyc/shared-types': path.resolve(__dirname, '../../../shared-types/src/index.ts'),
    },
  },
  server: {
    port: 5174,
  },
});

