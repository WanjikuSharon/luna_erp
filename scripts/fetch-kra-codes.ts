// scripts/fetch-kra-codes.ts
/**
 * Fetch valid codes from KRA eTIMS
 * This will show us the valid values for packaging units, quantity units, etc.
 */

const CONFIG = {
  apiUrl: 'https://etims-api-sbx.kra.go.ke/etims-api',
  tin: process.env.ETIMS_COMPANY_PIN || 'P052454082G',
  bhfId: process.env.ETIMS_BRANCH_ID || '00',
  cmcKey: process.env.ETIMS_API_SECRET || '6751B940C52940F5BF339A6E0D669B075DE80C81DAC645428162',
};

async function fetchCodes() {
  console.log('📋 Fetching valid codes from KRA...\n');

  try {
    // Fetch code list
    const url = `${CONFIG.apiUrl}/selectCodeList`;
    
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
        cdCls: '14', // 14 = Packaging Unit Code
        cdClsNm: ''
      })
    });

    const data = await response.json();
    
    if (data.resultCd === '000') {
      console.log('✅ Packaging Unit Codes:\n');
      data.data.itemClsList?.forEach((code: any) => {
        console.log(`  ${code.cd} - ${code.cdNm}`);
      });
    } else {
      console.log('Error:', data.resultMsg);
    }

    // Also fetch quantity unit codes
    console.log('\n📦 Fetching Quantity Unit Codes...\n');
    
    const response2 = await fetch(url, {
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
        cdCls: '13', // 13 = Quantity Unit Code
        cdClsNm: ''
      })
    });

    const data2 = await response2.json();
    
    if (data2.resultCd === '000') {
      console.log('✅ Quantity Unit Codes:\n');
      data2.data.itemClsList?.forEach((code: any) => {
        console.log(`  ${code.cd} - ${code.cdNm}`);
      });
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

fetchCodes();
