import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_yMYLP8g9rdXB@ep-lively-pond-b5otd0oa-pooler.c-7.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require';

async function purge() {
  console.log('========================================================');
  console.log('   DBS BANK BANGLADESH — DEMO ACCOUNT PURGE & RESET     ');
  console.log('========================================================\n');

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  try {
    const client = await pool.connect();
    console.log('[NEON] Connected successfully to Neon cloud PostgreSQL.');

    // 1. Find all users
    const allUsersRes = await client.query('SELECT id, email, full_name, aurelis_tag FROM users ORDER BY created_at ASC;');
    const allUsers = allUsersRes.rows;
    console.log(`[NEON] Total registered users in database: ${allUsers.length}`);

    // Identify demo users
    const demoUserIds: string[] = [];
    const genuineUsers: typeof allUsers = [];

    for (const u of allUsers) {
      const email = (u.email || '').toLowerCase().trim();
      const id = (u.id || '').toLowerCase().trim();

      const isDemo =
        email === 'alex@aurelis.com' ||
        email.endsWith('@aurelis.com') ||
        email.endsWith('@sovereign-vault.ch') ||
        email.endsWith('@aurelis.vault') ||
        email.endsWith('@sovereign.ch') ||
        email.endsWith('@sovereign.at') ||
        email.endsWith('@sovereign.uk') ||
        email.endsWith('@rothschild.vault') ||
        email.endsWith('@sterling.ch') ||
        id.startsWith('usr_test_') ||
        id.startsWith('usr_rec_') ||
        id === 'usr_01';

      if (isDemo) {
        demoUserIds.push(u.id);
      } else {
        genuineUsers.push(u);
      }
    }

    console.log(`[NEON] Found ${demoUserIds.length} demo/synthetic accounts to purge.`);
    console.log(`[NEON] Found ${genuineUsers.length} genuine user accounts to preserve:`);
    for (const gu of genuineUsers) {
      console.log(`   ✓ Genuine User: ${gu.full_name} (${gu.email}) [ID: ${gu.id}]`);
    }

    if (demoUserIds.length > 0) {
      console.log('\n[NEON] Purging demo account dependencies...');

      // Get wallets belonging to demo users
      const demoWalletsRes = await client.query(
        'SELECT id FROM wallets WHERE user_id = ANY($1::text[])',
        [demoUserIds]
      );
      const demoWalletIds = demoWalletsRes.rows.map((r) => r.id);
      console.log(`   • Found ${demoWalletIds.length} demo wallets.`);

      // 1. Delete ledger entries
      if (demoWalletIds.length > 0) {
        const delLedger = await client.query(
          'DELETE FROM ledger_entries WHERE wallet_id = ANY($1::text[])',
          [demoWalletIds]
        );
        console.log(`   • Deleted ${delLedger.rowCount} demo ledger entries.`);
      }

      // 2. Delete transactions
      const delTxns = await client.query(
        'DELETE FROM transactions WHERE user_id = ANY($1::text[]) OR (source_wallet_id IS NOT NULL AND source_wallet_id = ANY($2::text[]))',
        [demoUserIds, demoWalletIds]
      );
      console.log(`   • Deleted ${delTxns.rowCount} demo transactions.`);

      // 3. Delete notifications
      const delNotifs = await client.query(
        'DELETE FROM notifications WHERE user_id = ANY($1::text[])',
        [demoUserIds]
      );
      console.log(`   • Deleted ${delNotifs.rowCount} demo notifications.`);

      // 4. Delete dispatched alerts
      const delAlerts = await client.query(
        'DELETE FROM dispatched_alerts WHERE user_id = ANY($1::text[])',
        [demoUserIds]
      );
      console.log(`   • Deleted ${delAlerts.rowCount} demo dispatched alerts.`);

      // 5. Delete cards
      const delCards = await client.query(
        'DELETE FROM cards WHERE user_id = ANY($1::text[])',
        [demoUserIds]
      );
      console.log(`   • Deleted ${delCards.rowCount} demo cards.`);

      // 6. Delete wallets
      const delWallets = await client.query(
        'DELETE FROM wallets WHERE user_id = ANY($1::text[])',
        [demoUserIds]
      );
      console.log(`   • Deleted ${delWallets.rowCount} demo wallets.`);

      // 7. Delete recipients
      const delRecipients = await client.query(
        `DELETE FROM recipients WHERE user_id = ANY($1::text[]) 
         OR email LIKE '%@sovereign-vault.ch'
         OR email LIKE '%@aurelis.vault'
         OR email LIKE '%@sovereign.ch'
         OR email LIKE '%@sovereign.at'
         OR email LIKE '%@sovereign.uk'
         OR email LIKE '%@rothschild.vault'
         OR email = 'alex@aurelis.com'`,
        [demoUserIds]
      );
      console.log(`   • Deleted ${delRecipients.rowCount} demo recipients.`);

      // 8. Delete users
      const delUsers = await client.query(
        'DELETE FROM users WHERE id = ANY($1::text[])',
        [demoUserIds]
      );
      console.log(`   • Deleted ${delUsers.rowCount} demo users from users table.`);
    }

    // Now reset genuine users' wallet balances to 0.00 so they start with zero balance
    console.log('\n[NEON] Resetting all genuine user account balances to 0.00 (Zero Balance Starting State)...');
    for (const gu of genuineUsers) {
      const resetRes = await client.query(
        'UPDATE wallets SET balance = 0.00, pending_balance = 0.00 WHERE user_id = $1 RETURNING id, currency, balance;',
        [gu.id]
      );
      console.log(`   ✓ Reset ${resetRes.rowCount} wallets for ${gu.full_name} (${gu.email}) to 0.00 balance.`);
    }

    // Clean out any orphaned demo records in transactions or recipients
    await client.query(`
      DELETE FROM transactions WHERE user_id NOT IN (SELECT id FROM users);
      DELETE FROM wallets WHERE user_id NOT IN (SELECT id FROM users);
      DELETE FROM cards WHERE user_id NOT IN (SELECT id FROM users);
      DELETE FROM notifications WHERE user_id NOT IN (SELECT id FROM users);
    `);

    // Verify remaining users
    const remainingRes = await client.query('SELECT id, email, full_name, aurelis_tag FROM users ORDER BY created_at ASC;');
    console.log('\n========================================================');
    console.log(` ACTIVE CLEAN USERS IN DATABASE (${remainingRes.rows.length} USERS):`);
    console.log('========================================================');
    for (const u of remainingRes.rows) {
      const wRes = await client.query('SELECT currency, balance FROM wallets WHERE user_id = $1;', [u.id]);
      const wStr = wRes.rows.map((w) => `${w.currency}: ${Number(w.balance).toFixed(2)}`).join(', ');
      console.log(` • ${u.full_name.padEnd(20)} | ${u.email.padEnd(28)} | ${u.aurelis_tag || 'no-tag'} | Wallets: [${wStr}]`);
    }

    client.release();
    console.log('\n========================================================');
    console.log(' DEMO ACCOUNT PURGE & 0.00 BALANCE RESET COMPLETED!     ');
    console.log('========================================================\n');
  } catch (error) {
    console.error('[NEON-PURGE-ERROR]:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

purge();
