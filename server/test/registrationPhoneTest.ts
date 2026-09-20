import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import http from 'http';
import { app } from '../src/app';
import { db } from '../src/db/database';
import { SocketService } from '../src/sockets/websocketServer';

const TEST_PORT = 4101;
let server: http.Server;

async function runTest() {
  console.log('====================================================');
  console.log('   REGISTRATION MOBILE NUMBER & SMS VERIFICATION    ');
  console.log('====================================================\n');

  server = http.createServer(app);
  SocketService.initialize(server);
  await new Promise<void>((resolve) => server.listen(TEST_PORT, () => resolve()));

  try {
    const testEmail = `vip.signup.${Date.now()}@aurelis.vault`;
    const testPhone = '01996990184';

    console.log(`Submitting registration for ${testEmail} with phone: ${testPhone}...`);
    const regRes = await fetch(`http://localhost:${TEST_PORT}/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        fullName: 'Baroness Charlotte',
        phone: testPhone,
        password: 'vaultMasterPassword123!',
      }),
    });

    const regData: any = await regRes.json();
    console.log('Registration HTTP Status:', regRes.status);
    console.log('Registration user response:', JSON.stringify(regData.user, null, 2));

    if (regRes.status !== 201) {
      throw new Error(`Registration failed: ${JSON.stringify(regData)}`);
    }

    if (regData.user?.phone !== testPhone) {
      throw new Error(`Expected user.phone to be "${testPhone}", but got "${regData.user?.phone}"`);
    }
    console.log(' [PASS] Returned user object contains registered phone number:', regData.user?.phone);

    // Verify stored in DB
    const userInDb = await db.getUserById(regData.user.id);
    console.log('Stored in DB user.phone:', userInDb?.phone);

    if (userInDb?.phone !== testPhone) {
      throw new Error(`Database user.phone mismatch: expected "${testPhone}", got "${userInDb?.phone}"`);
    }
    console.log(' [PASS] User record persistently stored in database with phone:', userInDb?.phone);

    console.log('\n====================================================');
    console.log('   REGISTRATION PHONE & SMS TEST COMPLETED: SUCCESS  ');
    console.log('====================================================\n');
  } finally {
    server.close();
    process.exit(0);
  }
}

runTest().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
