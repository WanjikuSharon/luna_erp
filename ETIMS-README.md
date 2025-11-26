# 🧾 KRA eTIMS Integration for Luna ERP

## Overview

This ERP now includes **full integration with Kenya Revenue Authority (KRA) eTIMS** (Electronic Tax Invoice Management System). Every sale can automatically generate an official, tax-compliant invoice.

---

## 📚 Documentation

| Document | Purpose | Start Here? |
|----------|---------|-------------|
| **[ETIMS-QUICK-START.md](docs/ETIMS-QUICK-START.md)** | 5-minute setup guide | ✅ **YES - Start here!** |
| **[ETIMS-COMPLETE.md](docs/ETIMS-COMPLETE.md)** | Complete overview | For understanding |
| **[ETIMS-INTEGRATION.md](docs/ETIMS-INTEGRATION.md)** | Technical details | For developers |
| **[ETIMS-NEXT-STEPS.md](docs/ETIMS-NEXT-STEPS.md)** | Action checklist | For implementation |

---

## ⚡ Quick Start (3 Steps)

### 1. Install Dependencies
```bash
npm install crypto-js
```

### 2. Configure Environment
Add to `.env.local`:
```env
ETIMS_USE_SANDBOX=true
ETIMS_API_KEY=your_key_from_kra
ETIMS_API_SECRET=your_secret_from_kra
ETIMS_COMPANY_PIN=A000000000A
NEXT_PUBLIC_ETIMS_COMPANY_NAME=Luna Industries Ltd
NEXT_PUBLIC_ETIMS_COMPANY_PIN=A000000000A
```

Restart:
```bash
npm run dev
```

### 3. Register Products
1. Go to Admin Dashboard: `http://localhost:9002/admin`
2. Find "eTIMS Product Registration" card
3. Click "Register All Products"

**Done!** Now you can generate eTIMS invoices from the Sales Ledger.

---

## 🎯 How It Works

### Before eTIMS:
```
1. Log sale ✓
2. Done
```

### With eTIMS:
```
1. Log sale ✓
2. Click "Generate eTIMS Invoice" ✓
3. Get official KRA invoice with QR code ✓
4. Print for customer ✓
```

Just **one extra click** for full tax compliance!

---

## 📱 User Guide

### To Generate an Invoice:

1. **Go to Sales Ledger**
   ```
   Sales → Daily Sales Ledger
   ```

2. **Log a sale** (as usual)
   - Date, Agent, Products Sold, Amount
   - Click "Log Sale"

3. **Generate eTIMS Invoice** (NEW!)
   - Find sale in table
   - Click "Generate eTIMS Invoice"
   - Wait 2 seconds
   - Status = "Submitted" ✅

4. **Print Invoice** (optional)
   - Click "View Invoice"
   - Click "Print Invoice"
   - Give to customer

---

## 🔧 Technical Stack

- **Backend:** Next.js API Routes
- **Service:** Custom eTIMS service with HMAC-SHA256 auth
- **Database:** Firestore (invoice data stored with sales)
- **UI:** React + shadcn/ui components
- **Print:** Custom CSS print styles

---

## ✨ Features

✅ One-click invoice generation  
✅ Automatic KRA submission  
✅ QR code for verification  
✅ Print-optimized invoices  
✅ Status tracking (Pending/Submitted/Failed)  
✅ Error handling & retry  
✅ Bulk product registration  
✅ Sandbox & production modes  
✅ Complete audit trail  

---

## 🎓 For Your Team

**Sales Staff:**
- Read: `docs/ETIMS-QUICK-START.md`
- Just need to know where the button is!

**Administrators:**
- Read: `docs/ETIMS-INTEGRATION.md`
- Need to configure and monitor

**Developers:**
- Read: `docs/ETIMS-IMPLEMENTATION-SUMMARY.md`
- Full technical architecture

---

## 📞 Support

**Setup Help:** See `docs/ETIMS-QUICK-START.md`  
**Technical Issues:** See `docs/ETIMS-INTEGRATION.md`  
**KRA Portal:** https://etims.kra.go.ke/support  

---

## 🚦 Status

✅ **Fully Implemented**  
⚠️ **Pending Configuration** (add your credentials)  
⏳ **Ready for Testing**  

---

## 🎯 Next Action

👉 **Read:** `docs/ETIMS-QUICK-START.md`  
👉 **Do:** Follow the 3 steps above  
👉 **Test:** Generate your first invoice  

**Time Required:** ~10 minutes

---

**Questions?** All answers are in the docs folder! 📁

---

Made with ❤️ for Luna Industries | November 2025
