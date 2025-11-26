# eTIMS Integration - Quick Start Guide

## 🚀 Get Started in 5 Minutes

This guide will help you set up and test the eTIMS integration quickly.

---

## Step 1: Add Your KRA Credentials

Open `.env.local` and replace the placeholder values:

```env
# Required: Replace these with your actual KRA credentials
ETIMS_API_KEY=your_actual_api_key_from_kra
ETIMS_API_SECRET=your_actual_api_secret_from_kra

# Required: Your company's KRA PIN
ETIMS_COMPANY_PIN=A000000000A  # Replace with your actual PIN

# Optional: Update company name
ETIMS_COMPANY_NAME=Luna Industries Ltd

# For testing, keep this as true
ETIMS_USE_SANDBOX=true
```

**Don't have credentials yet?**
1. Go to https://etims.kra.go.ke
2. Log in with your KRA iTax credentials
3. Submit a Service Request for "OSCU Integration"
4. Wait 3-5 business days for approval
5. You'll receive credentials via email

---

## Step 2: Install Dependencies

```bash
npm install crypto-js
npm install --save-dev @types/crypto-js
```

---

## Step 3: Register Your Products (One-Time Setup)

### Option A: Add to Existing Admin Page

If you have an admin page, add this component:

```tsx
// src/app/(app)/admin/page.tsx
import { EtimsProductRegistration } from '@/components/admin/EtimsProductRegistration';

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <EtimsProductRegistration />
      {/* Your other admin components */}
    </div>
  );
}
```

### Option B: Create a Dedicated Page

```tsx
// src/app/(app)/etims/setup/page.tsx
import { EtimsProductRegistration } from '@/components/admin/EtimsProductRegistration';

export default function EtimsSetupPage() {
  return (
    <div className="container py-6">
      <h1 className="text-3xl font-bold mb-6">eTIMS Setup</h1>
      <EtimsProductRegistration />
    </div>
  );
}
```

Then:
1. Navigate to the admin/setup page
2. Click "Register All Products"
3. Wait for confirmation

---

## Step 4: Test It!

1. **Go to Sales Ledger**
   ```
   http://localhost:9002/sales/ledger
   ```

2. **Log a Test Sale**
   - Date: Today
   - Sales Agent: Select any agent
   - Products Sold: 5
   - Amount Sold: 1000

3. **Generate eTIMS Invoice**
   - Find your sale in the table
   - Click "Generate eTIMS Invoice"
   - Wait for success message

4. **View the Invoice**
   - Status changes to "Submitted" (green badge)
   - Click "View Invoice"
   - You'll see the official tax invoice with:
     - KRA Invoice Number
     - QR Code
     - Tax breakdown
   - Click "Print Invoice" to print

---

## Step 5: Verify in KRA Portal

1. Log in to https://etims.kra.go.ke
2. Go to "Invoice Management" → "Submitted Invoices"
3. Find your invoice by number or date
4. Confirm it appears correctly

---

## 🎉 You're Done!

The integration is now fully functional. Every sale logged can now generate an official KRA tax invoice.

---

## What Happens Next?

### For Each Sale:

```
1. Staff logs sale → Status: "Pending"
2. Click "Generate eTIMS Invoice"
3. ERP submits to KRA API
4. Receives official invoice number
5. Status: "Submitted" ✓
6. Can print/view official invoice
```

### Data Saved with Each Sale:

- ✅ eTIMS Invoice Number
- ✅ QR Code for verification
- ✅ SCU Receipt Number
- ✅ Verification URL
- ✅ Submission timestamp

---

## Common First-Time Issues

### "Configuration error: ETIMS_API_KEY is not configured"

**Fix:** Restart your dev server after adding credentials:

```bash
# Stop server (Ctrl+C)
# Then restart:
npm run dev
```

### "Products not registered"

**Fix:** Complete Step 3 (register products) before generating invoices.

### "Network error" or "API timeout"

**Fix:** 
- Check internet connection
- Verify `ETIMS_USE_SANDBOX=true`
- Check KRA sandbox status: https://etims.kra.go.ke/status

---

## Going to Production

When ready to go live:

1. **Update Environment Variables:**
   ```env
   ETIMS_USE_SANDBOX=false
   # Use production credentials
   ETIMS_API_KEY=your_production_key
   ETIMS_API_SECRET=your_production_secret
   ```

2. **Re-register Products:**
   - Products registered in sandbox won't transfer
   - Run product registration again in production

3. **Test One Invoice:**
   - Create a real sale
   - Generate invoice
   - Verify in production KRA portal

4. **Train Your Team:**
   - Show them the workflow
   - Emphasize: Always generate eTIMS invoice for each sale

---

## Need Help?

- **Integration Issues:** Check `docs/ETIMS-INTEGRATION.md` for detailed guide
- **KRA Portal:** Visit https://etims.kra.go.ke/support
- **API Errors:** Check browser console (F12) for detailed messages

---

## Quick Reference

| Action | Location |
|--------|----------|
| Log Sales | `/sales/ledger` |
| Generate Invoice | Click button on each sale row |
| View Invoice | Click "View Invoice" after generation |
| Register Products | Admin panel (one-time) |
| Check Status | See "eTIMS Status" column |

---

**Status Badges:**

- 🟡 **Pending** = Not yet submitted to KRA
- 🟢 **Submitted** = Successfully submitted, invoice available
- 🔴 **Failed** = Submission error, check error message

---

That's it! You're now compliant with KRA tax regulations. 🎊
