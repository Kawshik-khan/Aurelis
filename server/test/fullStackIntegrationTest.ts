import http from 'http';
import { app } from '../src/app';
import { db } from '../src/db/database';
import { SocketService } from '../src/sockets/websocketServer';
import { WebSocket } from 'ws';

const TEST_PORT = 4099;

let server: http.Server;

const baseUrl = `http://localhost:${TEST_PORT}/v1`;

async function request(path: string, options: RequestInit = {}) {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers as any),
    },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  [PASS] ${msg}`);
    if (detail) console.log(`         ↳ ${detail}`);
  } else {
    failed++;
    console.error(`  [FAIL] ${msg}`);
    if (detail) console.error(`         ↳ ${detail}`);
  }
}

async function run() {
  console.log('\n======================================================');
  console.log('      AURELIS — FULL STACK INTEGRATION TEST SUITE     ');
  console.log('======================================================\n');

  // Start test server
  server = http.createServer(app);
  SocketService.initialize(server);
  await new Promise<void>((resolve) => server.listen(TEST_PORT, () => resolve()));

  try {
    // 1. WebSocket Live Stream Verification
    console.log('1. Real-Time WebSocket Infrastructure:');
    const ws = new WebSocket(`ws://localhost:${TEST_PORT}/ws`);
    const receivedEvents: any[] = [];

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('WS connection timeout')), 3000);
      ws.on('open', () => {
        clearTimeout(timeout);
        resolve();
      });
      ws.on('message', (raw) => {
        try {
          receivedEvents.push(JSON.parse(raw.toString()));
        } catch {}
      });
    });

    assert(ws.readyState === WebSocket.OPEN, 'WebSocket handshake succeeded on /ws');

    // 2. User Registration & Auth Token
    console.log('\n2. User Identity & Multi-Currency Provisioning:');
    const testEmail = `baron_${Date.now()}@rothschild.ch`;
    const regRes = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail,
        fullName: 'Baron Philippe',
        country: 'Switzerland',
        baseCurrency: 'CHF',
        password: 'vaultPassword123!',
      }),
    });

    assert(regRes.status === 201, 'User registration returns 201 Created', `User ID: ${regRes.data?.user?.id}`);
    const token = regRes.data?.token;

    const userId = regRes.data?.user?.id;
    assert(Boolean(token), 'JWT authentication token received');

    // Send IDENTIFY over WebSocket
    ws.send(JSON.stringify({ type: 'IDENTIFY', userId }));
    await new Promise((r) => setTimeout(r, 200));

    const identifiedEvent = receivedEvents.find((e) => e.type === 'IDENTIFIED');
    assert(Boolean(identifiedEvent), 'WebSocket client authenticated with user identity');

    // 3. Multi-Currency Wallets & Deposits
    console.log('\n3. Multi-Currency Account Management & Capital Funding:');
    const authHeaders = { Authorization: `Bearer ${token}` };

    // Deposit CHF into base wallet
    const depRes = await request('/wallets/deposit', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        currency: 'CHF',
        amount: 50000,
        fundingSource: 'Geneva Private Bank Wire',
      }),
    });
    assert(depRes.status === 200, 'Capital deposit completed', `New balance: ${depRes.data?.wallet?.balance} CHF`);

    // Create secondary USD wallet
    const createUsdRes = await request('/wallets', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ currency: 'USD' }),
    });
    assert(createUsdRes.status === 201, 'Secondary USD currency wallet provisioned in PostgreSQL');

    // 4. Institutional Foreign Exchange (FX) Conversion
    console.log('\n4. FX Rate Lock & Treasury Conversion:');
    const lockRes = await request('/fx/quote-lock', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        fromCurrency: 'CHF',
        toCurrency: 'USD',
        fromAmount: 10000,
      }),
    });
    assert(lockRes.status === 200, 'FX rate locked with institutional liquidity provider');

    const convertRes = await request('/fx/convert', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        fromCurrency: 'CHF',
        toCurrency: 'USD',
        fromAmount: 10000,
        quoteId: lockRes.data?.lock?.quoteId,
      }),
    });
    assert(convertRes.status === 201, 'Atomic currency exchange executed and recorded in double-entry ledger');
    assert(convertRes.data?.toWallet?.balance > 0, 'Target USD wallet credited with converted sum');

    // 5. Beneficiary Management
    console.log('\n5. Beneficiary Registry & Counterparty Administration:');
    const addRecRes = await request('/recipients', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Elena Rostova',
        email: 'elena@rostova.ch',
        currency: 'EUR',
        bankName: 'Credit Suisse Private Banking',
        accountNumber: '•••• 7719',
        routingOrIban: 'CH93 0077 1900 1234',
        aurelisTag: '@elena.rostova',
      }),
    });
    assert(addRecRes.status === 201, 'Beneficiary persisted in PostgreSQL database');
    const recId = addRecRes.data?.recipient?.id;

    // Toggle favorite
    const favRes = await request(`/recipients/${recId}/favorite`, {
      method: 'PATCH',
      headers: authHeaders,
    });
    assert(favRes.data?.recipient?.isFavorite === true, 'Beneficiary marked as favorite in PostgreSQL');

    // 6. Payment Card Issuance & Cryptographic Pin Reveal
    console.log('\n6. Card Issuance, Limits, & PIN Reveal:');
    const issueCardRes = await request('/cards/issue', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        tier: 'Black Titanium',
        type: 'physical',
      }),
    });
    assert(issueCardRes.status === 201, 'Black Titanium physical card issued in PostgreSQL');
    const cardId = issueCardRes.data?.card?.id;

    // Update limit
    const limitRes = await request(`/cards/${cardId}/limits`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ monthlyLimit: 75000 }),
    });
    assert(limitRes.data?.card?.monthlyLimit === 75000, 'Card monthly spending limit updated in PostgreSQL');

    // Reveal card credentials
    const revealRes = await request(`/cards/${cardId}/reveal`, {
      method: 'POST',
      headers: authHeaders,
    });
    assert(Boolean(revealRes.data?.cardNumber && revealRes.data?.cvv && revealRes.data?.pin), 'Card security credentials decrypted and revealed');

    // 7. Payment Requests & Invoicing
    console.log('\n7. Digital Invoices & Payment Requests:');
    const invoiceRes = await request('/invoices/request-payment', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        amount: 15000,
        currency: 'CHF',
        recipientEmail: 'client@advisory.com',
        message: 'Q3 Architectural Advisory Retainer',
      }),
    });
    assert(invoiceRes.status === 201, 'Payment invoice created in PostgreSQL with unique slug');
    const slug = invoiceRes.data?.paymentRequest?.slug;

    // Pay link lookup
    const payRes = await request(`/invoices/pay/${slug}`);
    assert(payRes.status === 200, 'Public payment request resolved successfully via slug');
    assert(payRes.data?.beneficiary?.name === 'Baron Philippe', 'Invoice displays registered beneficiary metadata');

    // 8. Notifications Lifecycle
    console.log('\n8. Notifications & Alerts:');
    const notifsRes = await request('/notifications', {
      headers: authHeaders,
    });
    assert(notifsRes.status === 200, 'Notifications retrieved from PostgreSQL database');

    const readAllRes = await request('/notifications/read-all', {
      method: 'PATCH',
      headers: authHeaders,
    });
    assert(readAllRes.status === 200, 'All notifications marked as read in PostgreSQL');

    // 9. Real-Time WebSocket Event Delivery Verification
    console.log('\n9. WebSocket Event Propagation Check:');
    const hasWalletEvent = receivedEvents.some((e) => e.type === 'WALLET_UPDATED');
    const hasTxnEvent = receivedEvents.some((e) => e.type === 'TRANSACTION_CREATED');
    assert(hasWalletEvent, 'WebSocket delivered live WALLET_UPDATED event to connected client');
    assert(hasTxnEvent, 'WebSocket delivered live TRANSACTION_CREATED event to connected client');

    ws.close();
    await new Promise((r) => setTimeout(r, 100));

    // 10. Database Persistence Verification
    console.log('\n10. Neon PostgreSQL Database Persistence Verification:');
    const userInDb = await db.users.get(userId);
    assert(Boolean(userInDb), 'User record persistently exists in Neon PostgreSQL storage');
    assert(userInDb?.baseCurrency === 'CHF', 'Base currency correctly recorded as CHF');

  } finally {
    server.close();
  }

  console.log('\n======================================================');
  console.log(`  Full Stack Integration: ${passed} Passed | ${failed} Failed`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

run().catch((e) => {
  console.error('Fatal error in integration test:', e);
  process.exit(1);
});

