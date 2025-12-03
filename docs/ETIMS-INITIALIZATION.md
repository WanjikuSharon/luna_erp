# eTIMS Device Initialization Guide

## 🎯 What This Does

This script registers your ERP device with KRA eTIMS and gets your API credentials. **You only need to run this ONCE** before using the eTIMS integration.

---

## 📋 Before You Start

### 1. Find Your Device Serial Number

Check the email KRA sent when your Service Request was approved. It contains a **Serial Number**.

**Can't find it?**
- Try the generic sandbox serial: `KRATK04_B6096`
- Or check the "Service Request" tab in the eTIMS portal

### 2. Verify Your Information

Open `scripts/init-etims.ts` and update these values:

```typescript
const CONFIG = {
  url: 'https://etims-api-sbx.kra.go.ke/etims-api/selectInitOsdcInfo',
  tin: 'P052454082G',          // ✏️ Your KRA PIN
  branchId: '00',              // ✏️ Your branch ID (usually '00')
  dvcSrlNo: 'LUNA_19_2025'     // ✏️ Your device serial number
};
```

---

## 🚀 Run the Initialization

### Step 1: Run the Script

```bash
npx ts-node scripts/init-etims.ts
```

**Don't have ts-node?** Install it:
```bash
npm install -D ts-node
```

### Step 2: Check the Output

**Success Response:**
```
✅ SUCCESS! Device initialized successfully!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⬇️  SAVE THESE CREDENTIALS IN YOUR .env.local  ⬇️
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ETIMS_API_KEY=LUNA_19_2025
ETIMS_API_SECRET=ABC123XYZ789...
ETIMS_DEVICE_SERIAL=LUNA_19_2025
ETIMS_COMPANY_PIN=P052454082G
ETIMS_BRANCH_ID=00
```

**Error Response:**
```
❌ Initialization Failed!
Error Code: 001
Error Message: Invalid serial number
```

### Step 3: Update .env.local

Copy the credentials from the output and paste them into `.env.local`:

```env
# Replace these placeholder values with the real ones from the script output
ETIMS_API_KEY=LUNA_19_2025
ETIMS_API_SECRET=the_long_cmc_key_you_got
ETIMS_DEVICE_SERIAL=LUNA_19_2025
ETIMS_COMPANY_PIN=P052454082G
ETIMS_BRANCH_ID=00

# Keep these as-is
ETIMS_USE_SANDBOX=true
ETIMS_SANDBOX_URL=https://etims-api-sbx.kra.go.ke/etims-api
ETIMS_PRODUCTION_URL=https://etims-api.kra.go.ke/etims-api
```

### Step 4: Restart Your Dev Server

```bash
# Stop your server (Ctrl+C)
# Then restart:
npm run dev
```

---

## ✅ Verify It Worked

1. **Check the KRA Portal**
   - Log in to https://etims.kra.go.ke
   - The 500 error should be gone!
   - You should see your device listed

2. **Test in Your ERP**
   - Go to Sales → eTIMS Setup
   - Click "Register All Products"
   - You should see success messages

3. **Generate a Test Invoice**
   - Go to Sales → Daily Sales Ledger
   - Log a test sale
   - Click "Generate eTIMS Invoice"
   - It should work! 🎉

---

## 🔧 Troubleshooting

### Error: "Invalid TIN"
- Double-check your KRA PIN in the script
- Make sure it matches exactly what's on your KRA account

### Error: "Invalid Serial Number"
- Check your KRA approval email for the correct serial
- Try the sandbox serial: `KRATK04_B6096`
- Verify in the KRA portal under "Service Request"

### Error: "Network Error"
- Check your internet connection
- KRA sandbox might be down (check status)
- Firewall might be blocking the request

### "Module not found: ts-node"
Run: `npm install -D ts-node`

### Still Getting 500 Error on Portal
- Wait 5 minutes after initialization
- Clear browser cache and cookies
- Try a different browser
- Contact KRA support

---

## 📝 What Happens Behind the Scenes

1. **Your Script Sends:**
   ```json
   {
     "tin": "P052454082G",
     "bhfId": "00",
     "dvcSrlNo": "LUNA_19_2025"
   }
   ```

2. **KRA Returns:**
   ```json
   {
     "resultCd": "000",
     "resultMsg": "Success",
     "data": {
       "scuId": "LUNA_19_2025",
       "cmcKey": "your-secret-key-here",
       "tin": "P052454082G",
       "bhfId": "00"
     }
   }
   ```

3. **You Save:**
   - `scuId` → `ETIMS_API_KEY`
   - `cmcKey` → `ETIMS_API_SECRET`

---

## 🎓 Why Was This Needed?

**The Problem:**
- Your code expected `ETIMS_API_SECRET` to sign requests
- But you can only get that secret by calling the Initialization API first
- Without it, KRA didn't know your device existed → 500 Error

**The Solution:**
- This script "registers" your device with KRA
- Gets your unique `cmcKey` (the secret)
- Now KRA knows your device and accepts your requests

---

## ⚠️ Important Notes

- **Run this ONCE** per device
- **Sandbox vs Production:** You'll need to initialize separately for production
- **Keep cmcKey Secret:** Never commit it to git
- **Serial Number:** Each device needs a unique serial

---

## 🎉 Next Steps

After successful initialization:

1. ✅ Credentials saved in `.env.local`
2. ✅ Dev server restarted
3. ✅ Go to Sales → eTIMS Setup
4. ✅ Register products
5. ✅ Generate your first invoice!

---

**Questions?** Check the main eTIMS documentation in `docs/ETIMS-QUICK-START.md`
