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
    // Test 1: Verify connection
    console.log('📋 Test 1: Verifying connection...');
    let url = `${CONFIG.apiUrl}/selectItemClsList`;
    
    let response = await fetch(url, {
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
    let text = await response.text();
    console.log('Response:', text.substring(0, 200));
    console.log('\n');

    // Test 2: Try saving a test item
    console.log('📦 Test 2: Attempting to register a test product...');
    url = `${CONFIG.apiUrl}/saveItem`;
    
    response = await fetch(url, {
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
        itemCd: 'TEST-001',
        itemClsCd: '50101501',
        itemTyCd: '2',
        itemNm: 'Test Product',
        itemStdNm: 'Test Product',
        orgnNatCd: 'KE',
        pkgUnitCd: 'NT',
        qtyUnitCd: 'U',
        taxTyCd: 'B',
        btchNo: null,
        bcd: null,
        dftPrc: 100.00,
        isrcAplcbYn: 'N',
        useYn: 'Y',
        regrId: 'System',
        regrNm: 'Luna ERP System',
        modrId: 'System',
        modrNm: 'Luna ERP System'
      })
    });

    console.log('Response Status:', response.status);
    text = await response.text();
    console.log('Response:', text);
    
    if (response.ok) {
      const data = JSON.parse(text);
      if (data.resultCd === '000') {
        console.log('✅ Product registration successful!');
      } else {
        console.log('❌ API returned error:', data.resultCd, data.resultMsg);
      }
    } else {
      console.log('❌ HTTP Error:', response.status);
    }

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
  }
}

testConnection();
