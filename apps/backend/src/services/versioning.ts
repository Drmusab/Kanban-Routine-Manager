import logger from '../utils/logger';
import { getAsync, runAsync } from '../utils/database';

const APP_VERSION = process.env.APP_VERSION || '1.0.0';
const SCHEMA_VERSION = parseInt(process.env.SCHEMA_VERSION || '1', 10);

interface SchemaVersionRow {
  version: number;
  applied_at: string;
  app_version?: string;
}

interface AppVersionRow {
  version: string;
  installed_at: string;
  schema_version: number;
}

async function ensureVersionTables(): Promise<void> {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS schema_versions (
      version INTEGER PRIMARY KEY,
      app_version TEXT,
      applied_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await runAsync(`
    CREATE TABLE IF NOT EXISTS app_versions (
      version TEXT PRIMARY KEY,
      schema_version INTEGER,
      installed_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function recordSchemaVersion(): Promise<void> {
  const latest: SchemaVersionRow | undefined = await getAsync(
    'SELECT * FROM schema_versions ORDER BY version DESC LIMIT 1'
  );

  if (latest && latest.version > SCHEMA_VERSION) {
    logger.warn('Database schema is newer than application SCHEMA_VERSION', {
      databaseVersion: latest.version,
      appSchemaVersion: SCHEMA_VERSION,
    });
    return;
  }

  if (!latest || latest.version < SCHEMA_VERSION) {
    await runAsync(
      'INSERT OR REPLACE INTO schema_versions (version, app_version, applied_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
      [SCHEMA_VERSION, APP_VERSION]
    );
    logger.info('Schema version synchronized', {
      schemaVersion: SCHEMA_VERSION,
      previousVersion: latest?.version ?? 0,
    });
  }
}

async function recordAppVersion(): Promise<void> {
  const installed: AppVersionRow | undefined = await getAsync(
    'SELECT * FROM app_versions ORDER BY installed_at DESC LIMIT 1'
  );

  if (!installed || installed.version !== APP_VERSION) {
    await runAsync(
      'INSERT OR REPLACE INTO app_versions (version, schema_version, installed_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
      [APP_VERSION, SCHEMA_VERSION]
    );
    logger.info('Application version recorded', {
      appVersion: APP_VERSION,
      schemaVersion: SCHEMA_VERSION,
    });
  }
}

/**
 * Runs startup checks that keep schema/app versions aligned.
 * This is a lightweight migration guard so the Docker entrypoints
 * always capture the running build state.
 */
export async function runStartupMigrations(): Promise<void> {
  await ensureVersionTables();
  await recordSchemaVersion();
  await recordAppVersion();
}
