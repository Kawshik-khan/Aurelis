import 'dotenv/config';
import http from 'http';
import { app } from '../src/app';
import { db } from '../src/db/database';
import { TransferService } from '../src/services/transferService';
import { LedgerService } from '../src/services/ledgerService';

async function runConcurrencyLedgerSuite() {
  console.log('\n================================================================');
  console.log(' DBS BANK — CONCURRENCY, PESSIMISTIC LOCKING & HTTPONLY SUITE ');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string, details?: string) {
    if (condition) {
      console.log(`  [PASS] ${desc}`);
      if (details) console.log(`         ↳ ${details}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${desc}`);
      if (details) console.error(`         ↳ ${details}`);
      failed++;
    }
  }

  // Start temporary HTTP test server
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://localhost:${address.port}/v1`;

  const timestamp = Date.now();
  const testSenderEmail = `stress.sender.${timestamp}@dbs.bank.test`;
  const testRecEmail = `stress.recipient.${timestamp}@dbs.bank.test`;

  let senderUserId = '';
  let recUserId = '';
  let senderWalletId = '';
  let recWalletId = '';
  let authCookie = '';

  try {
    // ---------------------------------------------------------------
    // 1. HTTPONLY COOKIE AUTHENTICATION VERIFICATION
    // ---------------------------------------------------------------
    console.log('1. HttpOnly Cookie Authentication Verification:');

    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testSenderEmail,
        password: 'Password123!',
        fullName: 'Stress Test Sender',
        currency: 'BDT',
      }),
    });

    assert(regRes.status === 201, 'POST /v1/auth/register returns 201 Created');
    const setCookieHeader = regRes.headers.get('set-cookie') || '';
    assert(
      setCookieHeader.includes('aurelis_auth_token='),
      'Set-Cookie header contains aurelis_auth_token',
      setCookieHeader.split(';')[0]
    );
    assert(
      setCookieHeader.toLowerCase().includes('httponly'),
      'Cookie is marked HttpOnly (protected against client XSS theft)'
    );

    // Extract cookie for subsequent authenticated request without Bearer header
    const cookieMatch = setCookieHeader.match(/aurelis_auth_token=([^;]+)/);
    authCookie = cookieMatch ? `aurelis_auth_token=${cookieMatch[1]}` : '';

    const regData = await regRes.json();
    senderUserId = regData.user.id;

    // Call /auth/profile strictly using Cookie (no Authorization: Bearer header!)
    const profileRes = await fetch(`${baseUrl}/auth/profile`, {
      method: 'GET',
      headers: {
        Cookie: authCookie,
      },
    });

    assert(profileRes.status === 200, 'GET /v1/auth/profile authenticates successfully via HttpOnly cookie alone');
    const profileData = await profileRes.json();
    assert(profileData.user.email === testSenderEmail, 'Authenticated user matches cookie identity');

    // Register recipient
    const recRegRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testRecEmail,
        password: 'Password123!',
        fullName: 'Stress Test Recipient',
        currency: 'BDT',
      }),
    });
    const recRegData = await recRegRes.json();
    recUserId = recRegData.user.id;

    // Find wallets
    const senderWallets = await db.wallets.findByUser(senderUserId);
    const recWallets = await db.wallets.findByUser(recUserId);
    senderWalletId = senderWallets[0].id;
    recWalletId = recWallets[0].id;

    // ---------------------------------------------------------------
    // 2. CONCURRENT DOUBLE-SPENDING STRESS TEST
    // ---------------------------------------------------------------
    console.log('\n2. Pessimistic Row-Level Locking (`FOR UPDATE`) & Concurrency Stress Test:');

    // Seed sender with exactly 1,000.00 BDT
    const depositRes = await fetch(`${baseUrl}/wallets/deposit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: authCookie,
      },
      body: JSON.stringify({
        currency: 'BDT',
        amount: 1000.0,
        fundingSource: 'Stress Test Initial Reserve',
      }),
    });
    assert(depositRes.status === 200, 'Deposited initial 1,000.00 BDT reserve into sender wallet');

    const preBalance = await db.wallets.get(senderWalletId);
    assert(
      Number(preBalance?.balance) === 1000.0,
      'Verified sender wallet starting balance is exactly 1,000.00 BDT'
    );

    console.log('   ↳ Firing 5 SIMULTANEOUS transfers of 400.00 BDT each at the exact same millisecond...');
    console.log('   ↳ Total requested: 2,000.00 BDT | Available Balance: 1,000.00 BDT');

    // Launch 5 concurrent transfer requests
    const attempts = [1, 2, 3, 4, 5].map((index) =>
      TransferService.executeTransfer({
        userId: senderUserId,
        recipientEmail: testRecEmail,
        amount: 400.0,
        sourceCurrency: 'BDT',
        destinationCurrency: 'BDT',
        reference: `Concurrent Stress Attempt #${index}`,
        idempotencyKey: `stress_${timestamp}_${index}`,
      })
        .then((res) => ({ success: true, txnId: res.id }))
        .catch((err) => ({ success: false, error: err.message }))
    );

    const results = await Promise.all(attempts);

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    assert(
      successCount === 2,
      `Exactly 2 transfers succeeded (400 * 2 = 800 BDT)`,
      `Succeeded: ${successCount} / 5`
    );
    assert(
      failCount === 3,
      `Exactly 3 transfers were rejected by row-level lock check`,
      `Rejected: ${failCount} / 5 with Insufficient funds`
    );

    const postSenderWallet = await db.wallets.get(senderWalletId);
    const postRecWallet = await db.wallets.get(recWalletId);

    const senderFinalBal = Number(postSenderWallet?.balance);
    const recFinalBal = Number(postRecWallet?.balance);

    assert(
      senderFinalBal === 200.0,
      'Sender final balance is mathematically exact: 1000.00 - 800.00 = 200.00 BDT (Zero Overdraft)',
      `Actual balance: ${senderFinalBal.toFixed(2)} BDT`
    );

    assert(
      recFinalBal === 800.0,
      'Recipient final balance is mathematically exact: 0.00 + 800.00 = 800.00 BDT',
      `Actual balance: ${recFinalBal.toFixed(2)} BDT`
    );

    // ---------------------------------------------------------------
    // 3. DOUBLE-ENTRY LEDGER RECONCILIATION & INTEGRITY
    // ---------------------------------------------------------------
    console.log('\n3. Double-Entry Ledger Audit & Mathematical Reconciliation:');

    const senderAudit = await LedgerService.verifyLedgerIntegrity(senderWalletId);
    assert(
      senderAudit.valid,
      'Sender double-entry ledger is 100% mathematically balanced',
      `Calculated: ${senderAudit.calculatedBalance.toFixed(2)} BDT | Actual: ${senderAudit.actualBalance.toFixed(2)} BDT | Discrepancy: ${senderAudit.discrepancy}`
    );

    const recAudit = await LedgerService.verifyLedgerIntegrity(recWalletId);
    assert(
      recAudit.valid,
      'Recipient double-entry ledger is 100% mathematically balanced',
      `Calculated: ${recAudit.calculatedBalance.toFixed(2)} BDT | Actual: ${recAudit.actualBalance.toFixed(2)} BDT | Discrepancy: ${recAudit.discrepancy}`
    );

    // ---------------------------------------------------------------
    // 4. LOGOUT & COOKIE CLEARING
    // ---------------------------------------------------------------
    console.log('\n4. Logout & Cookie Revocation:');

    const logoutRes = await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
      headers: { Cookie: authCookie },
    });
    assert(logoutRes.status === 200, 'POST /v1/auth/logout succeeds');
    const clearCookieHeader = logoutRes.headers.get('set-cookie') || '';
    assert(
      clearCookieHeader.includes('aurelis_auth_token=;') || clearCookieHeader.includes('Max-Age=0') || clearCookieHeader.includes('Expires='),
      'Set-Cookie clears aurelis_auth_token cookie'
    );
  } finally {
    // Teardown: close server and clean up test records
    server.close();

    try {
      if (senderUserId) await db.users.delete(senderUserId);
      if (recUserId) await db.users.delete(recUserId);
      if (senderWalletId) await db.wallets.delete(senderWalletId);
      if (recWalletId) await db.wallets.delete(recWalletId);
    } catch {
      // ignore
    }
  }

  console.log('\n================================================================');
  console.log(` CONCURRENCY & LEDGER SUITE: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runConcurrencyLedgerSuite().catch((err) => {
  console.error('Fatal error running concurrency suite:', err);
  process.exit(1);
});
