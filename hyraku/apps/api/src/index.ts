import express from 'express';
import cors from 'cors';
import { SERVICE_AREAS, SERVICE_DISTRICTS, TRADES, bookingsOpen } from '@hyraku/core';
import { adminRouter } from './routes/admin.js';
import { webhookRouter } from './routes/webhook.js';
import { assertTimezone, env } from './env.js';

// The public API.
//
// This process serves the marketing site, the field portal and Meta's webhook.
//
// INTERIM: the admin router is still mounted here. It belongs in apps/admin,
// which deploys to a separate host behind a private tunnel, and moves there in
// the commit that replaces its password-as-token auth with real sessions.
// Until then this app must not be exposed publicly.

assertTimezone();

const app = express();

app.set('trust proxy', 1);

app.use(
  cors({
    origin: [env.publicUrl],
    credentials: true,
    methods: ['GET', 'POST'],
  })
);

// The raw body is kept because Meta signs it — re-serialising JSON changes the
// bytes and the HMAC no longer matches.
app.use(
  '/webhook/whatsapp',
  express.json({
    limit: '1mb',
    verify: (req, _res, buf) => {
      (req as any).rawBody = buf;
    },
  })
);

app.use(express.json({ limit: '256kb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'hyraku-api' });
});

// Public — the marketing site reads this to build its deep links.
app.get('/api/catalog', async (_req, res, next) => {
  try {
    res.json({
      trades: TRADES,
      serviceDistricts: SERVICE_DISTRICTS,
      serviceAreas: SERVICE_AREAS,
      bookingsOpen: await bookingsOpen(),
    });
  } catch (err) {
    next(err);
  }
});

app.use('/api/admin', adminRouter); // INTERIM — see the note above
app.use('/webhook/whatsapp', webhookRouter);

app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const id = (req as any).id ?? Math.random().toString(36).slice(2, 10);
  // The message stays in the log. Returning it to the caller hands an attacker
  // the shape of the stack it came from.
  console.error(`[api] ${id}`, err);
  res.status(500).json({ error: 'Internal error', id });
});

const server = app.listen(env.port, () => {
  console.log(`hyraku-api listening on ${env.port}`);
});

// A SIGTERM during a deploy must not drop a webhook mid-flight.
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    server.close(async () => {
      const { prisma } = await import('@hyraku/db');
      await prisma.$disconnect();
      process.exit(0);
    });
  });
}
