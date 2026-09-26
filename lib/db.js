/* Postgres connection.
 * - Supabase/Neon (remote): SSL is required.
 * - Local development (localhost): no SSL.
 */
const { Pool } = require('pg');

const url = process.env.DATABASE_URL || '';
const isLocal = /@(localhost|127\.0\.0\.1)/.test(url);

const pool = new Pool({
  connectionString: url || undefined,
  ssl: url && !isLocal ? { rejectUnauthorized: false } : undefined,
  max: 5
});

module.exports = pool;
