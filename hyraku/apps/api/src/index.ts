import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { SERVICE_AREAS, SERVICE_DISTRICTS, TRADES, UPLOAD_ROOT, bookingsOpen } from '@hyraku/core';
import { adminRouter } from './routes/admin.js';
import { simRouter } from './routes/sim.js';
import { webhookRouter } from './routes/webhook.js';
import { assertCloudConfigured, env } from './env.js';

assertCloudConfigured();

const app = express();

app.use(cors());

// The raw body is kept because Meta signs it — re-serialising JSON changes the
// bytes and the HMAC no longer matches.
app.use(
  express.json({
    limit: '12mb', // WhatsApp images arrive base64-encoded from the simulator
    verify: (req, _res, buf) => {
      (req as any).rawBody = buf;
    },
  })
);

fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
app.use('/uploads', express.static(UPLOAD_ROOT));

app.get('/health', (_req, res) => {
  res.json({ ok: true, channel: env.channel, service: 'hyraku-api' });
});

// Public — the marketing site reads this to build its deep links.
app.get('/api/catalog', async (_req, res) => {
  res.json({
    trades: TRADES,
    serviceDistricts: SERVICE_DISTRICTS,
    serviceAreas: SERVICE_AREAS,
    bookingsOpen: await bookingsOpen(),
  });
});

app.use('/api/admin', adminRouter);
app.use('/api/sim', simRouter);
app.use('/webhook/whatsapp', webhookRouter);

// Serve the built console when there is one, so a demo can run from a single
// process. In development Vite serves it and proxies /api here instead.
const consoleDist = path.resolve(process.cwd(), 'apps/console/dist');
if (fs.existsSync(consoleDist)) {
  app.use(express.static(consoleDist));
  app.get('*', (_req, res) => res.sendFile(path.join(consoleDist, 'index.html')));
}

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[api]', err);
  res.status(500).json({ error: err.message });
});

app.listen(env.port, () => {
  console.log(`\n  Hyraku API  ·  http://localhost:${env.port}`);
  console.log(`  channel     ·  ${env.channel}`);
  if (env.channel === 'simulator') {
    console.log(`  simulator   ·  no Meta account needed for this demo\n`);
  } else {
    console.log(`  webhook     ·  POST /webhook/whatsapp\n`);
  }
});
