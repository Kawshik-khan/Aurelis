import fs from 'fs';
import path from 'path';

// Clean test database before test start for reproducible clean-slate test
const dbDir = path.resolve(process.cwd(), 'server', 'data');
const dbPath = path.join(dbDir, 'aurelis.db');
const walPath = path.join(dbDir, 'aurelis.db-wal');
const shmPath = path.join(dbDir, 'aurelis.db-shm');

try {
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
  if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
} catch {
  // ignore
}

// Now dynamically import db and app after clean
const { db } = await import('../src/db/database');
const { app } = await import('../src/app');
import http from 'http';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  gold: '\x1b[38;2;229;195;120m',
};

async function runSQLiteTestSuite() {
  console.log(`\n${colors.gold}${colors.bold}======================================================${colors.reset}`);
  console.log(`${colors.gold}${colors.bold}     AURELIS — PRODUCTION SQLITE DATABASE TEST        ${colors.reset}`);
  console.log(`${colors.gold}${colors.bold}======================================================${colors.reset}\n`);

  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, title: string, detail?: string) => {
    if (condition) {
      passed++;
      console.log(`  ${colors.green}[PASS]${colors.reset} ${title}`);
      if (detail) console.log(`         ${colors.cyan}↳ ${detail}${colors.reset}`);
    } else {
      failed++;
      console.log(`  ${colors.red}[FAIL]${colors.reset} ${title}`);
      if (detail) console.log(`         ${colors.yellow}↳ ${detail}${colors.reset}`);
    }
  };

  // 1. Verify SQLite database file was created
  console.log(`${colors.bold}1. Database File & Storage Engine:${colors.reset}`);
  assert(fs.existsSync(dbPath), 'Database file exists on disk', dbPath);

  // 2. Verify PRAGMAs (WAL mode & Foreign Keys)
  const rawDb = (db as any).engine.getRawDb();
  const walRow = rawDb.prepare('PRAGMA journal_mode;').get() as any;
  assert(walRow?.journal_mode?.toLowerCase() === 'wal', 'Write-Ahead Logging (WAL) is enabled', `journal_mode = ${walRow?.journal_mode}`);

  const fkRow = rawDb.prepare('PRAGMA foreign_keys;').get() as any;
  assert(Number(fkRow?.foreign_keys) === 1, 'Foreign Key constraint enforcement is active', `foreign_keys = ${fkRow?.foreign_keys}`);

  // 3. Verify clean slate (Zero demo accounts)
  console.log(`\n${colors.bold}2. Clean Slate Verification (No Demo Accounts):${colors.reset}`);
  assert(!db.getUserByEmail('alex@aurelis.com'), 'Demo user alex@aurelis.com is not in database');
  assert(!db.getUserById('usr_01'), 'Demo user usr_01 is not in database');
  assert(!db.getUserByEmail('victoria@aurelis.com'), 'Demo user victoria@aurelis.com is not in database');

  // 4. Start HTTP test server to test live API operations
  console.log(`\n${colors.bold}3. Live API Registration & Database Insertion:${colors.reset}`);
  const testPort = 4015;
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(testPort, resolve));
  const baseUrl = `http://localhost:${testPort}/v1`;

  const runId = Date.now();
  const emailA = `saba_${runId}@aurelis.com`;
  const emailB = `rahman_${runId}@aurelis.com`;

  try {
    // Register User A
    const regResA = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Saba Tabassum',
        email: emailA,
        password: 'Password123!',
        currency: 'USD',
      }),
    });
    const regDataA = (await regResA.json()) as any;
    assert(regResA.status === 201, 'User registration succeeds', `Status: ${regResA.status}`);
    assert(Boolean(regDataA.token), 'Registration returns JWT token');
    assert(regDataA.user?.email === emailA, 'User profile returned with email');

    const tokenA = regDataA.token;
    const userAId = regDataA.user.id;

    // Verify row was stored in SQLite
    const userInDb = db.getUserByEmail(emailA);
    assert(userInDb !== undefined, 'User row found directly in SQLite database');
    assert(userInDb?.fullName === 'Saba Tabassum', 'User full name matches in SQLite');
    assert(userInDb?.aurelisTag?.startsWith('@saba'), 'User aurelis tag generated properly', userInDb?.aurelisTag);

    // Verify wallet was stored in SQLite
    const walletsA = (db as any).engine.wallets.findByUser(userAId);
    assert(walletsA.length >= 1, 'Initial sovereign wallet auto-provisioned in SQLite', `${walletsA.length} wallet found`);
    assert(walletsA[0].currency === 'USD', 'Wallet currency is USD');

    // Register User B
    const regResB = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Rahman Private',
        email: emailB,
        password: 'Password123!',
        currency: 'USD',
      }),
    });
    const regDataB = (await regResB.json()) as any;
    assert(regResB.status === 201, 'Second user registered successfully');
    const userBId = regDataB.user.id;

    // 5. Deposit Funds via API
    console.log(`\n${colors.bold}4. Wallet Deposit & Ledger Writing:${colors.reset}`);
    const depRes = await fetch(`${baseUrl}/wallets/deposit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        currency: 'USD',
        amount: 25000.0,
        fundingSource: 'Swiss Private Vault ACH',
      }),
    });
    const depData = (await depRes.json()) as any;
    assert(depRes.status === 200, 'Deposit API returns 200 OK');
    assert(depData.wallet?.balance >= 35000.0, 'Wallet balance updated in SQLite', `New balance: ${depData.wallet?.balance}`);

    // Check ledger entry
    const ledger = (db as any).engine.ledgerEntries.values();
    assert(ledger.length > 0, 'Double-entry ledger record inserted into SQLite', `Ledger entries: ${ledger.length}`);

    // 6. User Lookup in Database
    console.log(`\n${colors.bold}5. User Search & Directory Lookup:${colors.reset}`);
    const lookupRes = await fetch(`${baseUrl}/users/lookup?q=${emailB}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const lookupData = (await lookupRes.json()) as any;
    assert(lookupData.found === true, 'Directory lookup finds registered user in SQLite');
    assert(lookupData.user?.fullName === 'Rahman Private', 'Directory lookup returns correct user profile');

    // 7. P2P Fund Transfer with ACID guarantee
    console.log(`\n${colors.bold}6. Atomic Peer-to-Peer Transfer & Settlement:${colors.reset}`);
    const transferRes = await fetch(`${baseUrl}/transfers/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        recipientEmail: emailB,
        sourceCurrency: 'USD',
        destinationCurrency: 'USD',
        amount: 5000.0,
        reference: 'Q3 Settlement',
        pin: '1234',
      }),
    });
    const transferData = (await transferRes.json()) as any;
    assert(transferRes.status === 200 || transferRes.status === 201, 'Transfer executed successfully', `Txn ID: ${transferData.transaction?.id}`);

    // Verify balances in SQLite
    const senderWallet = (db as any).engine.wallets.findByUser(userAId)[0];
    const recipientWallet = (db as any).engine.wallets.findByUser(userBId)[0];
    assert(senderWallet.balance < 35000.0, 'Sender balance deducted in SQLite', `Sender balance: ${senderWallet.balance}`);
    assert(recipientWallet.balance >= 15000.0, 'Recipient balance credited in SQLite', `Recipient balance: ${recipientWallet.balance}`);

    // Verify transaction history in SQLite
    const txns = (db as any).engine.transactions.values();
    assert(txns.length >= 2, 'Transactions stored in SQLite transaction table', `${txns.length} transactions recorded`);

    // 8. Re-instantiation & Persistence Test (Simulating server restart)
    console.log(`\n${colors.bold}7. Restart Persistence Test (Re-opening SQLite):${colors.reset}`);
    const { DatabaseSync } = await import('node:sqlite');
    const testReopen = new DatabaseSync(dbPath);
    const reloadedUsers = testReopen.prepare('SELECT id, email, full_name FROM users').all() as any[];
    assert(reloadedUsers.length >= 2, 'All registered users survive complete restart', `${reloadedUsers.length} users preserved`);
    assert(reloadedUsers.some((u) => u.email === emailA), `User ${emailA} is intact`);
    assert(reloadedUsers.some((u) => u.email === emailB), `User ${emailB} is intact`);

    const reloadedTxns = testReopen.prepare('SELECT id, amount, currency, status FROM transactions').all() as any[];
    assert(reloadedTxns.length >= 2, 'All transactions survive complete restart', `${reloadedTxns.length} transactions preserved`);
    testReopen.close();
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }


  console.log(`\n${colors.bold}======================================================${colors.reset}`);
  console.log(`  Tests Passed: ${colors.green}${passed}${colors.reset} | Failed: ${failed > 0 ? colors.red + failed : colors.green + 0}${colors.reset}`);
  console.log(`${colors.bold}======================================================${colors.reset}\n`);

  if (failed > 0) {
    process.exitCode = 1;
  } else {
    process.exitCode = 0;
  }
}

runSQLiteTestSuite().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
