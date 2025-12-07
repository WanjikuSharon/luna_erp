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
        lastReqDt: '20200101000000',
        cdCls: '14' // 14 = Packaging Unit Code
      })
    });

    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2).substring(0, 1000));
    
    if (data.resultCd === '000') {
      console.log('\n✅ Packaging Unit Codes:\n');
      const codes = data.data?.cdList || data.data?.itemClsList || [];
      codes.forEach((code: any) => {
        console.log(`  ${code.cd} - ${code.cdNm || code.name}`);
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
        lastReqDt: '20200101000000',
        cdCls: '13' // 13 = Quantity Unit Code
      })
    });

    const data2 = await response2.json();
    
    if (data2.resultCd === '000') {
      console.log('✅ Quantity Unit Codes:\n');
      const codes2 = data2.data?.cdList || data2.data?.itemClsList || [];
      codes2.forEach((code: any) => {
        console.log(`  ${code.cd} - ${code.cdNm || code.name}`);
      });
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

fetchCodes();
