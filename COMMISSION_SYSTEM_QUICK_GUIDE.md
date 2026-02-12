# Commission Tracking System - Quick Reference

## 🚀 Quick Start

### Access the System
1. Login as **admin**
2. Click **"Commissions" (💵)** in sidebar
3. View commission overview

---

## 📊 Main Features

### 1. Overview Tab
**What you see:**
- Total commission generated
- Total commission paid
- Pending payments
- Staff count

**Actions:**
- View staff commission details
- Make commission payments
- Export data to CSV

### 2. Payment History Tab
**What you see:**
- All commission payments made
- Payment dates and amounts
- Payment status
- Staff information

### 3. Analytics Tab
**What you see:**
- Top performing staff
- Items with highest commission
- Daily commission trends

**Period options:**
- Last 7 days
- Last 30 days
- Last 90 days
- Last year

---

## 💳 How to Pay Commission

1. Go to **Overview** tab
2. Find the staff member
3. Click **"💳 Pay"** button
4. Review amount (auto-filled with pending)
5. Add notes (optional)
6. Click **"💳 Pay Commission"**
7. Done! ✅

---

## 📊 How to View Staff Details

1. Go to **Overview** tab
2. Find the staff member
3. Click **"📊 Details"** button
4. View:
   - All receipts with commissions
   - Item-by-item breakdown
   - Filter by date range

---

## 📥 How to Export Data

1. Click **"📥 Export CSV"** button (top right)
2. CSV file downloads automatically
3. Contains all staff commission data

---

## 🔍 Understanding the Data

### Commission Calculation
```
Commission = Commission per Item × Quantity Sold
```

**Example:**
- Item: Rice (50kg)
- Commission: ₦100 per bag
- Quantity Sold: 20 bags
- **Total Commission: ₦2,000**

### Staff Overview Columns

| Column | Description |
|--------|-------------|
| **Staff** | Name and email |
| **Items Sold** | Total quantity of items |
| **Total Sales** | Total ₦ value of sales |
| **Commission Generated** | Total ₦ earned |
| **Commission Paid** | Total ₦ already paid |
| **Pending** | Amount owed to staff |

---

## 🎯 Key Metrics Explained

### Total Generated
Sum of all commissions earned by all staff

### Total Paid
Sum of all approved/paid commission payments

### Pending Payment
= Total Generated - Total Paid

### Commission Staff Count
Number of staff with role = 'staff_commission'

---

## 📍 API Endpoints

### For Developers

#### Get Overview
```http
GET /api/admin/commissions/overview
Authorization: Bearer {token}
```

#### Get Staff Details
```http
GET /api/admin/commissions/staff/:staffId?startDate=2026-01-01&endDate=2026-02-12
Authorization: Bearer {token}
```

#### Get Payment History
```http
GET /api/admin/commissions/payments
Authorization: Bearer {token}
```

#### Create Payment
```http
POST /api/admin/commissions/pay
Authorization: Bearer {token}
Content-Type: application/json

{
  "staff_id": "uuid-here",
  "amount": 5000,
  "notes": "Commission payment for January"
}
```

#### Get Analytics
```http
GET /api/admin/commissions/analytics?period=30
Authorization: Bearer {token}
```

---

## 🔧 Troubleshooting

### No data showing?
- ✅ Check if commission staff exist (role = 'staff_commission')
- ✅ Verify items have commission values set
- ✅ Ensure receipts have been created
- ✅ Check backend server is running

### Commission calculation wrong?
- ✅ Verify commission value in items table
- ✅ Check receipt_items have correct quantities
- ✅ Ensure foreign keys are correct (item_id matches)

### Can't make payment?
- ✅ Pending commission must be > 0
- ✅ Must be logged in as admin
- ✅ Check network connection

---

## 📱 Navigation Map

```
Admin Sidebar
  └── Commissions 💵
       ├── Overview Tab
       │    ├── Staff table
       │    ├── Details button → /admin/commissions/[staffId]
       │    └── Pay button → Payment modal
       ├── Payment History Tab
       │    └── All payments list
       └── Analytics Tab
            ├── Top Performers
            ├── Top Items
            └── Trends
```

---

## ✅ Daily Use Checklist

### Morning Review:
- [ ] Check total pending commissions
- [ ] Review yesterday's commission generation
- [ ] Check if any payments are due

### Weekly Tasks:
- [ ] Review top performers
- [ ] Analyze commission trends
- [ ] Export data for records
- [ ] Process pending payments

### Monthly Tasks:
- [ ] Generate commission reports
- [ ] Review commission rates on items
- [ ] Analyze sales patterns
- [ ] Pay all staff commissions

---

## 🎯 Quick Actions

### View all commission staff
→ Go to Overview tab

### Check who earned the most
→ Go to Analytics tab → Top Performers

### See best-selling items
→ Go to Analytics tab → Top Items

### Pay a staff member
→ Overview tab → Click "Pay" button

### View receipt details
→ Overview tab → Click "Details" → Receipts tab

### See what items staff sold
→ Overview tab → Click "Details" → Items tab

### Download report
→ Click "Export CSV" button

---

## 💡 Pro Tips

1. **Use date filters** on staff detail page to analyze specific periods
2. **Export regularly** for backup and external analysis
3. **Check analytics weekly** to spot trends early
4. **Review pending payments** daily to ensure timely payments
5. **Monitor top items** to adjust commission rates strategically

---

## 📞 Support

If you encounter issues:
1. Check console for errors (F12)
2. Verify backend server is running
3. Check database connection
4. Review API responses in Network tab
5. Check authentication token is valid

---

## 🎉 Success Indicators

You'll know the system is working when:
- ✅ Commission tab appears in sidebar
- ✅ Overview shows staff data
- ✅ Payment buttons are active
- ✅ Analytics show trends
- ✅ Export downloads CSV file
- ✅ Staff detail pages load
- ✅ Date filters work correctly

---

**Last Updated:** February 12, 2026  
**Version:** 1.0  
**Status:** ✅ Production Ready
