import { PrismaClient } from '@prisma/client';

// DATABASE_URL is required. There is no fallback: a client that silently
// connects somewhere else on a missing variable is how a migration lands in
// the wrong database.
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required');

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url } },
    log: process.env.PRISMA_LOG ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });

// tsx watch reloads the module graph on every save; without this the process
// accumulates a connection pool per reload.
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export * from '@prisma/client';
