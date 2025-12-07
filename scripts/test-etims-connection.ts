// scripts/test-etims-connection.ts
/**
 * Test eTIMS API connection
 * Tests if we can communicate with KRA sandbox
 */

const CONFIG = {
  apiUrl: 'https://etims-api-sbx.kra.go.ke/etims-api',
  tin: process.env.ETIMS_COMPANY_PIN || 'P052454082G',
  bhfId: process.env.ETIMS_BRANCH_ID || '00',
  cmcKey: process.env.ETIMS_API_SECRET || '6751B940C52940F5BF339A6E0D669B075DE80C81DAC645428162',
};

async function testConnection() {
  console.log('🔍 Testing eTIMS API Connection...\n');
  console.log('Config:', {
    apiUrl: CONFIG.apiUrl,
    tin: CONFIG.tin,
    bhfId: CONFIG.bhfId,
    cmcKey: CONFIG.cmcKey.substring(0, 20) + '...',
  });
  console.log('\n');

  try {
    // Test 1: Simple item class list request
    console.log('📋 Test 1: Fetching item classifications...');
    const url = `${CONFIG.apiUrl}/selectItemClsList`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'tin': CONFIG.tin,
        'bhfId': CONFIG.bhfId,
        'cmcKey': CONFIG.cmcKey,
      },
      body: JSON.stringify({
        tin: CONFIG.tin,
        bhfId: CONFIG.bhfId,
        lastReqDt: '20200101000000'
      })
    });

    console.log('Response Status:', response.status);
    const text = await response.text();
    console.log('Response:', text.substring(0, 500));
    
    if (response.ok) {
      const data = JSON.parse(text);
      if (data.resultCd === '000') {
        console.log('✅ Connection successful!');
        console.log('Result:', data.resultMsg);
      } else {
        console.log('❌ API returned error:', data.resultMsg);
      }
    } else {
      console.log('❌ HTTP Error:', response.status);
    }

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
  }
}

testConnection();
