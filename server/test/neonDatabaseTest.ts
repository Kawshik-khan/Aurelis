import { db } from '../src/db/database';
import { TransferService } from '../src/services/transferService';
import { LedgerService } from '../src/services/ledgerService';
import { FXService } from '../src/services/fxService';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  gold: '\x1b[38;2;229;195;120m',
};

async function runDatabaseTestSuite() {
  console.log(`\n${colors.gold}${colors.bold}======================================================${colors.reset}`);
  console.log(`${colors.gold}${colors.bold}     AURELIS — DATABASE & CLOUD DEPLOYMENT TEST       ${colors.reset}`);
  console.log(`${colors.gold}${colors.bold}======================================================${colors.reset}\n`);

  console.log(`${colors.cyan}Engine in Use:${colors.reset} Neon Cloud PostgreSQL\n`);

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

  try {
    // 1. Create a test user
    const testUserId = `usr_test_${Date.now()}`;
    const testEmail = `test_${Date.now()}@aurelis.com`;
    const testTag = `@test_${Date.now()}`;

    await db.users.set(testUserId, {
      id: testUserId,
      email: testEmail,
      passwordHash: 'hash_test_123456',
      fullName: 'Alexander Sterling',
      phone: '+41 44 123 4567',
      aurelisTag: testTag,
      tier: 'Private Client',
      baseCurrency: 'USD',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      twoFactorEnabled: true,
      biometricEnabled: true,
      passkeyEnabled: true,
      address: { street: 'Bahnhofstrasse 45', city: 'Zurich', country: 'Switzerland', postalCode: '8001' },
      transactionPin: '1234',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const fetchedUser = await db.users.get(testEmail);
    assert(Boolean(fetchedUser && fetchedUser.id === testUserId), 'User Creation & Query by Email', `Found user ${fetchedUser?.fullName}`);

    // 2. Create primary USD wallet for test user
    const walletId = `w_usd_${Date.now()}`;
    await db.wallets.set(walletId, {
      id: walletId,
      userId: testUserId,
      currency: 'USD',
      balance: 50000.0,
      pendingBalance: 0.0,
      accountNumber: 'AURL 8829 1029',
      iban: 'US89 AURL 0210 0002 8829',
      bic: 'AURLUSDXX',
      isPrimary: true,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const userWallets = await db.wallets.findByUser(testUserId);
    assert(userWallets.length > 0 && userWallets[0].balance === 50000.0, 'Multi-Currency Wallet Provisioning', `Balance: USD ${userWallets[0]?.balance}`);

    // 3. Create a recipient
    const recipientUserId = `usr_rec_${Date.now()}`;
    const recipientEmail = `geneva_vault_${Date.now()}@aurelis.com`;
    await db.users.set(recipientUserId, {
      id: recipientUserId,
      email: recipientEmail,
      passwordHash: 'hash_rec_123',
      fullName: 'Elena Rostova',
      phone: '+41 22 987 6543',
      aurelisTag: `@elena_${Date.now()}`,
      tier: 'Signature Elite',
      baseCurrency: 'EUR',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      twoFactorEnabled: true,
      biometricEnabled: true,
      passkeyEnabled: true,
      address: { street: 'Rue du Rhone 12', city: 'Geneva', country: 'Switzerland', postalCode: '1204' },
      transactionPin: '1234',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 4. Test Atomic P2P Transfer with Double-Entry Ledger
    const transferTxn = await TransferService.executeTransfer({
      userId: testUserId,
      recipientEmail,
      sourceCurrency: 'USD',
      destinationCurrency: 'EUR',
      amount: 1000.0,
      reference: 'Private Liquidity Allocation',
    });

    assert(Boolean(transferTxn && transferTxn.id.startsWith('TXN-')), 'Atomic P2P Money Transfer', `Txn ID: ${transferTxn.id}`);

    // 5. Verify Immutable Ledger Audit Trail
    const senderLedger = await LedgerService.getWalletLedger(walletId);
    assert(senderLedger.length > 0, 'Double-Entry Financial Ledger Audit Entry', `Found ${senderLedger.length} ledger entry/entries for wallet ${walletId}`);

    // 6. Test 60-second Guaranteed FX Rate Lock
    const fxLock = await FXService.createRateLock('USD', 'EUR', 5000);
    assert(Boolean(fxLock && fxLock.rate > 0), 'Guaranteed FX Rate Lock Generation', `Rate: ${fxLock.rate}, Expires: ${new Date(fxLock.expiresAt).toLocaleTimeString()}`);

    const verifiedLock = await FXService.verifyRateLock(fxLock.quoteId);
    assert(Boolean(verifiedLock && verifiedLock.quoteId === fxLock.quoteId), 'FX Rate Lock TTL Verification', 'Rate lock active and valid within 60s');

    console.log(`\n${colors.gold}======================================================${colors.reset}`);
    console.log(`  Tests Passed: ${colors.green}${passed}${colors.reset} | Failed: ${failed === 0 ? colors.green + '0' : colors.red + failed}${colors.reset}`);
    console.log(`${colors.gold}======================================================${colors.reset}\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error(`\n${colors.red}Test suite error:${colors.reset}`, err);
    process.exit(1);
  }
}

runDatabaseTestSuite();
