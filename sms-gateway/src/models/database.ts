/**
 * Database connection and query layer using Knex.
 * Handles connection pooling, migrations, and provides typed query helpers.
 */

import knex, { Knex } from 'knex';
import { config } from '../config';
import { logger } from '../utils/logger';

let db: Knex;

export function getDb(): Knex {
  if (!db) {
    db = knex({
      client: 'pg',
      connection: {
        host: config.database.host,
        port: config.database.port,
        database: config.database.database,
        user: config.database.user,
        password: config.database.password,
        ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
      },
      pool: {
        min: config.database.pool.min,
        max: config.database.pool.max,
        acquireTimeoutMillis: 10000,
        createTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
      },
      // Log slow queries in development
      ...(config.isDevelopment && {
        log: {
          warn: (msg: string) => logger.warn(`DB Warning: ${msg}`),
          error: (msg: string) => logger.error(`DB Error: ${msg}`),
          debug: (msg: string) => logger.debug(`DB Debug: ${msg}`),
        },
      }),
    });
  }
  return db;
}

/**
 * Run database migrations to create/update schema.
 */
export async function runMigrations(): Promise<void> {
  const database = getDb();
  logger.info('Running database migrations...');

  // Messages table
  await database.raw(`
    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY,
      idempotency_key VARCHAR(255) NOT NULL,
      "to" VARCHAR(20) NOT NULL,
      to_hash VARCHAR(64) NOT NULL,
      body TEXT NOT NULL,
      channel VARCHAR(20) NOT NULL DEFAULT 'sms',
      priority VARCHAR(20) NOT NULL DEFAULT 'transactional',
      status VARCHAR(20) NOT NULL DEFAULT 'queued',
      tenant_id VARCHAR(100) NOT NULL DEFAULT 'default',
      provider_name VARCHAR(50),
      provider_message_id VARCHAR(255),
      attempts INTEGER NOT NULL DEFAULT 0,
      excluded_providers TEXT[] DEFAULT '{}',
      metadata JSONB,
      error_message TEXT,
      cost_usd DECIMAL(10, 6),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      sent_at TIMESTAMPTZ,
      delivered_at TIMESTAMPTZ
    );
  `);

  // Indices for messages
  await database.raw(`
    CREATE INDEX IF NOT EXISTS idx_messages_idempotency ON messages (idempotency_key);
    CREATE INDEX IF NOT EXISTS idx_messages_tenant_created ON messages (tenant_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_messages_to_hash ON messages (to_hash, created_at);
    CREATE INDEX IF NOT EXISTS idx_messages_provider_msg ON messages (provider_message_id);
    CREATE INDEX IF NOT EXISTS idx_messages_status ON messages (status) WHERE status IN ('queued', 'sent', 'processing');
  `);

  // OTP records table
  await database.raw(`
    CREATE TABLE IF NOT EXISTS otp_records (
      id UUID PRIMARY KEY,
      phone_hash VARCHAR(64) NOT NULL,
      otp_hash VARCHAR(255) NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT 3,
      channel VARCHAR(20) NOT NULL DEFAULT 'sms',
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      message_id UUID REFERENCES messages(id),
      ip_address VARCHAR(45) NOT NULL,
      user_agent TEXT,
      tenant_id VARCHAR(100) NOT NULL DEFAULT 'default',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      verified_at TIMESTAMPTZ
    );
  `);

  // Indices for OTP records
  await database.raw(`
    CREATE INDEX IF NOT EXISTS idx_otp_phone_hash ON otp_records (phone_hash, created_at);
    CREATE INDEX IF NOT EXISTS idx_otp_status ON otp_records (status) WHERE status = 'pending';
    CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_records (expires_at) WHERE status = 'pending';
  `);

  // Audit events table
  await database.raw(`
    CREATE TABLE IF NOT EXISTS audit_events (
      id UUID PRIMARY KEY,
      action VARCHAR(100) NOT NULL,
      actor VARCHAR(255) NOT NULL,
      ip_address VARCHAR(45) NOT NULL,
      user_agent TEXT,
      resource_type VARCHAR(50) NOT NULL,
      resource_id VARCHAR(255) NOT NULL,
      outcome VARCHAR(20) NOT NULL,
      details JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await database.raw(`
    CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_events (resource_type, resource_id);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_events (created_at);
  `);

  logger.info('Database migrations completed successfully');
}

/**
 * Check database connectivity.
 */
export async function checkDbHealth(): Promise<boolean> {
  try {
    await getDb().raw('SELECT 1');
    return true;
  } catch (error) {
    logger.error('Database health check failed', { error });
    return false;
  }
}

/**
 * Gracefully close the database connection pool.
 */
export async function closeDb(): Promise<void> {
  if (db) {
    await db.destroy();
    logger.info('Database connection pool closed');
  }
}
