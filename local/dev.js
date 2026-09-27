/* One-command local environment: starts a real embedded PostgreSQL (bundled
 * binaries), loads the schema, then starts the app server.
 * Local development/testing only. Usage: node local/dev.js
 */
const path = require('path');
const fs = require('fs');
const { spawnSync, spawn } = require('child_process');

// Some sandboxes throw a harmless wasm-related unhandled rejection from pg's
// optional undici path — keep the process alive when it happens.
process.on('unhandledRejection', (e) => {
  console.warn('[warn] ignored unhandled rejection:', e && e.message);
});

const NATIVE = path.join(__dirname, '..', 'node_modules', '@embedded-postgres', 'linux-x64', 'native');
const BIN = path.join(NATIVE, 'bin');
const DB_DIR = path.join(__dirname, 'pgdata');
const PORT = 5433;
const ENV = { ...process.env, LD_LIBRARY_PATH: path.join(NATIVE, 'lib') + ':' + (process.env.LD_LIBRARY_PATH || '') };

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { env: ENV, encoding: 'utf8', ...opts });
  if (r.status !== 0) {
    throw new Error(`${cmd} failed: ${(r.stderr || r.stdout || '').slice(0, 500)}`);
  }
  return r.stdout;
}

async function main() {
  const { Client } = require('pg');

  if (!fs.existsSync(path.join(DB_DIR, 'PG_VERSION'))) {
    fs.mkdirSync(DB_DIR, { recursive: true });
    console.log('initdb…');
    run(path.join(BIN, 'initdb'), ['-D', DB_DIR, '-U', 'postgres', '-A', 'trust', '-E', 'UTF8']);
  }

  console.log('starting postgres…');
  const logFile = path.join(__dirname, 'postgres.log');
  const status = spawnSync(path.join(BIN, 'pg_ctl'), ['-D', DB_DIR, 'status'], { env: ENV, encoding: 'utf8' });
  if (status.status !== 0) {
    run(path.join(BIN, 'pg_ctl'), ['-D', DB_DIR, '-l', logFile,
      '-o', `-p ${PORT} -k ${__dirname} -c listen_addresses=127.0.0.1`, '-w', 'start']);
  } else {
    console.log('postgres already running');
  }

  process.env.DATABASE_URL = `postgres://postgres@127.0.0.1:${PORT}/drivenow`;

  // create database if needed + load schema on a fresh one
  const admin = new Client({ connectionString: `postgres://postgres@127.0.0.1:${PORT}/postgres` });
  await admin.connect();
  const exists = await admin.query("SELECT 1 FROM pg_database WHERE datname = 'drivenow'");
  if (exists.rows.length === 0) {
    await admin.query('CREATE DATABASE drivenow');
    console.log('database created');
  }
  await admin.end();

  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const hasCars = await db.query("SELECT to_regclass('public.cars') AS t");
  if (!hasCars.rows[0].t) {
    await db.query(fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8'));
    console.log('schema loaded, fleet seeded');
  }
  // idempotent migration: ensure payment_method column exists on older local DBs
  await db.query(`DO $do$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'payment_method') THEN
      ALTER TABLE bookings ADD COLUMN payment_method VARCHAR(10) NOT NULL DEFAULT 'card';
    END IF;
  END $do$;`);
  await db.end();

  console.log('database ready on 127.0.0.1:' + PORT);
  require('./server');
}

main().catch(e => { console.error(e); process.exit(1); });
