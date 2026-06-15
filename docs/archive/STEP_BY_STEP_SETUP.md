# 📖 SETUP GUIDE - STEP BY STEP

**Goal:** Fix all issues and get system running  
**Time:** 15 minutes  
**Difficulty:** Easy

---

## 📋 What You Need

### File 1: Database Setup
**File Name:** `COMPLETE_SETUP.sql`  
**Location:** `C:\Users\LuckyGold\Desktop\AKV\COMPLETE_SETUP.sql`  
**Size:** ~5 KB  
**Purpose:** Complete database schema, tables, and demo data

### File 2: Frontend (Already Updated)
**File Name:** `frontend/app/sales/dashboard/page.tsx`  
**Location:** Already updated with all fixes  
**Build Status:** ✅ Compiled successfully

### File 3: Backend (Already Updated)
**File Name:** `backend/src/routes/sales.routes.ts`  
**Location:** Already updated with `/create-sale` endpoint

---

## 🚀 Step-by-Step Setup

### Step 1: Setup Database (5 minutes)

#### 1a. Open Supabase Console
- Go to https://supabase.com
- Sign in to your project
- Click "SQL Editor" in left sidebar

#### 1b. Create New Query
- Click "New Query" button (top-right)
- You'll see blank SQL editor

#### 1c. Copy Database Setup Code
**Open file:** `COMPLETE_SETUP.sql`
- Select all content (Ctrl+A)
- Copy (Ctrl+C)

#### 1d. Paste in Supabase
- Click in SQL editor
- Paste (Ctrl+V)
- You should see all the SQL code

#### 1e. Run Script
- Click "RUN" button (bottom-right)
- Wait for success message
- ✅ Database ready!

**What was created:**
- ✅ users table (staff)
- ✅ items table (products)
- ✅ sales table (transactions)
- ✅ sales_items table (receipt details)
- ✅ posted_items table (staff assignments)
- ✅ settings table (config)
- ✅ Indexes (for speed)
- ✅ RLS policies (security)
- ✅ Demo data (15 items, 4 users)

---

### Step 2: Frontend Setup (2 minutes)

#### 2a. Build Already Complete
✅ Frontend compiled successfully  
✅ All 22 pages built  
✅ 0 errors  

#### 2b. Start Dev Server
Open terminal and run:
```bash
cd C:\Users\LuckyGold\Desktop\AKV\frontend
npm run dev
```

You should see:
```
✓ Ready in X.Xs
Local: http://localhost:3001
```

#### 2c. Access Dashboard
Open browser:
```
http://localhost:3001/sales/dashboard
```

✅ Dashboard loaded!

---

### Step 3: Test All Features (5 minutes)

#### Test 3a: Mobile Grid
1. Open browser DevTools (F12)
2. Click mobile icon (or Ctrl+Shift+M)
3. Items should display in **2 columns** ✅

#### Test 3b: Toast Notifications
1. Click "Add to Cart" on any item
2. See green toast: "Item name added to cart" ✅
3. Click "×" on item in cart
4. See toast: "Item name removed from cart" ✅

#### Test 3c: Quantity Changes
1. Add item to cart
2. Click "+" button
3. See toast: "Item name quantity increased" ✅
4. Change quantity in text box
5. See cart total update ✅

#### Test 3d: Complete Sale
1. Add items to cart (2-3 items)
2. Click "Complete Sale" button
3. See success toast: "Sale completed successfully! Receipt generated." ✅
4. Receipt modal appears ✅
5. Shows all items and total ✅
6. Receipt saved in history ✅

#### Test 3e: Quantity Reduction
1. Before sale: Check item quantity
2. After sale: Go to "Available Items" tab
3. Item quantity should be **reduced** ✅
4. Check Admin Inventory → quantity should decrease ✅

---

## 📱 Mobile Grid Fix (Visual)

### Before Fix
```
Mobile (320px):
┌──────────────────────────┐
│ Item 1                   │
│ [Image] [Name]           │
│ [Price] [Add to Cart]    │
└──────────────────────────┘
│ Item 2                   │
│ [Image] [Name]           │
│ [Price] [Add to Cart]    │
└──────────────────────────┘  ← List style
```

### After Fix
```
Mobile (320px):
┌──────────────┬──────────────┐
│ Item 1       │ Item 2       │
│ [Image]      │ [Image]      │
│ [Name]       │ [Name]       │
│ [Price]      │ [Price]      │
│ [Add]        │ [Add]        │
└──────────────┴──────────────┘  ← Grid style (2 columns)
```

---

## 🔔 Toast Notifications (Visual)

### Toast Display
```
┌─────────────────────────────────────────────────┐
│ ✅ Item name added to cart                      │  ← Green background
│    (appears top-right)                          │     Auto-closes in 3 seconds
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ ❌ Please select a staff member and add items   │  ← Red background
│    (appears top-right)                          │     Auto-closes in 3 seconds
└─────────────────────────────────────────────────┘
```

