// scripts/init-etims.ts
/**
 * eTIMS Device Initialization Script
 * 
 * This is a ONE-TIME script to register your device with KRA eTIMS.
 * Run this before using the eTIMS integration for the first time.
 * 
 * Usage: npx ts-node scripts/init-etims.ts
 */

const CONFIG = {
  baseUrl: 'https://etims-api-sbx.kra.go.ke/etims-api/selectInitOsdcInfo',
  tin: 'P052454082G',          // Your KRA PIN
  branchId: '00',              // Your branch ID
  dvcSrlNo: 'P052454082G'      // Using TIN as serial number
};

async function initializeDevice() {
  console.log('🚀 Initializing eTIMS Device...');
  console.log('Target URL:', CONFIG.baseUrl);
  console.log('Device Serial:', CONFIG.dvcSrlNo);
  console.log('TIN:', CONFIG.tin);
  console.log('Branch ID:', CONFIG.branchId);
  console.log('');

  try {
    const response = await fetch(CONFIG.baseUrl, {
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
        dvcSrlNo: CONFIG.dvcSrlNo
      })
    });

    const data = await response.json();
    
    console.log('Response Status:', response.status);
    console.log('');
    
    if (response.ok && data.resultCd === '000') {
      console.log('✅ SUCCESS! Device initialized successfully!');
      console.log('');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('⬇️  SAVE THESE CREDENTIALS IN YOUR .env.local  ⬇️');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      console.log('Copy and paste these lines into your .env.local file:');
      console.log('');
      console.log(`ETIMS_API_KEY=${data.data?.scuId || CONFIG.dvcSrlNo}`);
      console.log(`ETIMS_API_SECRET=${data.data?.cmcKey}`);
      console.log(`ETIMS_DEVICE_SERIAL=${CONFIG.dvcSrlNo}`);
      console.log(`ETIMS_COMPANY_PIN=${CONFIG.tin}`);
      console.log(`ETIMS_BRANCH_ID=${CONFIG.branchId}`);
      console.log('');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      console.log('Full Response Data:');
      console.log(JSON.stringify(data, null, 2));
      console.log('');
      console.log('✅ Next Steps:');
      console.log('1. Copy the credentials above to .env.local');
      console.log('2. Restart your dev server: npm run dev');
      console.log('3. Go to Sales → eTIMS Setup and register products');
      console.log('4. Start generating invoices!');
    } else {
      console.error('❌ Initialization Failed!');
      console.error('Error Code:', data.resultCd);
      console.error('Error Message:', data.resultMsg);
      console.log('');
      console.log('Full Response:');
      console.log(JSON.stringify(data, null, 2));
      console.log('');
      console.log('💡 Troubleshooting:');
      console.log('- Check if your TIN is correct');
      console.log('- Verify your device serial number from KRA email');
      console.log('- Make sure your Service Request was approved');
      console.log('- Contact KRA support if the issue persists');
    }

  } catch (error: any) {
    console.error('❌ Network Error:', error.message);
    console.log('');
    console.log('💡 Possible Issues:');
    console.log('- No internet connection');
    console.log('- KRA sandbox is down');
    console.log('- Firewall blocking the request');
  }
}

// Run the initialization
initializeDevice();
