# 🎯 eTIMS Integration - Next Steps Checklist

## Immediate Actions (Before Testing)

### 1. Install Required Dependencies
```bash
npm install crypto-js
npm install --save-dev @types/crypto-js
```

### 2. Configure Environment Variables

Open `.env.local` and add your KRA credentials:

```env
# ============================================
# KRA eTIMS CONFIGURATION
# ============================================
ETIMS_USE_SANDBOX=true

# Replace with your actual credentials from KRA
ETIMS_API_KEY=your_api_key_here
ETIMS_API_SECRET=your_api_secret_here

# Replace with your company's KRA PIN
ETIMS_COMPANY_PIN=A000000000A

# Update company details
ETIMS_COMPANY_NAME=Luna Industries Ltd
ETIMS_BRANCH_ID=00
ETIMS_DEVICE_SERIAL=LUNA-ERP-001

# Make these public (add NEXT_PUBLIC_ prefix)
NEXT_PUBLIC_ETIMS_COMPANY_NAME=Luna Industries Ltd
NEXT_PUBLIC_ETIMS_COMPANY_PIN=A000000000A
```

**Note:** If you don't have KRA credentials yet, you can still test the integration with placeholder values in sandbox mode.

### 3. Restart Development Server

After adding environment variables:
```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
```

---

## Setup Steps (One-Time)

### 4. Add Product Registration to Admin Page

**Option A:** Add to existing admin page

Edit your admin page (e.g., `src/app/(app)/admin/page.tsx`):

```tsx
import { EtimsProductRegistration } from '@/components/admin/EtimsProductRegistration';

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Admin Panel</h1>
      
      {/* Add eTIMS Product Registration */}
      <EtimsProductRegistration />
      
      {/* Your other admin components */}
    </div>
  );
}
```

**Option B:** Create a dedicated eTIMS setup page

Create `src/app/(app)/etims/setup/page.tsx`:

```tsx
import { EtimsProductRegistration } from '@/components/admin/EtimsProductRegistration';

export default function EtimsSetupPage() {
  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">eTIMS Setup</h1>
        <p className="text-muted-foreground">
          Configure and test your KRA eTIMS integration
        </p>
      </div>
      <EtimsProductRegistration />
    </div>
  );
}
```

### 5. Register Products with eTIMS

1. Navigate to your admin page
2. Find the "eTIMS Product Registration" card
3. Click "Register All Products"
4. Wait for confirmation

---

## Testing Steps

### 6. Test Invoice Generation

1. **Navigate to Sales Ledger**
   ```
   http://localhost:9002/sales/ledger
   ```

2. **Create a Test Sale**
   - Date: Today
   - Sales Agent: Any agent
   - Products Sold: 5
   - Amount Sold: 1000
   - Click "Log Sale"

3. **Generate eTIMS Invoice**
   - Find your sale in the table (should have "Pending" badge)
   - Click "Generate eTIMS Invoice" button
   - Wait for success notification

4. **Verify Invoice**
   - Status should change to "Submitted" with green badge
   - Click "View Invoice" button
   - Check that invoice displays correctly
   - Test "Print Invoice" button

5. **Verify in KRA Portal** (if you have credentials)
   - Log in to https://etims.kra.go.ke
   - Go to Invoice Management
   - Find your invoice by number
   - Confirm it appears correctly

---

## Production Deployment

### 7. Get Production Credentials

- [ ] Contact KRA to get production API credentials
- [ ] Ensure OSCU integration is approved for production
- [ ] Document production credentials securely

### 8. Update Environment for Production

```env
# Switch to production
ETIMS_USE_SANDBOX=false

# Use production credentials
ETIMS_API_KEY=your_production_api_key
ETIMS_API_SECRET=your_production_api_secret

# Verify company details are correct
ETIMS_COMPANY_PIN=A000000000A  # Your actual PIN
ETIMS_COMPANY_NAME=Luna Industries Ltd
```

### 9. Re-register Products in Production

- [ ] Products registered in sandbox don't transfer
- [ ] Navigate to admin panel
- [ ] Click "Register All Products" again
- [ ] Verify all products are registered successfully

### 10. Production Testing

- [ ] Create one test sale
- [ ] Generate eTIMS invoice
- [ ] Verify invoice in production KRA portal
- [ ] Test print functionality
- [ ] Delete test data if necessary