---

## 💳 Receipt Generation (Visual)

### Before Sale
```
Cart:
├─ Item 1: Qty 2, ₦1,000 each
├─ Item 2: Qty 1, ₦500 each
├─ Payment: Cash
├─ Outside Jalingo: No
└─ Total: ₦2,500
   [Complete Sale] ← Click this
```

### After Sale
```
✅ Success Toast appears

Receipt Modal:
├─ Receipt #REC-1234567890
├─ Date: 26-01-2026 15:30
├─ Staff: John Doe
├─
├─ Items:
│  ├─ Item 1 × 2 = ₦2,000
│  └─ Item 2 × 1 = ₦500
├─
├─ Total: ₦2,500
├─ Payment: Cash
├─ [🖨️ Print] [⬇️ Download]
└─
   ✅ Receipt added to history
```

---

## 📊 Quantity Reduction (Visual)

### Database Changes
```
Before Sale:
┌────────────┬──────────────────────┐
│ Item Name  │ Active Store Qty      │
├────────────┼──────────────────────┤
│ Milk (1L)  │ 50                    │
│ Bread      │ 100                   │
└────────────┴──────────────────────┘

Sale: Milk ×2, Bread ×1

After Sale:
┌────────────┬──────────────────────┐
│ Item Name  │ Active Store Qty      │
├────────────┼──────────────────────┤
│ Milk (1L)  │ 48  ✅ (reduced by 2)  │
│ Bread      │ 99  ✅ (reduced by 1)  │
└────────────┴──────────────────────┘
```

---

## 🗂️ File Structure

### Key Files Updated
```
C:\Users\LuckyGold\Desktop\AKV\
├── COMPLETE_SETUP.sql ← Use this in Supabase
├── frontend/
│   └── app/sales/dashboard/page.tsx ← Updated with fixes
├── backend/
│   └── src/routes/sales.routes.ts ← Updated with new endpoint
├── QUICK_START_FIXES.md ← This file
├── FIXES_APPLIED_COMPREHENSIVE.md ← Detailed explanation
└── ... other files
```

---

## ✅ Verification Checklist

### After Database Setup
- [ ] Supabase SQL script ran without errors
- [ ] No error messages in console
- [ ] "Success" message shown

### After Frontend Start
- [ ] Dev server started (Ready in X.Xs)
- [ ] http://localhost:3001 accessible
- [ ] Dashboard loaded

### After Testing
- [ ] Mobile grid shows 2 columns ✅
- [ ] Toast notifications appear ✅
- [ ] Receipt generates after sale ✅
- [ ] Quantity decreases in inventory ✅
- [ ] Print receipt works ✅
- [ ] Download receipt works ✅

---

## 🆘 Troubleshooting

### Issue: "SQL error" in Supabase
**Solution:** 
- Make sure you copied ENTIRE file content
- Check for any missing lines
- Try again with fresh copy

### Issue: Frontend won't start
**Solution:**
```bash
# Kill all node processes
Get-Process node | Stop-Process -Force

# Clear npm cache
npm cache clean --force

# Try again
npm run dev
```

### Issue: Toast not showing
**Solution:**
- Make sure build succeeded
- Hard refresh browser (Ctrl+Shift+R)
- Check DevTools console for errors

### Issue: Quantity not reducing
**Solution:**
- Check if `/create-sale` endpoint exists
- Verify Supabase connection in backend
- Check API call in DevTools Network tab

---

## 📞 Quick References

### Database Connection
```
Supabase URL: (from your project settings)
Supabase Key: (from your project settings)
Configured in: backend/.env
```

### Frontend Ports
```
Primary: http://localhost:3001
Fallback: http://localhost:3000
Dashboard: http://localhost:3001/sales/dashboard
```

### Backend Ports
```
API: http://localhost:5000
Endpoints: /api/sales/*
```

---

## 🎯 Summary

### What Was Fixed
1. ✅ Mobile grid now displays 2 columns
2. ✅ Toast notifications on cart operations
3. ✅ Receipt generation working
4. ✅ Quantity reduction from active store

### What You Do
1. Copy `COMPLETE_SETUP.sql` to Supabase
2. Run the SQL script
3. Test the features
4. Done! 🎉

### Time Required
- Database setup: 5 minutes
- Frontend test: 5 minutes
- Feature testing: 5 minutes
- **Total: 15 minutes**

---

## ✨ You're All Set!

Everything is ready. Just run the SQL setup and you're done.

**Need help?** Check:
- `FIXES_APPLIED_COMPREHENSIVE.md` - Technical details
- `VISUAL_COMPLETION_MATRIX.md` - Visual diagrams
- Comments in code files

**Ready to go!** 🚀
