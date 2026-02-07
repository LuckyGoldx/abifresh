# ⚡ Quick Reference Card

## 🎯 In One Minute

**What is this?** A complete PWA sales management system for ABIFRESH & KIDDIES VENTURES  
**Tech Stack:** Next.js + Express.js + Supabase  
**Roles:** Admin, Sales, Staff (Commission & Non-Commission)  
**Deployment:** Frontend on Vercel, Backend on Koyeb, Database on Supabase

---

## 📦 What You Get

✅ Full backend API with 30+ endpoints  
✅ Production-ready frontend with 4+ dashboards  
✅ Complete database schema with 12 tables  
✅ Role-based access control  
✅ Real-time inventory & sales tracking  
✅ Payment approval workflow  
✅ Dark mode & responsive design  
✅ PWA support (installable, offline)  
✅ 150+ pages of documentation

---

## 🚀 Quick Start (5 minutes)

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with Supabase credentials
npm run dev
# Runs on http://localhost:5000
```

### Frontend
```bash
cd frontend
npm install
cp .env.local.example .env.local
# Edit .env.local
npm run dev
# Runs on http://localhost:3000/login
```

### Default Login
```
Email: admin@abifresh.com
Password: SecurePassword123!
```

---

## 📚 Documentation Map

| Need | File | Pages |
|------|------|-------|
| Setup & Install | SETUP_GUIDE.md | 30 |
| Deploy to Production | DEPLOYMENT_GUIDE.md | 25 |
| Database Reference | docs/DATABASE_SCHEMA.md | 20 |
| API Endpoints | docs/API_DOCUMENTATION.md | 40 |
| Project Overview | README.md | 15 |
| What's Included | PROJECT_SUMMARY.md | 20 |
| Nav All Docs | DOCUMENTATION_INDEX.md | 20 |

---

## 🔧 Environment Variables

### Backend (.env)
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
PORT=5000
NODE_ENV=production
JWT_SECRET=<random-string>
CORS_ORIGIN=http://localhost:3000
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_APP_NAME=ABIFRESH & KIDDIES VENTURES
```

---

## 📊 Database Tables (Quick View)

```
users              → User accounts + roles
items              → Product catalog
inventory_main_store  → Master inventory
inventory_active_store → Selling inventory
sales              → Sales transactions
daily_sales_summary → Daily totals (auto-reset)
posted_items       → Items sent to staff
staff_payments     → Payment records
staff_commissions  → Commission config
expenses           → Staff expenses
notifications      → User alerts
activity_logs      → Audit trail
```

---

## 🔐 Roles & Permissions

| Role | Can Do | Can't Do |
|------|--------|----------|
| **admin** | Everything | Nothing restricted |
| **sales** | View items, make sales, post to staff | View staff data |
| **staff_commission** | View posted items, accept, make payments, earn commission | Add items, delete items |
| **staff_non_commission** | View posted items, accept, make payments | Earn commission |

---

## 🌐 API Endpoints (Main)

### Auth
- `POST /api/auth/register` - Create user
- `POST /api/auth/login` - Login

### Sales
- `GET /api/sales/items/available` - List items
- `POST /api/sales/record` - Record sale
- `GET /api/sales/dashboard` - Dashboard data

### Inventory
- `GET /api/inventory/active-store` - Active items
- `POST /api/inventory/items` - Add item
- `POST /api/inventory/move-to-active` - Transfer items

### Admin
- `GET /api/admin/staff` - List staff
- `GET /api/admin/payments/pending` - Pending approvals
- `POST /api/admin/payments/:id/approve` - Approve payment

### Staff
- `GET /api/staff/posted-items` - Posted items
- `POST /api/staff/payments` - Make payment
- `GET /api/staff/dashboard` - Dashboard data

---

## 💾 Database Setup

```sql
-- Get this from SETUP_GUIDE.md
-- Copy entire schema section
-- Paste in Supabase SQL Editor
-- Execute
```

---

## 🚢 Deployment Steps

