import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { SmsService } from '../src/services/smsService';

async function main() {
  console.log('====================================================');
  console.log('      SMS.NET.BD LIVE INTEGRATION DIAGNOSTIC        ');
  console.log('====================================================\n');

  const apiKey = process.env.SMS_NET_BD_API_KEY;
  const senderId = process.env.SMS_NET_BD_SENDER_ID;
  const targetRecipient = senderId || '01996990184';

  console.log(`API Key configured: ${apiKey ? apiKey.substring(0, 6) + '...' + apiKey.slice(-4) : 'NONE'}`);
  console.log(`Sender ID in .env : ${senderId || 'NONE (default)'}`);
  console.log(`Target Phone      : ${targetRecipient}\n`);

  // Step 1: Check Account Balance
  console.log('1. Checking account balance from sms.net.bd...');
  const balanceResult = await SmsService.getBalance();
  console.log('Balance result:', JSON.stringify(balanceResult, null, 2));

  if (!balanceResult.success) {
    console.error('\nBalance check failed. Please verify your API key.');
  } else {
    console.log(`\nAccount Balance: ${balanceResult.balance} BDT`);
  }

  // Step 2: Test Dispatch to Recipient Number
  console.log('\n2. Attempting test SMS dispatch to:', targetRecipient);
  const testMsg = `[AURELIS] Live SMS test via sms.net.bd. Time: ${new Date().toLocaleTimeString()}`;

  // Attempt with configured senderId
  console.log(`Attempting send with sender_id="${senderId}"...`);
  const sendResult = await SmsService.sendSms({
    to: targetRecipient,
    msg: testMsg,
    sender_id: senderId,
  });

  console.log('Send result:', JSON.stringify(sendResult, null, 2));

  // If failed with 413 (Invalid Sender ID), try without sender_id
  if (!sendResult.success && sendResult.errorCode === 413) {
    console.log('\n[NOTE] Sender ID was rejected by sms.net.bd (must be an approved BTRC masking name).');
    console.log('Retrying without sender_id (using sms.net.bd standard default sender)...');
    
    delete process.env.SMS_NET_BD_SENDER_ID;
    delete process.env.SMS_SENDER_ID;

    const retryResult = await SmsService.sendSms({
      to: targetRecipient,
      msg: testMsg,
      sender_id: '',
    });
    console.log('Retry without sender_id result:', JSON.stringify(retryResult, null, 2));

    if (retryResult.success) {
      console.log('\n[SUCCESS] SMS was sent successfully without sender_id!');
      console.log('[RECOMMENDATION] In .env, leave SMS_NET_BD_SENDER_ID blank unless you have an approved alphanumeric masking ID.');
      if (retryResult.requestId) {
        console.log('\n3. Checking delivery report for request ID:', retryResult.requestId);
        await new Promise((r) => setTimeout(r, 2000));
        const report = await SmsService.getReport(retryResult.requestId);
        console.log('Report result:', JSON.stringify(report, null, 2));
      }
    }
  } else if (sendResult.success && sendResult.requestId) {
    console.log('\n3. Checking delivery report for request ID:', sendResult.requestId);
    await new Promise((r) => setTimeout(r, 2000));
    const report = await SmsService.getReport(sendResult.requestId);
    console.log('Report result:', JSON.stringify(report, null, 2));
  }

  console.log('\n====================================================');
  console.log('                   DIAGNOSTIC END                   ');
  console.log('====================================================');
}

main().catch(console.error);
