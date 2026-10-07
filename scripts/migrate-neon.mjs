#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { neon } from '@neondatabase/serverless';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL || process.env.VITE_NEON_DATABASE_URL;
  if (!databaseUrl) {
    console.log(
      '[FITKONIC NEON MIGRATOR] No DATABASE_URL or VITE_NEON_DATABASE_URL found in environment.\n' +
      'Set DATABASE_URL="postgresql://..." in .env to run migrations against a live Neon PostgreSQL instance.\n' +
      'Local Offline-First Dexie + Vite Neon Mirror is active for development.'
    );
    return;
  }

  const sql = neon(databaseUrl);
  const migrationsDir = path.resolve(__dirname, '../db/migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    console.log(`[FITKONIC NEON MIGRATOR] Applying ${file}...`);
    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    await sql(content);
    console.log(`[FITKONIC NEON MIGRATOR] Completed ${file}`);
  }
  console.log('[FITKONIC NEON MIGRATOR] All Neon PostgreSQL migrations applied successfully.');
}

runMigrations().catch((err) => {
  console.error('[FITKONIC NEON MIGRATOR] Error:', err);
  process.exit(1);
});
