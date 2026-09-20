import http from 'http';
import { app } from '../src/app';
import { db } from '../src/db/database';
import { SocketService } from '../src/sockets/websocketServer';
import { NotificationDispatchService } from '../src/services/notificationDispatchService';
import { TransferService } from '../src/services/transferService';
import { UserEntity } from '../src/types';

const TEST_PORT = 4098;
let server: http.Server;
const baseUrl = `http://localhost:${TEST_PORT}/v1`;

let passed = 0;
let failed = 0;
let uniqueEmail = '';
let testUserId = '';

function assert(condition: unknown, msg: string, detail?: string) {
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

async function request(path: string, options: RequestInit = {}, token?: string) {
  const url = `${baseUrl}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as any),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runTest() {
  console.log('\n================================================================');
  console.log(' AURELIS — TRANSACTION COMPLETION NOTIFICATIONS (EMAIL & SMS) ');
  console.log('================================================================\n');

  // Start test server
  server = http.createServer(app);
  SocketService.initialize(server);
  await new Promise<void>((resolve) => server.listen(TEST_PORT, () => resolve()));

  try {
    // 1. Direct Service Unit Verification
    console.log('1. NotificationDispatchService Unit Verification:');
    const testUser: UserEntity = {
      id: `usr_test_${Date.now()}`,
      email: `alexander.wright.${Date.now()}@sovereign-vault.ch`,
      phone: '+41 44 215 50 00',
      fullName: 'Alexander Wright',
      passwordHash: 'dummy_hash',
      aurelisTag: `@wright_${Date.now().toString(36)}`,
      tier: 'Private Wealth Sovereign',
      baseCurrency: 'USD',
      avatar: '',
      twoFactorEnabled: true,
      biometricEnabled: true,
      passkeyEnabled: true,
      address: { street: 'Bahnhofstrasse 12', city: 'Zurich', country: 'Switzerland', postalCode: '8001' },
      transactionPin: '1234',
      emailAlertsEnabled: true,
      smsAlertsEnabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    testUserId = testUser.id;
    // Save test user to db
    await db.users.set(testUser.id, testUser);

    // Test A: Send Money alert generation
    const sendTxn = {
      id: `TXN-${Date.now().toString(16).toUpperCase()}`,
      userId: testUser.id,
      type: 'send' as const,
      amount: 50000.0,
      currency: 'USD' as const,
      totalCharged: 50000.0,
      fee: 0,
      recipientName: 'Geneva Asset Vault SA',
      recipientEmail: 'custody@genevavault.ch',
      paymentMethod: 'AURELIS USD Vault',
      status: 'Completed' as const,
      date: new Date().toISOString(),
      reference: 'Private Wire Transfer',
      category: 'Transfer',
    };

    const sendAlerts = await NotificationDispatchService.dispatchTransactionAlerts(
      sendTxn,
      testUser,
      { walletBalance: 450000.0, currency: 'USD' }
    );

    assert(Boolean(sendAlerts.smsAlert), 'Send Money: SMS alert created successfully');
    assert(
      Boolean(
        sendAlerts.smsAlert?.bodyText.includes('Send Money Tk 50,000.00 to Geneva Asset Vault SA successful.') &&
        sendAlerts.smsAlert?.bodyText.includes('Fee Tk 0.00.') &&
        sendAlerts.smsAlert?.bodyText.includes('Balance Tk 450,000.00.') &&
        sendAlerts.smsAlert?.bodyText.includes(`TrxID ${sendTxn.id}`)
      ),
      'Send Money: SMS alert contains proper MFS template, amount, fee, balance, and TrxID',
      sendAlerts.smsAlert?.bodyText
    );

    assert(Boolean(sendAlerts.emailAlert), 'Send Money: Email receipt created successfully');
    assert(
      sendAlerts.emailAlert?.subject.includes('Geneva Asset Vault SA') &&
      Boolean(sendAlerts.emailAlert?.bodyHtml?.includes('DBS BANK • DIGITAL BANKING BANGLADESH')),
      'Send Money: Email receipt contains DBS Bank Bangladesh HTML template'
    );

    // Test B: Receive Money alert generation
    const receiveTxn = {
      id: `TXN-REC-${Date.now().toString(16).toUpperCase()}`,
      userId: testUser.id,
      type: 'receive' as const,
      amount: 75000.0,
      currency: 'USD' as const,
      totalCharged: 0,
      fee: 0,
      senderName: 'Zurich Sovereign Liquidity AG',
      recipientName: testUser.fullName,
      recipientEmail: testUser.email,
      paymentMethod: 'Interbank SWIFT Inbound',
      status: 'Completed' as const,
      date: new Date().toISOString(),
      reference: 'Retainer Settlement',
      category: 'Transfer',
    };

    const receiveAlerts = await NotificationDispatchService.dispatchTransactionAlerts(
      receiveTxn,
      testUser,
      { walletBalance: 525000.0, currency: 'USD' }
    );

    assert(Boolean(receiveAlerts.smsAlert), 'Receive Money: SMS alert created successfully');
    assert(
      receiveAlerts.smsAlert?.bodyText.includes('Cash In or Send Money Tk 75,000.00 from Zurich Sovereign Liquidity AG successful.') &&
      receiveAlerts.smsAlert?.bodyText.includes('Fee Tk 0.00.') &&
      receiveAlerts.smsAlert?.bodyText.includes('Balance Tk 525,000.00.') &&
      receiveAlerts.smsAlert?.bodyText.includes(`TrxID ${receiveTxn.id}`),
      'Receive Money: SMS alert clearly reports credited amount, counterparty, fee, and balance',
      receiveAlerts.smsAlert?.bodyText
    );
    assert(
      receiveAlerts.emailAlert?.subject.includes('Capital Inbound Notification') &&
      receiveAlerts.emailAlert?.subject.includes('75,000.00'),
      'Receive Money: Email subject matches inbound credit notification'
    );

    // Test C: Add Money (Deposit) alert generation
    const depositTxn = {
      id: `TXN-DEP-${Date.now().toString(16).toUpperCase()}`,
      userId: testUser.id,
      type: 'deposit' as const,
      amount: 100000.0,
      currency: 'USD' as const,
      totalCharged: 100000.0,
      fee: 0,
      senderName: 'Direct ACH Wire',
      recipientName: 'AURELIS USD Wallet',
      paymentMethod: 'UBS Switzerland Custody (•••• 4810)',
      status: 'Completed' as const,
      date: new Date().toISOString(),
      reference: 'Capital Reserve Addition',
      category: 'Deposit',
    };

    const depositAlerts = await NotificationDispatchService.dispatchTransactionAlerts(
      depositTxn,
      testUser,
      { walletBalance: 625000.0, currency: 'USD' }
    );

    assert(Boolean(depositAlerts.smsAlert), 'Add Money: SMS alert created successfully');
    assert(
      depositAlerts.smsAlert?.bodyText.includes('Cash In Tk 100,000.00') &&
      depositAlerts.smsAlert?.bodyText.includes('successful.') &&
      depositAlerts.smsAlert?.bodyText.includes('Fee Tk 0.00.') &&
      depositAlerts.smsAlert?.bodyText.includes('Balance Tk 625,000.00.') &&
      depositAlerts.smsAlert?.bodyText.includes(`TrxID ${depositTxn.id}`),
      'Add Money: SMS alert confirms deposit credit with standard MFS format',
      depositAlerts.smsAlert?.bodyText
    );
    assert(
      depositAlerts.emailAlert?.subject.includes('Vault Deposit Confirmed') &&
      depositAlerts.emailAlert?.bodyHtml?.includes('Vault Capital Deposit'),
      'Add Money: Email receipt confirms deposit capital addition'
    );

    // 2. Authentication & API Endpoints Verification
    console.log('\n2. REST API & Endpoints Verification:');
    // Register or login a fresh user to get token
    uniqueEmail = `notif.client.${Date.now()}@aurelis.vault`;
    const regRes = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: uniqueEmail,
        password: 'Password123!',
        fullName: 'Baroness Charlotte de Vigny',
        currency: 'USD',
      }),
    });

    assert(regRes.ok, 'Registered new user for API notification testing');
    const token = regRes.data?.token;
    assert(Boolean(token), 'Received JWT auth token');

    // Test GET /notifications/preferences
    const prefRes = await request('/notifications/preferences', { method: 'GET' }, token);
    assert(prefRes.ok, 'GET /notifications/preferences succeeds');
    assert(prefRes.data?.emailAlertsEnabled === true, 'Email alerts enabled by default');
    assert(prefRes.data?.smsAlertsEnabled === true, 'SMS alerts enabled by default');

    // Test PATCH /notifications/preferences (toggle off SMS, keep Email)
    const updatePrefRes = await request('/notifications/preferences', {
      method: 'PATCH',
      body: JSON.stringify({ smsAlertsEnabled: false }),
    }, token);
    assert(updatePrefRes.ok, 'PATCH /notifications/preferences succeeds');
    assert(updatePrefRes.data?.preferences?.smsAlertsEnabled === false, 'SMS alerts successfully toggled to false');

    // Re-enable SMS
    await request('/notifications/preferences', {
      method: 'PATCH',
      body: JSON.stringify({ smsAlertsEnabled: true }),
    }, token);

    // Test POST /notifications/test-alert
    const testAlertRes = await request('/notifications/test-alert', {
      method: 'POST',
      body: JSON.stringify({
        type: 'send',
        amount: 25000,
        currency: 'USD',
      }),
    }, token);

    assert(testAlertRes.ok, 'POST /notifications/test-alert succeeds');
    assert(Boolean(testAlertRes.data?.alerts?.smsAlert), 'Test alert triggered SMS message');
    assert(Boolean(testAlertRes.data?.alerts?.emailAlert), 'Test alert triggered Email receipt');

    // Test GET /notifications/alerts (dispatched alerts history)
    const alertsHistoryRes = await request('/notifications/alerts', { method: 'GET' }, token);
    assert(alertsHistoryRes.ok, 'GET /notifications/alerts succeeds');
    assert(
      Array.isArray(alertsHistoryRes.data?.alerts) && alertsHistoryRes.data.alerts.length >= 2,
      `Alerts history returns dispatched items (found: ${alertsHistoryRes.data?.alerts?.length || 0})`
    );

    // Filter by channel
    const smsOnlyRes = await request('/notifications/alerts?channel=sms', { method: 'GET' }, token);
    assert(
      smsOnlyRes.ok && smsOnlyRes.data?.alerts?.every((a: any) => a.channel === 'SMS'),
      'GET /notifications/alerts?channel=sms filters strictly to SMS messages'
    );

    // 3. End-to-End Flow Verification (Deposit + Transfer)
    console.log('\n3. End-to-End Financial Transactions Alert Verification:');

    // Add Money (Deposit $10,000)
    const depRes = await request('/wallets/deposit', {
      method: 'POST',
      body: JSON.stringify({
        currency: 'USD',
        amount: 10000.0,
        fundingSource: 'UBS Switzerland Custody (•••• 4810)',
      }),
    }, token);

    assert(depRes.ok, 'Deposit ($10,000 USD) executed successfully');

    // Give asynchronous dispatch 200ms
    await new Promise((r) => setTimeout(r, 200));

    const postDepAlerts = await request('/notifications/alerts', { method: 'GET' }, token);
    const depAlertFound = postDepAlerts.data?.alerts?.some(
      (a: any) => a.bodyText?.includes('10,000.00') || a.subject?.includes('Deposit Confirmed')
    );
    assert(depAlertFound, 'Deposit transaction automatically triggered and logged alerts');

    console.log('\n================================================================');
    console.log(` TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal test error:', error);
    process.exit(1);
  } finally {
    try {
      if (uniqueEmail) {
        const u = await db.users.get(uniqueEmail);
        const pool = db.engine.getPool();
        if (testUserId) {
          await pool.query('DELETE FROM dispatched_alerts WHERE user_id = $1', [testUserId]);
          await pool.query('DELETE FROM transactions WHERE user_id = $1', [testUserId]);
          await pool.query('DELETE FROM wallets WHERE user_id = $1', [testUserId]);
          await pool.query('DELETE FROM notifications WHERE user_id = $1', [testUserId]);
          await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
        }
        if (u) {
          await pool.query('DELETE FROM dispatched_alerts WHERE user_id = $1', [u.id]);
          await pool.query('DELETE FROM transactions WHERE user_id = $1', [u.id]);
          await pool.query('DELETE FROM wallets WHERE user_id = $1', [u.id]);
          await pool.query('DELETE FROM notifications WHERE user_id = $1', [u.id]);
          await pool.query('DELETE FROM users WHERE id = $1', [u.id]);
        }
      }
    } catch (e) {
      // ignore cleanup error
    }
    if (server) {
      server.close();
    }
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTest();
