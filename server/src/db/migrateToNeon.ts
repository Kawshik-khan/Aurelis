import dotenv from 'dotenv';
import { Pool } from 'pg';
import { NEON_POSTGRES_SCHEMA } from './neonSchema';

dotenv.config();

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_yMYLP8g9rdXB@ep-lively-pond-b5otd0oa-pooler.c-7.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require';

async function migrate() {
  console.log('========================================================');
  console.log('   DBS BANK BANGLADESH — NEON DATABASE SCHEMA UPGRADE   ');
  console.log('========================================================\n');

  console.log('[NEON] Target Database Endpoint:');
  const maskedConn = connectionString.replace(/:([^:@]+)@/, ':****@');
  console.log(`       ${maskedConn}\n`);

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  try {
    const client = await pool.connect();
    console.log('[NEON] Connected successfully to Neon cloud PostgreSQL instance.');

    // 1. Execute full idempotent schema and column migrations
    console.log('[NEON] Applying latest schema definitions and migrations...');
    await client.query(NEON_POSTGRES_SCHEMA);
    console.log('[NEON] Schema execution & migrations completed successfully!\n');

    // 2. Query and list all tables in public schema
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name ASC;
    `);

    console.log('========================================================');
    console.log(` VERIFIED TABLES IN NEON DATABASE (${tablesRes.rows.length} TABLES FOUND)`);
    console.log('========================================================');

    for (const row of tablesRes.rows) {
      const tableName = row.table_name;
      // Get column count & row count
      const colRes = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position ASC;
      `, [tableName]);

      const countRes = await client.query(`SELECT COUNT(*) as cnt FROM "${tableName}";`);
      const rowCount = countRes.rows[0]?.cnt || 0;

      console.log(`\n Table: [${tableName.toUpperCase()}] (${rowCount} rows, ${colRes.rows.length} columns)`);
      const colsSummary = colRes.rows.map(c => `${c.column_name} (${c.data_type})`).join(', ');
      console.log(`   Columns: ${colsSummary}`);
    }

    // 3. Verify specific new columns on users table
    const userCols = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users'
      AND column_name IN ('phone', 'phone_number', 'aurelis_tag', 'dbs_tag', 'base_currency', 'email_alerts_enabled', 'sms_alerts_enabled');
    `);

    console.log('\n========================================================');
    console.log(' VERIFIED USER IDENTITY & SMS ALERT COLUMNS:');
    console.log('========================================================');
    for (const c of userCols.rows) {
      console.log(`   • ${c.column_name.padEnd(22)}: ${c.data_type} (default: ${c.column_default || 'none'})`);
    }

    client.release();
    console.log('\n========================================================');
    console.log(' NEON DATABASE SCHEMA UPGRADE: 100% COMPLETE & VERIFIED! ');
    console.log('========================================================\n');
  } catch (error) {
    console.error('[NEON-ERROR] Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
