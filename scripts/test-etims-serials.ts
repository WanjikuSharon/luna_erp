// scripts/test-etims-serials.ts
/**
 * Test Multiple Serial Numbers
 * 
 * This script tries common sandbox serials to help you find the right one.
 * If all fail, you need to contact KRA for your actual serial number.
 */

const SERIALS_TO_TRY = [
  'SD2T0000001',
  'SD2T0000002',
  'SD2T0000003',
  'KRATK04_B6096',
  'SDC0000001',
  'SDC0000002',
  'TEST000001',
  'LUNA_19_2025', // Your original one
];

const CONFIG = {
  url: 'https://etims-api-sbx.kra.go.ke/etims-api/selectInitOsdcInfo',
  tin: 'P052454082G',
  branchId: '00',
};

async function testSerial(serial: string) {
  try {
    const response = await fetch(CONFIG.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'oscuCountry': 'Kenya',
        'oscuCurrency': 'KES',
        'oscuTimezone': 'UTC+3'
      },
      body: JSON.stringify({
        tin: CONFIG.tin,
        bhfId: CONFIG.branchId,
        dvcSrlNo: serial
      })
    });

    const data = await response.json();
    return { serial, status: response.status, data };
  } catch (error: any) {
    return { serial, error: error.message };
  }
}

async function testAllSerials() {
  console.log('🔍 Testing Multiple Serial Numbers...\n');
  console.log('This will try common sandbox serials to find one that works.\n');

  for (const serial of SERIALS_TO_TRY) {
    process.stdout.write(`Testing: ${serial.padEnd(20)} ... `);
    
    const result = await testSerial(serial);
    
    if (result.data?.resultCd === '000') {
      console.log('✅ SUCCESS!\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🎉 FOUND WORKING SERIAL NUMBER!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log(`Use this serial: ${serial}\n`);
      console.log('Copy these to your .env.local:\n');
      console.log(`ETIMS_API_KEY=${result.data.data?.scuId || serial}`);
      console.log(`ETIMS_API_SECRET=${result.data.data?.cmcKey}`);
      console.log(`ETIMS_DEVICE_SERIAL=${serial}`);
      console.log(`ETIMS_COMPANY_PIN=${CONFIG.tin}`);
      console.log(`ETIMS_BRANCH_ID=${CONFIG.branchId}\n`);
      console.log('Full Response:');
      console.log(JSON.stringify(result.data, null, 2));
      return;
    } else {
      console.log(`❌ ${result.data?.resultMsg || result.error || 'Failed'}`);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('❌ NO WORKING SERIAL FOUND');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('You need to get your actual serial number from KRA.\n');
  console.log('📧 HOW TO GET YOUR SERIAL NUMBER:\n');
  console.log('Option 1: Check KRA Email');
  console.log('  - Look for email from KRA when Service Request was approved');
  console.log('  - Subject might be: "eTIMS Service Request Approved"\n');
  
  console.log('Option 2: KRA Portal');
  console.log('  1. Go to: https://etims.kra.go.ke');
  console.log('  2. Login with your iTax credentials');
  console.log('  3. Click "Service Request" tab');
  console.log('  4. Click "Search" to load your requests');
  console.log('  5. Find your OSCU integration request');
  console.log('  6. Look for "Device Serial Number" or "SCU ID"\n');
  
  console.log('Option 3: Contact KRA Support');
  console.log('  📞 Call: 0709 912 912 (KRA Contact Center)');
  console.log('  📧 Email: support@kra.go.ke');
  console.log('  💬 Say: "I need my eTIMS OSCU device serial number"');
  console.log('  📝 Provide: Your PIN (P052454082G)\n');
  
  console.log('Option 4: KRA iTax Helpdesk');
  console.log('  - Log in to iTax (https://itax.kra.go.ke)');
  console.log('  - Go to "Helpdesk" → "Submit Ticket"');
  console.log('  - Category: "eTIMS"');
  console.log('  - Issue: "Need device serial number for approved OSCU"\n');
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('Once you have the serial number:');
  console.log('1. Update scripts/init-etims.ts with the correct serial');
  console.log('2. Run: npx ts-node scripts/init-etims.ts');
  console.log('3. Copy the credentials to .env.local\n');
}

testAllSerials();
