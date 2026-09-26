/* Interactive SQL shell for the local DriveNow database.
 * Starts the embedded PostgreSQL if needed, then gives you a psql-like
 * prompt to practice SQL directly. Usage:
 *   node local/sql.js                 (interactive REPL)
 *   node local/sql.js "SELECT ..."    (run one query and exit)
 * Cross-platform: uses the pg library, no psql install required.
 */
const path = require('path');
const fs = require('fs');
const readline = require('readline');
const { spawnSync } = require('child_process');

process.on('unhandledRejection', (e) => {
  console.warn('[warn] ignored unhandled rejection:', e && e.message);
});

const NATIVE = path.join(__dirname, '..', 'node_modules', '@embedded-postgres', 'linux-x64', 'native');
const BIN = path.join(NATIVE, 'bin');
const DB_DIR = path.join(__dirname, 'pgdata');
const PORT = 5433;
const ENV = { ...process.env, LD_LIBRARY_PATH: path.join(NATIVE, 'lib') + ':' + (process.env.LD_LIBRARY_PATH || '') };

function run(cmd, args) {
  const r = spawnSync(cmd, args, { env: ENV, encoding: 'utf8' });
  if (r.status !== 0) {
    throw new Error(cmd + ' failed: ' + (r.stderr || r.stdout || '').slice(0, 500));
  }
  return r.stdout;
}

async function startDbIfNeeded() {
  if (!fs.existsSync(path.join(DB_DIR, 'PG_VERSION'))) {
    fs.mkdirSync(DB_DIR, { recursive: true });
    console.log('initialising database (first run)...');
    run(path.join(BIN, 'initdb'), ['-D', DB_DIR, '-U', 'postgres', '-A', 'trust', '-E', 'UTF8']);
  }
  const status = spawnSync(path.join(BIN, 'pg_ctl'), ['-D', DB_DIR, 'status'], { env: ENV, encoding: 'utf8' });
  if (status.status !== 0) {
    console.log('starting postgres...');
    run(path.join(BIN, 'pg_ctl'), ['-D', DB_DIR, '-l', path.join(__dirname, 'postgres.log'),
      '-o', `-p ${PORT} -k ${__dirname} -c listen_addresses=127.0.0.1`, '-w', 'start']);
  }
  const { Client } = require('pg');
  const admin = new Client({ connectionString: `postgres://postgres@127.0.0.1:${PORT}/postgres` });
  await admin.connect();
  const exists = await admin.query("SELECT 1 FROM pg_database WHERE datname = 'drivenow'");
  if (exists.rows.length === 0) await admin.query('CREATE DATABASE drivenow');
  await admin.end();
  const db = new Client({ connectionString: `postgres://postgres@127.0.0.1:${PORT}/drivenow` });
  await db.connect();
  const hasCars = await db.query("SELECT to_regclass('public.cars') AS t");
  if (!hasCars.rows[0].t) {
    await db.query(fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8'));
    console.log('schema loaded, fleet seeded');
  }
  return db;
}

function printTable(rows, fields) {
  if (rows.length === 0) { console.log('(0 rows)'); return; }
  const cols = fields.map(f => f.name);
  const vals = rows.map(r => cols.map(c => {
    const v = r[c];
    if (v === null || v === undefined) return 'NULL';
    if (v instanceof Date) return v.toISOString().replace('T', ' ').slice(0, 19);
    return String(v);
  }));
  const widths = cols.map((c, i) => Math.max(c.length, ...vals.map(r => r[i].length)));
  const sep = '+' + widths.map(w => '-'.repeat(w + 2)).join('+') + '+';
  const head = '| ' + cols.map((c, i) => c.padEnd(widths[i])).join(' | ') + ' |';
  console.log(sep); console.log(head); console.log(sep);
  vals.forEach(r => console.log('| ' + r.map((v, i) => v.padEnd(widths[i])).join(' | ') + ' |'));
  console.log(sep);
  console.log('(' + rows.length + (rows.length === 1 ? ' row)' : ' rows)'));
}

const HELP = [
  'Commands:',
  '  \dt            list all tables',
  '  \d <table>     describe a table (columns + types)',
  '  \dv            list views',
  '  \q             quit',
  '  \?             this help',
  '',
  'Type any SQL ending with a semicolon. Example:',
  "  SELECT * FROM cars WHERE 'mumbai' = ANY(cities);"
].join('\n');

async function handle(db, sql) {
  sql = sql.trim();
  if (sql === '\dt') {
    const r = await db.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY 1");
    r.rows.forEach(x => console.log(' ' + x.table_name));
    return;
  }
  if (sql === '\dv') {
    const r = await db.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='VIEW' ORDER BY 1");
    r.rows.forEach(x => console.log(' ' + x.table_name));
    return;
  }
  if (sql.startsWith('\d ')) {
    const t = sql.slice(3).trim().replace(/;$/, '');
    const r = await db.query(
      "SELECT column_name, data_type, is_nullable FROM information_schema.columns " +
      "WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position", [t]);
    if (r.rows.length === 0) { console.log('table not found: ' + t); return; }
    printTable(r.rows, r.fields);
    return;
  }
  const res = await db.query(sql);
  if (res.command === 'SELECT' || (res.fields && res.fields.length > 0)) {
    printTable(res.rows, res.fields);
  } else {
    console.log(res.command + ' ' + res.rowCount);
  }
}

async function main() {
  const oneShot = process.argv[2];
  const db = await startDbIfNeeded();
  console.log('DriveNow SQL shell - database: drivenow (PostgreSQL on 127.0.0.1:' + PORT + ')');
  if (oneShot) {
    try { await handle(db, oneShot); } catch (e) { console.error('ERROR: ' + e.message); process.exitCode = 1; }
    await db.end();
    return;
  }
  console.log('Type \? for help, \q to quit.\n');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: 'drivenow=# ' });
  rl.prompt();
  let buffer = '';
  let pending = 0;
  let closing = false;

  function finish() {
    console.log('bye');
    db.end().then(() => process.exit(0));
  }

  // run one statement; queue-aware so piped/scripted input still waits for results
  function submit(sql) {
    pending++;
    handle(db, sql)
      .catch(e => console.error('ERROR: ' + e.message))
      .finally(() => {
        pending--;
        rl.setPrompt('drivenow=# ');
        if (closing) {
          if (pending === 0) finish();
        } else {
          rl.prompt();
        }
      });
  }

  rl.on('line', (line) => {
    const t = line.trim();
    if (buffer === '' && (t === '\q' || t === 'exit' || t === 'quit')) { rl.close(); return; }
    if (buffer === '' && (t === '\?' || t === 'help')) { console.log(HELP); rl.prompt(); return; }
    if (buffer === '' && t.startsWith('\\') && t.length > 1) {
      // backslash commands (\dt, \d table, \dv) run immediately, no semicolon needed
      submit(t);
      return;
    }
    if (t === '') { rl.prompt(); return; }
    buffer = buffer ? buffer + '\n' + t : t;
    if (buffer.endsWith(';')) {
      const sql = buffer;
      buffer = '';
      submit(sql);
    } else {
      rl.setPrompt('        ');
      rl.prompt();
    }
  });
  rl.on('close', () => {
    if (pending === 0) finish();
    else closing = true; // wait for in-flight queries, then finish
  });
}

main().catch(e => { console.error(e); process.exit(1); });
