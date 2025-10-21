// Simple DB connectivity test for Cloud SQL Postgres
// Usage: node functions/scripts/testDbConnection.js

const path = require('path');
const dotenv = require('dotenv');
const { Client } = require('pg');

// Load env from functions/.env if present
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const connString = process.env.DATABASE_URL;
if (!connString) {
  console.error('ERROR: DATABASE_URL not set. Update functions/.env or set env var.');
  process.exit(1);
}

(async () => {
  const client = new Client({ connectionString: connString });
  try {
    await client.connect();
    const now = await client.query('SELECT NOW() as now');
    console.log('Connected to Postgres. Server time:', now.rows[0].now);
    const tables = await client.query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname='public' LIMIT 20");
    console.log('Public tables (up to 20):', tables.rows.map(r => r.tablename));
    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('Connection failed:', err.message || err);
    process.exit(2);
  }
})();