---

## Training & Go-Live

### 11. Train Your Team

Share these materials:
- [ ] `docs/ETIMS-QUICK-START.md` - For all users
- [ ] Demo the workflow live
- [ ] Create a cheat sheet with screenshots
- [ ] Schedule Q&A session

**Key Points to Emphasize:**
- Every sale must have an eTIMS invoice
- Generate invoice immediately after logging sale
- Check for "Submitted" status before closing
- Print invoice for customer records

### 12. Establish Monitoring Process

- [ ] Daily check for failed submissions
- [ ] Weekly reconciliation with KRA portal
- [ ] Monthly compliance review
- [ ] Document procedure for handling failures

---

## Optional Enhancements

### 13. Add QR Code Library (Recommended)

For real QR codes instead of placeholders:

```bash
npm install qrcode.react
npm install --save-dev @types/qrcode.react
```

Then update `EtimsInvoice.tsx` to use actual QR codes:

```tsx
import QRCode from 'qrcode.react';

// Replace the placeholder div with:
<QRCode value={salesEntry.etimsQrCode} size={128} />
```

### 14. Add Navigation Menu Item

Add eTIMS to your navigation:

```tsx
{
  title: "eTIMS Setup",
  href: "/etims/setup",
  icon: FileCheck,
  badge: "New"
}
```

---

## Troubleshooting Checklist

If something doesn't work:

### Environment Issues
- [ ] Are all ETIMS_ variables in .env.local?
- [ ] Did you restart the dev server after adding them?
- [ ] Are NEXT_PUBLIC_ variables added for client-side access?

### API Issues
- [ ] Is ETIMS_USE_SANDBOX=true for testing?
- [ ] Are credentials correct?
- [ ] Check browser console for errors
- [ ] Check server terminal for errors

### Product Registration Issues
- [ ] Do products have valid SKUs?
- [ ] Are product names not empty?
- [ ] Try registering one product at a time

### Invoice Generation Issues
- [ ] Are products registered?
- [ ] Is the sales entry saved correctly?
- [ ] Check the API response in browser Network tab
- [ ] Look for etimsError field in Firestore

---

## Quick Command Reference

```bash
# Install dependencies
npm install crypto-js

# Development
npm run dev

# Check for TypeScript errors
npm run typecheck

# Build for production
npm run build

# View environment variables
cat .env.local
```

---

## Support Resources

| Issue Type | Resource |
|------------|----------|
| Setup & Configuration | `docs/ETIMS-QUICK-START.md` |
| Technical Details | `docs/ETIMS-INTEGRATION.md` |
| Implementation Info | `docs/ETIMS-IMPLEMENTATION-SUMMARY.md` |
| KRA Portal Help | https://etims.kra.go.ke/support |
| API Documentation | KRA Developer Portal |

---

## Success Indicators

You'll know it's working when:

✅ No errors in browser console  
✅ "Generate eTIMS Invoice" button appears  
✅ Clicking it shows a loading spinner  
✅ Success toast appears with invoice number  
✅ Status badge changes to "Submitted"  
✅ "View Invoice" button appears  
✅ Invoice displays with all details  
✅ Invoice can be printed  
✅ Invoice appears in KRA portal (if using real credentials)

---

## Common First-Time Issues

### "Configuration error"
**Fix:** Add all required variables to `.env.local` and restart server

### "Products not registered"
**Fix:** Complete Step 5 (register products)

### Button doesn't appear
**Fix:** Check that sales entry has `etimsStatus: 'pending'`

### API timeout
**Fix:** Check internet connection and KRA API status

---

## Final Checklist

Before marking this complete:

- [ ] Dependencies installed (`crypto-js`)
- [ ] Environment variables configured
- [ ] Server restarted
- [ ] Product registration component added to admin page
- [ ] Products registered with eTIMS
- [ ] Test sale created
- [ ] eTIMS invoice generated successfully
- [ ] Invoice viewed and printed
- [ ] Team trained on workflow
- [ ] Documentation shared with team

---

**Estimated Time:**
- Configuration: 10 minutes
- Product Registration: 5 minutes  
- Testing: 15 minutes
- Training: 30 minutes
- **Total: ~1 hour**

---

**You're all set!** Follow these steps in order and you'll have a fully functional eTIMS integration. 🚀
