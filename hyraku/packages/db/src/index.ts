import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

// The demo must run with no .env at all, from any working directory, so the
// SQLite file is resolved from this module rather than from the process cwd.
// Setting DATABASE_URL overrides it — that is the Postgres path.
const here = path.dirname(fileURLToPath(import.meta.url));
const defaultUrl = `file:${path.join(here, '..', 'prisma', 'hyraku.db').replace(/\\/g, '/')}`;

const url = process.env.DATABASE_URL || defaultUrl;

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url } },
    log: process.env.PRISMA_LOG ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });

// tsx watch reloads the module graph on every save; without this the process
// accumulates a new connection pool per reload until SQLite starts refusing them.
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export * from '@prisma/client';