1. **Supabase**: Create project, set up auth redirects
2. **Backend**: Push to GitHub, deploy on Koyeb
3. **Frontend**: Push to GitHub, deploy on Vercel
4. **Config**: Update environment variables
5. **Test**: Verify all features work

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for step-by-step instructions.

---

## 🔍 Verify Installation

```bash
# Backend health check
curl http://localhost:5000/health

# Frontend available
http://localhost:3000/login

# Can login
Use: admin@abifresh.com / SecurePassword123!
```

---

## 🎨 Features

### Sales Dashboard
- View available items
- Make sales (cash/POS/transfer)
- Post items to staff
- View daily & all-time stats
- Print receipts
- Real-time updates

### Staff Dashboard
- Accept/reject posted items
- Make payments
- Track expenses
- View notifications
- See commissions (if applicable)

### Admin Dashboard
- Manage staff
- Set commissions
- Approve/reject payments
- View inventory
- Generate reports
- View activity logs

---

## 🎯 Common Tasks

### Create New Staff
```bash
POST /api/admin/staff/create
{
  "email": "staff@company.com",
  "password": "SecurePassword123!",
  "full_name": "John Staff",
  "role": "sales",
  "store_location": "Jalingo"
}
```

### Record a Sale
```bash
POST /api/sales/record
{
  "item_id": "uuid",
  "quantity": 5,
  "payment_method": "cash",
  "buyer_type": "customer",
  "store_location": "Jalingo"
}
```

### Add Item
```bash
POST /api/inventory/items
{
  "name": "Product Name",
  "category": "Category",
  "base_price": 5000,
  "commission_amount": 500
}
```

---

## ⚠️ Important Notes

1. **Change default password** in production!
2. **Use HTTPS** in production
3. **Rotate JWT_SECRET** regularly
4. **Backup database** regularly
5. **Monitor logs** for errors
6. **Test thoroughly** before going live
7. **Location-based pricing**: Jalingo = base price, others = base + ₦500

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 5000/3000 in use | Kill process: `lsof -ti:5000 \| xargs kill -9` |
| CORS error | Check `CORS_ORIGIN` in backend .env |
| Login fails | Verify Supabase credentials |
| DB connection error | Check `SUPABASE_URL` and keys |
| PWA not installing | Clear cache, check manifest.json |

---

## 📞 Need Help?

1. **Installation?** → SETUP_GUIDE.md
2. **Deployment?** → DEPLOYMENT_GUIDE.md
3. **Database?** → docs/DATABASE_SCHEMA.md
4. **API?** → docs/API_DOCUMENTATION.md
5. **Overview?** → README.md

---

## ✅ Pre-Deployment Checklist

- [ ] Read SETUP_GUIDE.md
- [ ] Created Supabase project
- [ ] Backend runs locally
- [ ] Frontend runs locally
- [ ] Can login with default account
- [ ] Read DEPLOYMENT_GUIDE.md
- [ ] GitHub repos created
- [ ] Vercel account ready
- [ ] Koyeb account ready
- [ ] All env vars prepared

---

## 🎓 Tech Skills Required

- Basic Node.js/npm knowledge
- Basic React/Next.js knowledge
- Basic SQL/database knowledge
- Git basics
- REST API understanding
- Environment variable setup

---

## 📊 By The Numbers

- **Code Files**: 25+
- **Components**: 10+
- **API Endpoints**: 30+
- **Database Tables**: 12
- **Documentation Pages**: 150+
- **Roles/Permissions**: 4
- **Lines of Code**: 5,000+

---

## 🎉 You're Ready!

Everything is built and documented. Pick a file below and start:

1. **First Time?** → Start with [SETUP_GUIDE.md](./SETUP_GUIDE.md)
2. **Want Overview?** → Read [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)
3. **Need to Deploy?** → Follow [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
4. **Looking for API?** → Check [docs/API_DOCUMENTATION.md](./docs/API_DOCUMENTATION.md)
5. **Need Navigation?** → Use [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)

---

**Version**: 1.0.0  
**Status**: ✅ Production Ready  
**Last Updated**: January 24, 2026

Good luck! 🚀
