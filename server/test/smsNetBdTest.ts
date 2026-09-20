import { SmsService, SMS_NET_BD_ERROR_MESSAGES } from '../src/services/smsService';

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

async function runTests() {
  console.log('\n======================================================');
  console.log('   AURELIS — SMS.NET.BD GATEWAY UNIT VERIFICATION     ');
  console.log('======================================================\n');

  // 1. Phone Number Normalization Tests
  console.log('1. Phone Number Normalization:');
  const num1 = SmsService.normalizePhoneNumber('+8801800000000');
  assert(num1 === '8801800000000', 'Strips leading + from Bangladeshi number with country code', num1);

  const num2 = SmsService.normalizePhoneNumber('01712345678');
  assert(num2 === '8801712345678', 'Converts standard 11-digit local 01X number to 880 prefix', num2);

  const num3 = SmsService.normalizePhoneNumber('  +880 1812-345 678  ');
  assert(num3 === '8801812345678', 'Strips spaces, hyphens, and whitespace', num3);

  const multi = SmsService.normalizeRecipients(['01811111111', '+8801722222222']);
  assert(multi === '8801811111111,8801722222222', 'Handles array of recipients with commas', multi);

  const multiStr = SmsService.normalizeRecipients('01811111111, +8801722222222');
  assert(multiStr === '8801811111111,8801722222222', 'Handles comma-separated string with spaces', multiStr);

  // 2. Error Code Dictionary Tests
  console.log('\n2. Error Code Translation:');
  assert(SMS_NET_BD_ERROR_MESSAGES[0].includes('Success'), 'Code 0 translates to success');
  assert(SMS_NET_BD_ERROR_MESSAGES[417].includes('Insufficient balance'), 'Code 417 translates to Insufficient balance');
  assert(SMS_NET_BD_ERROR_MESSAGES[414].includes('Message is empty'), 'Code 414 translates to Message is empty');
  assert(SMS_NET_BD_ERROR_MESSAGES[416].includes('No valid phone number found'), 'Code 416 translates to No valid number');

  // 3. Simulated Fallback Test (when API key empty)
  console.log('\n3. Simulated Fallback Handling:');
  const originalKey = process.env.SMS_NET_BD_API_KEY;
  delete process.env.SMS_NET_BD_API_KEY;
  delete process.env.SMS_API_KEY;

  const simResult = await SmsService.sendSms({
    to: '01800000000',
    msg: 'Cash In or Send Money Tk 10,000.00 from 01346503914 successful. Fee Tk 0.00. Balance Tk 10,091.36. TrxID DIK3OKZ0KJ at 20/09/2026 13:55.',
  });

  assert(simResult.success === true, 'Simulated delivery succeeds cleanly without error');
  assert(simResult.provider === 'simulated', 'Provider correctly identified as simulated');
  assert(simResult.recipient === '8801800000000', 'Recipient was normalized even in simulation');

  // Restore original key
  if (originalKey) {
    process.env.SMS_NET_BD_API_KEY = originalKey;
  }

  console.log('\n======================================================');
  console.log(`  Tests completed: ${passed} PASSED | ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Fatal error running tests:', e);
  process.exit(1);
});
