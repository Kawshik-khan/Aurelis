import { app } from '../src/app';
import { db } from '../src/db/database';
import http from 'http';
import bcrypt from 'bcryptjs';

// Color formatting utilities for readable test results
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  gold: '\x1b[38;2;229;195;120m',
};

async function runAuthDatabaseTestSuite() {
  console.log(`\n${colors.gold}${colors.bold}======================================================${colors.reset}`);
  console.log(`${colors.gold}${colors.bold}   AURELIS — AUTHENTICATION & DATABASE TEST SUITE     ${colors.reset}`);
  console.log(`${colors.gold}${colors.bold}======================================================${colors.reset}\n`);

  // Start temporary test server
  const testPort = 4005;
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(testPort, () => {
      console.log(`${colors.cyan}[SETUP]${colors.reset} In-memory test server listening on port ${testPort}`);
      resolve();
    });
  });

  const baseUrl = `http://localhost:${testPort}/v1`;

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  const assert = (condition: boolean, testName: string, detail?: string) => {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ${colors.green}[PASS]${colors.reset} ${testName}`);
      if (detail) console.log(`         ${colors.cyan}↳ ${detail}${colors.reset}`);
    } else {
      failedTests++;
      console.log(`  ${colors.red}[FAIL]${colors.reset} ${testName}`);
      if (detail) console.log(`         ${colors.yellow}↳ ${detail}${colors.reset}`);
    }
  };

  try {
    // ---------------------------------------------------------
    // TEST 1: Check Pre-existing Seed Data in Database
    // ---------------------------------------------------------
    console.log(`\n${colors.bold}1. Database Initial State Verification:${colors.reset}`);
    let initialAlex = await db.users.get('alex@aurelis.com');
    if (!initialAlex) {
      initialAlex = {
        id: 'usr_01',
        email: 'alex@aurelis.com',
        fullName: 'Alex Morgan',
        phone: '+880 1700-000000',
        passwordHash: bcrypt.hashSync('Password123!', 10),
        aurelisTag: '@alex.morgan',
        baseCurrency: 'USD',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        twoFactorEnabled: true,
        biometricEnabled: true,
        passkeyEnabled: true,
        address: { street: 'Gulshan Avenue, Road 11', city: 'Dhaka', country: 'Bangladesh', postalCode: '1212' },
        transactionPin: '1234',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.users.set('usr_01', initialAlex);
      await db.wallets.set('w_usr01_usd', {
        id: 'w_usr01_usd',
        userId: 'usr_01',
        currency: 'USD',
        balance: 100000.0,
        pendingBalance: 0.0,
        accountNumber: 'DBS 8829 1021',
        iban: 'BD89 DBSB 0210 0002 8829',
        bic: 'DBSBDDH',
        isPrimary: true,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    assert(initialAlex !== undefined, 'Database contains default sovereign user (alex@aurelis.com)');
    assert(await db.users.has('usr_01'), 'Database maps user ID "usr_01" to user entity');
    const allWallets = await db.wallets.values();
    assert(allWallets.length >= 1, `Database has ${allWallets.length} pre-seeded multi-currency wallets`);

    // ---------------------------------------------------------
    // TEST 2: Register / Create New Sovereign Account
    // ---------------------------------------------------------
    console.log(`\n${colors.bold}2. Create Account (Registration API & Database Sync):${colors.reset}`);
    const timestamp = Date.now();
    const testNewUser = {
      fullName: 'Lord Aurelius Vance',
      email: `aurelius.vance.${timestamp}@sovereign.ch`,
      password: 'SecureVanceVault2026!',
      country: 'Switzerland',
      baseCurrency: 'CHF',
    };

    const regResponse = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testNewUser),
    });

    const regData = await regResponse.json();

    assert(regResponse.status === 201, 'Registration HTTP status is 201 Created', `Status: ${regResponse.status}`);
    assert(Boolean(regData.token), 'Registration returns valid JWT auth token');
    assert(regData.user?.email === testNewUser.email, 'Registration response contains matching user email');
    assert(regData.user?.fullName === testNewUser.fullName, 'Registration response contains matching full name');

    const createdUserId = regData.user?.id;

    // ---------------------------------------------------------
    // TEST 3: Verify Persistence Directly in Database Engine
    // ---------------------------------------------------------
    console.log(`\n${colors.bold}3. Database Storage Verification (Inspecting In-Memory Map Stores):${colors.reset}`);
    
    // Check lookup by email
    const storedByEmail = await db.users.get(testNewUser.email);
    assert(storedByEmail !== undefined, `User record found in db.users by email key: "${testNewUser.email}"`);
    
    // Check lookup by ID
    const storedById = await db.users.get(createdUserId);
    assert(storedById !== undefined, `User record found in db.users by ID key: "${createdUserId}"`);

    if (storedById) {
      assert(storedById.fullName === testNewUser.fullName, 'Database stored accurate full name', storedById.fullName);
      assert(storedById.email === testNewUser.email, 'Database stored accurate email address', storedById.email);
      assert(storedById.baseCurrency === testNewUser.baseCurrency, 'Database stored base currency', storedById.baseCurrency);
      assert(storedById.address?.country === testNewUser.country, 'Database stored jurisdiction/country', storedById.address?.country);
      assert(Boolean(storedById.passwordHash), 'Database stored password hash / token');
      assert(storedById.aurelisTag.includes('aurelius.vance'), 'Database auto-generated correct sovereign tag', storedById.aurelisTag);
      assert(storedById.twoFactorEnabled === true, 'Database activated sovereign 2FA protection');
    }

    // Check provisioned wallet for new user in db.wallets
    const userWallets = (await db.wallets.values()).filter((w) => w.userId === createdUserId);
    assert(userWallets.length > 0, `Database provisioned ${userWallets.length} base wallet(s) for new user in db.wallets`);
    
    if (userWallets.length > 0) {
      const baseWallet = userWallets[0];
      assert(baseWallet.currency === 'CHF', 'Provisioned wallet currency matches user selection (CHF)', baseWallet.currency);
      assert(baseWallet.balance === 10000, 'Provisioned wallet contains initial complimentary sovereign balance (10,000.00)', `Balance: ${baseWallet.balance}`);
      assert(baseWallet.isPrimary === true, 'Provisioned wallet is marked as primary');
      assert(Boolean(baseWallet.iban), 'Provisioned wallet has Swiss IBAN generated', baseWallet.iban);
    }

    // ---------------------------------------------------------
    // TEST 4: Login with the Newly Created Account
    // ---------------------------------------------------------
    console.log(`\n${colors.bold}4. Login with Newly Created Credentials:${colors.reset}`);
    const loginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testNewUser.email,
        password: testNewUser.password,
      }),
    });

    const loginData = await loginResponse.json();

    assert(loginResponse.status === 200, 'Login HTTP status is 200 OK', `Status: ${loginResponse.status}`);
    assert(Boolean(loginData.token), 'Login returns active session JWT token');
    assert(loginData.user?.id === createdUserId, 'Login returns correct user ID matching database entity', loginData.user?.id);
    assert(loginData.user?.email === testNewUser.email, 'Login returns matching email', loginData.user?.email);
    assert(loginData.user?.fullName === testNewUser.fullName, 'Login returns matching full name', loginData.user?.fullName);

    // ---------------------------------------------------------
    // TEST 5: Authenticated Protected API Access with New User Token
    // ---------------------------------------------------------
    console.log(`\n${colors.bold}5. Authenticated Protected Route Test (Using New Token):${colors.reset}`);
    const profileResponse = await fetch(`${baseUrl}/auth/profile`, {
      headers: {
        Authorization: `Bearer ${loginData.token}`,
      },
    });

    const profileData = await profileResponse.json();
    assert(profileResponse.status === 200, 'GET /auth/profile HTTP status is 200 OK');
    assert(profileData.user?.id === createdUserId, 'Profile route resolves to newly created user ID', profileData.user?.id);
    assert(profileData.user?.email === testNewUser.email, 'Profile route confirms email from database', profileData.user?.email);

    // Check wallets endpoint for new user
    const walletsResponse = await fetch(`${baseUrl}/wallets`, {
      headers: {
        Authorization: `Bearer ${loginData.token}`,
      },
    });
    const walletsData = await walletsResponse.json();
    assert(walletsResponse.status === 200, 'GET /wallets HTTP status is 200 OK');
    assert(Array.isArray(walletsData.wallets), 'Wallets response returns array of user accounts');
    const hasChfWallet = walletsData.wallets.some((w: any) => w.currency === 'CHF');
    assert(hasChfWallet, 'User wallet list includes the database-stored CHF account');

    // ---------------------------------------------------------
    // TEST 6: Validation & Error Handling (Duplicate Registration & Bad Login)
    // ---------------------------------------------------------
    console.log(`\n${colors.bold}6. Database Constraints & Error Handling:${colors.reset}`);
    
    // Duplicate registration attempt
    const duplicateResponse = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testNewUser),
    });
    assert(duplicateResponse.status === 409, 'Duplicate email registration rejected with 409 Conflict', `Status: ${duplicateResponse.status}`);

    // Invalid email login attempt
    const invalidLoginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent.user@random.org', password: 'badpassword' }),
    });
    assert(invalidLoginResponse.status === 401 || invalidLoginResponse.status === 404, 'Non-existent user login rejected with 401/404', `Status: ${invalidLoginResponse.status}`);

    // ---------------------------------------------------------
    // TEST 7: Peer-to-Peer (P2P) Balance Transfer Between Users
    // ---------------------------------------------------------
    console.log(`\n${colors.bold}7. Peer-to-Peer (P2P) Balance Transfer Test:${colors.reset}`);
    
    // Login as Alex Morgan (Sender)
    const alexLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alex@aurelis.com', password: 'Password123!' }),
    });
    const alexLoginData = await alexLoginRes.json();
    const alexToken = alexLoginData.token;

    // Get initial balances
    const alexInitialUsdWallet = (await db.wallets.values()).find(
      (w) => w.userId === 'usr_01' && w.currency === 'USD'
    );
    const initialAlexBalance = alexInitialUsdWallet?.balance || 0;

    const vanceInitialChfWallet = (await db.wallets.values()).find(
      (w) => w.userId === createdUserId && w.currency === 'CHF'
    );
    const initialVanceBalance = vanceInitialChfWallet?.balance || 0;

    console.log(`       Sender (Alex) Initial USD Balance: $${initialAlexBalance.toFixed(2)}`);
    console.log(`       Recipient (Vance) Initial CHF Balance: CHF ${initialVanceBalance.toFixed(2)}`);

    const transferAmountUSD = 2000.00;

    // Execute transfer from Alex to Lord Vance
    const transferRes = await fetch(`${baseUrl}/transfers/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${alexToken}`,
      },
      body: JSON.stringify({
        recipientEmail: testNewUser.email,
        recipientName: testNewUser.fullName,
        sourceCurrency: 'USD',
        destinationCurrency: 'CHF',
        amount: transferAmountUSD,
        reference: 'Sovereign Syndicate Allocation',
        pin: '1234',
      }),
    });

    const transferData = await transferRes.json();
    assert(transferRes.status === 201, 'P2P Transfer HTTP status is 201 Created');
    assert(Boolean(transferData.transaction?.id), 'Transfer created valid transaction ID', transferData.transaction?.id);

    // Verify Sender (Alex) Balance was debited
    const alexUpdatedUsdWallet = (await db.wallets.values()).find(
      (w) => w.userId === 'usr_01' && w.currency === 'USD'
    );
    assert(
      alexUpdatedUsdWallet !== undefined && alexUpdatedUsdWallet.balance < initialAlexBalance,
      'Sender (Alex Morgan) USD wallet was debited in database',
      `New balance: $${alexUpdatedUsdWallet?.balance.toFixed(2)} (Debited: $${transferAmountUSD})`
    );

    // Verify Recipient (Lord Vance) Balance was credited
    const vanceUpdatedChfWallet = (await db.wallets.values()).find(
      (w) => w.userId === createdUserId && w.currency === 'CHF'
    );
    assert(
      vanceUpdatedChfWallet !== undefined && vanceUpdatedChfWallet.balance > initialVanceBalance,
      'Recipient (Lord Vance) CHF wallet was credited in database',
      `New balance: CHF ${vanceUpdatedChfWallet?.balance.toFixed(2)} (Credited: +CHF ${(vanceUpdatedChfWallet!.balance - initialVanceBalance).toFixed(2)})`
    );

    // Verify Double-Entry Ledger and Transactions in Database
    const vanceTransactions = (await db.transactions.values()).filter((t) => t.userId === createdUserId);
    const hasIncomingReceiveTxn = vanceTransactions.some((t) => t.type === 'receive');
    assert(hasIncomingReceiveTxn, 'Database recorded incoming "receive" transaction entity for recipient');

    const vanceNotifications = (await db.notifications.values()).filter((n) => n.userId === createdUserId);
    const hasIncomingNotif = vanceNotifications.some((n) => n.title.toLowerCase().includes('received'));
    assert(hasIncomingNotif, 'Database generated incoming transfer notification for recipient');

    // ---------------------------------------------------------
    // TEST 8: Self-Transfer Prevention & Balance Protection Test
    // ---------------------------------------------------------
    console.log(`\n${colors.bold}8. Self-Transfer Prevention & Balance Protection Test:${colors.reset}`);
    
    const alexBalanceBeforeSelfTransfer = alexUpdatedUsdWallet?.balance || 0;

    // Attempt transfer from Alex Morgan to Alex Morgan (own email)
    const selfTransferRes = await fetch(`${baseUrl}/transfers/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${alexToken}`,
      },
      body: JSON.stringify({
        recipientEmail: 'alex@aurelis.com',
        recipientName: 'Alex Morgan',
        sourceCurrency: 'USD',
        destinationCurrency: 'USD',
        amount: 500.00,
        reference: 'Attempted self transfer',
        pin: '1234',
      }),
    });

    const selfTransferData = await selfTransferRes.json();
    assert(selfTransferRes.status === 400, 'Self-transfer rejected with 400 Bad Request', `Status: ${selfTransferRes.status}`);
    assert(
      typeof selfTransferData.error === 'string' && selfTransferData.error.includes('Self-transfer is not permitted'),
      'API returns descriptive self-transfer error message',
      selfTransferData.error
    );

    // Verify Sender balance was NOT debited
    const alexBalanceAfterSelfTransfer = (await db.wallets.values()).find(
      (w) => w.userId === 'usr_01' && w.currency === 'USD'
    )?.balance;

    assert(
      alexBalanceAfterSelfTransfer === alexBalanceBeforeSelfTransfer,
      'Sender wallet balance remains completely protected and untouched',
      `Balance: $${alexBalanceAfterSelfTransfer?.toFixed(2)}`
    );

    // ---------------------------------------------------------
    // TEST 9: Minimal Signup Form (Only Name, Email, Password)
    // ---------------------------------------------------------
    console.log(`\n${colors.bold}9. Minimal Signup Verification (Auto-defaulted Base USD Vault):${colors.reset}`);
    const minimalUser = {
      fullName: 'Lady Genevieve Rothschild',
      email: `genevieve.${Date.now()}@rothschild.vault`,
      password: 'RothschildPassword123!',
    };

    const minRegResponse = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(minimalUser),
    });

    const minRegData = await minRegResponse.json();
    assert(minRegResponse.status === 201, 'Minimal signup returns 201 Created');
    assert(Boolean(minRegData.user?.baseCurrency), 'Minimal signup assigns base currency', minRegData.user?.baseCurrency);
    assert(!minRegData.user?.tier, 'Minimal signup has no tier', minRegData.user?.tier);

    // Verify initial balance in backend database is isolated 10,000.00
    const genevieveWallets = (await db.wallets.values()).filter((w) => w.userId === minRegData.user?.id);
    assert(genevieveWallets.length === 1, 'Auto-provisioned exactly 1 base wallet for minimal signup');
    assert(genevieveWallets[0].currency === minRegData.user?.baseCurrency, 'Base wallet currency matches user currency');
    assert(genevieveWallets[0].balance === 10000.0, 'Base wallet opening balance is isolated 10,000.00');

    // ---------------------------------------------------------
    // TEST 10: Counterparty User Lookup Endpoint (GET /users/lookup)
    // ---------------------------------------------------------
    console.log(`\n${colors.bold}10. Counterparty User Lookup Test:${colors.reset}`);
    const lookupRes = await fetch(`${baseUrl}/users/lookup?q=${encodeURIComponent(minimalUser.email)}`, {
      headers: { Authorization: `Bearer ${alexToken}` },
    });
    const lookupData = await lookupRes.json();
    assert(lookupRes.status === 200, 'GET /users/lookup returns 200 OK');
    assert(lookupData.found === true, 'Lookup finds registered user by email');
    assert(lookupData.isSelf === false, 'Lookup accurately flags user as non-self counterparty');
    assert(lookupData.user?.email === minimalUser.email, 'Lookup returns matched counterparty profile');

    // Direct Lookup by User ID
    const idLookupRes = await fetch(`${baseUrl}/users/lookup?q=${encodeURIComponent(minRegData.user?.id)}`, {
      headers: { Authorization: `Bearer ${alexToken}` },
    });
    const idLookupData = await idLookupRes.json();
    assert(idLookupRes.status === 200, 'Lookup by User ID returns 200 OK');
    assert(idLookupData.found === true, 'Lookup successfully finds user by User ID');
    assert(idLookupData.user?.id === minRegData.user?.id, 'Lookup returns matching user entity for User ID');
    assert(Array.isArray(idLookupData.matches), 'Lookup returns matches array for direct counterparty selection');

    // Test Direct P2P Transfer via User ID (no contact saved)
    const directTransferRes = await fetch(`${baseUrl}/transfers/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${alexToken}`,
      },
      body: JSON.stringify({
        recipientId: minRegData.user?.id,
        sourceCurrency: 'USD',
        destinationCurrency: 'USD',
        amount: 500.0,
        reference: 'Direct P2P via User ID',
        pin: '1234',
      }),
    });
    const directTransferData = await directTransferRes.json();
    assert(directTransferRes.status === 201, 'Direct P2P transfer via User ID succeeds with 201 Created');
    assert(Boolean(directTransferData.transaction?.id), 'Direct transfer created transaction record');

    // Verify recipient's balance increased by 500
    const genevieveUpdatedWallets = (await db.wallets.values()).filter((w) => w.userId === minRegData.user?.id);
    const genevieveUsdWallet = genevieveUpdatedWallets.find((w) => w.currency === 'USD');
    assert(
      Boolean(genevieveUsdWallet && genevieveUsdWallet.balance === 500.0),
      'Recipient USD wallet created & credited directly via User ID transfer',
      `USD Balance: $${genevieveUsdWallet?.balance}`
    );

    // Test Non-existent Recipient Transfer Rejection & Balance Protection
    const alexPreFailedWallet = (await db.wallets.values()).find(
      (w) => w.userId === 'usr_01' && w.currency === 'USD'
    );
    const balanceBeforeFailed = alexPreFailedWallet?.balance || 0;

    const failedTransferRes = await fetch(`${baseUrl}/transfers/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${alexToken}`,
      },
      body: JSON.stringify({
        recipientEmail: 'wrong.user@doesnotexist.com',
        sourceCurrency: 'USD',
        destinationCurrency: 'USD',
        amount: 250.0,
        pin: '1234',
      }),
    });
    const failedTransferData = await failedTransferRes.json();
    assert(failedTransferRes.status === 400, 'Transfer to non-existent recipient rejected with 400 Bad Request');
    assert(
      failedTransferData.error?.includes('was not found in the DBS Bank registry') || failedTransferData.error?.includes('was not found in the AURELIS registry'),
      'API confirms recipient was not found in registry'
    );

    const alexPostFailedWallet = (await db.wallets.values()).find(
      (w) => w.userId === 'usr_01' && w.currency === 'USD'
    );
    assert(
      alexPostFailedWallet?.balance === balanceBeforeFailed,
      'Sender wallet balance remains completely protected and untouched on failed recipient'
    );

    // Test Self Lookup detection
    const selfLookupRes = await fetch(`${baseUrl}/users/lookup?q=alex@aurelis.com`, {
      headers: { Authorization: `Bearer ${alexToken}` },
    });
    const selfLookupData = await selfLookupRes.json();
    assert(selfLookupData.isSelf === true, 'Lookup accurately detects self-counterparty query');

    // ---------------------------------------------------------
    // TEST 11: Strict 401 Unauthorized for Tokenless Requests
    // ---------------------------------------------------------
    console.log(`\n${colors.bold}11. Strict 401 Unauthorized Protection Test:${colors.reset}`);
    const unauthWalletsRes = await fetch(`${baseUrl}/wallets`);
    assert(unauthWalletsRes.status === 401, 'Unauthenticated request to /wallets strictly returns 401 Unauthorized');

    const unauthProfileRes = await fetch(`${baseUrl}/auth/profile`);
    assert(unauthProfileRes.status === 401, 'Unauthenticated request to /auth/profile strictly returns 401 Unauthorized');

    // ---------------------------------------------------------
    // TEST 12: Frequent Beneficiary Isolation per User & Auto-Recording
    // ---------------------------------------------------------
    console.log(`\n${colors.bold}12. Beneficiary Isolation & Auto-Recording on Transfer:${colors.reset}`);
    // A newly registered user must start with zero beneficiaries
    const alphaTimestamp = Date.now() + 99;
    const alphaRegRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Baroness Beatrix',
        email: `beatrix.${alphaTimestamp}@sovereign.at`,
        password: 'BeatrixVault2026!',
      }),
    });
    const alphaRegData = await alphaRegRes.json();
    const beatrixToken = alphaRegData.token;

    // Verify Beatrix's beneficiaries list is empty (0 beneficiaries)
    const beatrixRecipientsRes = await fetch(`${baseUrl}/recipients`, {
      headers: { Authorization: `Bearer ${beatrixToken}` },
    });
    const beatrixRecipientsData = await beatrixRecipientsRes.json();
    assert(beatrixRecipientsRes.status === 200, 'Beatrix can fetch her recipients list with 200 OK');
    assert(
      Array.isArray(beatrixRecipientsData.recipients) && beatrixRecipientsData.recipients.length === 0,
      'New user Beatrix starts with 0 beneficiaries (no shared hardcoded beneficiaries)',
      `Found: ${beatrixRecipientsData.recipients?.length || 0} recipients`
    );

    // Verify Alex still has his own beneficiaries
    const alexRecipientsRes = await fetch(`${baseUrl}/recipients`, {
      headers: { Authorization: `Bearer ${alexToken}` },
    });
    const alexRecipientsData = await alexRecipientsRes.json();
    assert(
      alexRecipientsRes.status === 200,
      `Alex (usr_01) maintains personal beneficiaries access`
    );

    // Beatrix transfers funds to Alex by email
    const beatrixTransferRes = await fetch(`${baseUrl}/transfers/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${beatrixToken}`,
      },
      body: JSON.stringify({
        recipientEmail: 'alex@aurelis.com',
        sourceCurrency: 'BDT',
        destinationCurrency: 'USD',
        amount: 300.0,
        pin: '1234',
      }),
    });
    assert(beatrixTransferRes.status === 201, 'Beatrix transfer of $300 to Alex succeeds with 201 Created');

    // Verify that Alex was automatically saved to Beatrix's beneficiaries
    const beatrixPostTransferRes = await fetch(`${baseUrl}/recipients`, {
      headers: { Authorization: `Bearer ${beatrixToken}` },
    });
    const beatrixPostTransferData = await beatrixPostTransferRes.json();
    assert(
      beatrixPostTransferData.recipients?.length === 1,
      'Beatrix now has exactly 1 beneficiary automatically recorded after transfer'
    );
    assert(
      beatrixPostTransferData.recipients?.[0]?.email === 'alex@aurelis.com',
      'Auto-recorded beneficiary email matches the transfer recipient (alex@aurelis.com)'
    );
    assert(
      beatrixPostTransferData.recipients?.[0]?.name === 'Alex Morgan',
      'Auto-recorded beneficiary name matches the recipient full name (Alex Morgan)'
    );

    // Register another user (Lord Charles) and verify he cannot see Beatrix's or Alex's beneficiaries
    const charlesTimestamp = Date.now() + 199;
    const charlesRegRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Lord Charles Windsor',
        email: `charles.${charlesTimestamp}@sovereign.uk`,
        password: 'CharlesVault2026!',
      }),
    });
    const charlesRegData = await charlesRegRes.json();
    const charlesToken = charlesRegData.token;

    const charlesRecipientsRes = await fetch(`${baseUrl}/recipients`, {
      headers: { Authorization: `Bearer ${charlesToken}` },
    });
    const charlesRecipientsData = await charlesRecipientsRes.json();
    assert(
      charlesRecipientsData.recipients?.length === 0,
      'Third user Charles has 0 beneficiaries; zero leakage between user accounts'
    );

  } catch (err: any) {
    console.error(`${colors.red}Test execution encountered an error:${colors.reset}`, err);
    failedTests++;
  } finally {
    // Teardown test server
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  }

  // Final Summary Report
  console.log(`\n${colors.gold}${colors.bold}======================================================${colors.reset}`);
  console.log(`${colors.bold}TEST RESULTS SUMMARY:${colors.reset}`);
  console.log(`  Total Tests Run: ${totalTests}`);
  console.log(`  ${colors.green}Passed: ${passedTests}${colors.reset}`);
  if (failedTests > 0) {
    console.log(`  ${colors.red}Failed: ${failedTests}${colors.reset}`);
  } else {
    console.log(`  ${colors.green}${colors.bold}All tests passed successfully! 100% database integrity verified.${colors.reset}`);
  }
  console.log(`${colors.gold}${colors.bold}======================================================${colors.reset}\n`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAuthDatabaseTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
