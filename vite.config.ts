import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { analyze, rateLimited, type AnalyzeInput } from './api/_lib/analyze';

// Serves POST /api/analyze during `npm run dev` using the same code as the Vercel function.
function devApi(env: Record<string, string>): Plugin {
  return {
    name: 'medscan-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/analyze', (req, res) => {
        const send = (status: number, body: unknown) => {
          res.statusCode = status;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify(body));
        };
        if (req.method !== 'POST') return send(405, { ok: false, error: 'Use POST.' });
        if (rateLimited(req.socket.remoteAddress ?? 'local', 60)) return send(429, { ok: false, error: 'Too many requests.' });
        const chunks: Buffer[] = [];
        req.on('data', (c: Buffer) => chunks.push(c));
        req.on('end', async () => {
          try {
            const input = JSON.parse(Buffer.concat(chunks).toString('utf8')) as AnalyzeInput;
            const reply = await analyze(input, env);
            send(reply.status, reply.body);
          } catch {
            send(400, { ok: false, error: 'Invalid request body.' });
          }
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), devApi(loadEnv(mode, process.cwd(), ''))],
  optimizeDeps: { exclude: ['lucide-react'] },
}));
