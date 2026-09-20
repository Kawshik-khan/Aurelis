import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_yMYLP8g9rdXB@ep-lively-pond-b5otd0oa-pooler.c-7.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT id, email, full_name, aurelis_tag, base_currency FROM users ORDER BY created_at ASC;');
    console.log('========================================================');
    console.log(`TOTAL USERS IN DATABASE: ${res.rows.length}`);
    console.log('========================================================');
    console.table(res.rows);

    const wRes = await client.query('SELECT id, user_id, currency, balance, is_primary FROM wallets ORDER BY user_id ASC;');
    console.log('\n========================================================');
    console.log(`TOTAL WALLETS IN DATABASE: ${wRes.rows.length}`);
    console.log('========================================================');
    console.table(wRes.rows);

    const txnRes = await client.query('SELECT id, user_id, type, amount, currency, status, recipient_name FROM transactions ORDER BY created_at ASC;');
    console.log('\n========================================================');
    console.log(`TOTAL TRANSACTIONS IN DATABASE: ${txnRes.rows.length}`);
    console.log('========================================================');
    console.table(txnRes.rows);

    const ledgerRes = await client.query('SELECT COUNT(*) as count FROM ledger_entries;');
    const notifRes = await client.query('SELECT COUNT(*) as count FROM notifications;');
    const cardRes = await client.query('SELECT COUNT(*) as count FROM cards;');
    const alertRes = await client.query('SELECT COUNT(*) as count FROM dispatched_alerts;');
    console.log('\n========================================================');
    console.log('DATABASE TABLE COUNTS:');
    console.log('========================================================');
    console.log(` • Ledger entries: ${ledgerRes.rows[0].count}`);
    console.log(` • Notifications:  ${notifRes.rows[0].count}`);
    console.log(` • Cards:          ${cardRes.rows[0].count}`);
    console.log(` • Alerts:         ${alertRes.rows[0].count}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
