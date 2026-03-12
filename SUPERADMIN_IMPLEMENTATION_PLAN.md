# 🚀 SUPERADMIN IMPLEMENTATION PLAN

## 📋 Overview
Create a `superadmin` role that inherits all admin features + exclusive administrative capabilities. Superadmins will have full access to admin dashboard with additional system-level controls.

---

## 🎯 Strategic Approach

### Option A: **RECOMMENDED - Role Extension**
- ✅ Keep existing admin interface
- ✅ Add conditional superadmin-only features within admin routes
- ✅ Simplest to implement and maintain
- ✅ Dashboard expansion without duplication
- ✅ Clear permission hierarchy: `superadmin` > `admin`

### Option B: Separate Dashboard
- ❌ Creates duplicate code and maintenance burden
- ❌ Different interface for same admin functions
- ❌ More complex routing and state management

**→ We'll use Option A**

---

## 🔧 Implementation Steps

### STEP 1: Database Changes (Supabase)
Update the `users` table to add superadmin role:

```sql
-- Add superadmin role to ENUM (if using constraint)
-- Supported roles: admin, sales, staff_commission, staff_non_commission, superadmin

-- Insert superadmin user
INSERT INTO public.users (
  email,
  full_name,
  role,
  password_hash,
  is_active,
  store_location,
  created_at
) VALUES (
  'superadmin@abifresh.com',
  'Super Administrator',
  'superadmin',
  -- Use bcrypt hashed password (same as admin)
  '$2b$10$...',  -- Hash of 'SuperAdmin@123456'
  true,
  'Jalingo',
  NOW()
);
```

---

### STEP 2: Backend - Update Role Middleware

**File:** `backend/src/middleware/auth.ts`

Add superadmin to the role normalization map:

```typescript
const roleMap: { [key: string]: string } = {
  'sales': 'sales',
  'sales_staff': 'sales',
  'admin': 'admin',
  'superadmin': 'superadmin',  // ← NEW
  'staff_commission': 'commission_staff',
  'commission_staff': 'commission_staff',
  'staff_non_commission': 'non_commission_staff',
  'non_commission_staff': 'non_commission_staff',
};
```

---

### STEP 3: Backend - Create Superadmin Service

**New File:** `backend/src/services/superadmin.service.ts`

```typescript
import { supabaseAdmin } from '../config/supabase';

export class SuperAdminService {
  
  // View all system users with detailed info
  async getAllUsers() {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  // View system audit logs
  async getAuditLogs(limit = 100) {
    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data;
  }

  // Deactivate admin users
  async deactivateAdmin(adminId: string) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ is_active: false, deactivated_at: new Date() })
      .eq('id', adminId)
      .select();
    
    if (error) throw error;
    return data;
  }

  // Reactivate admin users
  async reactivateAdmin(adminId: string) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ is_active: true, deactivated_at: null })
      .eq('id', adminId)
      .select();
    
    if (error) throw error;
    return data;
  }

  // Get system health metrics
  async getSystemHealth() {
    // Get stats from all tables
    const [users, items, sales, payments] = await Promise.all([
      supabaseAdmin.from('users').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('items').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('sales').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('staff_payments').select('id', { count: 'exact', head: true }),
    ]);

    return {
      totalUsers: users.count,
      totalItems: items.count,
      totalSales: sales.count,
      totalPayments: payments.count,
      timestamp: new Date(),
    };
  }

  // Reset user password (admin capability)
  async resetUserPassword(userId: string, newPassword: string) {
    // Implement password reset logic
    // Should hash password and update in Supabase
  }

  // View all admin actions (audit trail)
  async getAdminActionLog(adminId?: string, limit = 200) {
    let query = supabaseAdmin
      .from('admin_action_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (adminId) {
      query = query.eq('admin_id', adminId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
}

export const superAdminService = new SuperAdminService();
```

---

### STEP 4: Backend - Add Superadmin Routes

**Update File:** `backend/src/routes/admin.routes.ts`

Add new superadmin-only endpoints:

```typescript
// Superadmin-only endpoints (in admin.routes.ts)

/**
 * Get all users (Superadmin only)
 */
router.get('/superadmin/users', authMiddleware, roleMiddleware('superadmin'), async (req: AuthRequest, res: Response) => {
  try {
    const users = await superAdminService.getAllUsers();
    res.json(users);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * View system audit logs (Superadmin only)
 */
router.get('/superadmin/audit-logs', authMiddleware, roleMiddleware('superadmin'), async (req: AuthRequest, res: Response) => {
  try {
    const logs = await superAdminService.getAuditLogs();
    res.json(logs);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Deactivate admin user (Superadmin only)
 */
router.post('/superadmin/deactivate-admin', authMiddleware, roleMiddleware('superadmin'), async (req: AuthRequest, res: Response) => {
  try {
    const { adminId } = req.body;
    const result = await superAdminService.deactivateAdmin(adminId);
    logSecurity('admin_deactivated', { superadminId: req.user?.id, targetAdminId: adminId });
    res.json({ message: 'Admin deactivated', data: result });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get system health (Superadmin only)
 */
router.get('/superadmin/system-health', authMiddleware, roleMiddleware('superadmin'), async (req: AuthRequest, res: Response) => {
  try {
    const health = await superAdminService.getSystemHealth();
    res.json(health);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});
```

---

### STEP 5: Frontend - Update Role Routing

**File:** `frontend/app/login/page.tsx`

Add superadmin redirect:

```typescript
// In the login success handler, update the redirect logic:
if (user.role === 'superadmin') {
  router.push('/admin/dashboard'); // Same dashboard as admin
} else if (user.role === 'admin') {
  router.push('/admin/dashboard');
} else if (user.role === 'sales') {
  router.push('/sales/dashboard');
} else if (user.role === 'staff_commission' || user.role === 'staff_non_commission') {
  router.push('/staff/dashboard');
}
```

---

### STEP 6: Frontend - Conditional UI for Superadmin

**File:** `frontend/app/admin/dashboard/page.tsx`

Add a superadmin-only section:

```typescript
'use client';

import { useAuth } from '@/hooks/useAuth';
import SuperAdminSection from '@/components/admin/SuperAdminSection'; // NEW

export default function AdminDashboard() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'superadmin';

  return (
    <div className="space-y-6">
      {/* Existing admin dashboard content */}
      <AdminDashboardContent />

      {/* Superadmin-only features */}
      {isSuperAdmin && (
        <div className="border-t pt-8 mt-8">
          <SuperAdminSection />
        </div>
      )}
    </div>
  );
}
```

**New Component:** `frontend/components/admin/SuperAdminSection.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/axios-client';

export default function SuperAdminSection() {
  const { user, token } = useAuth();
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, logsRes, healthRes] = await Promise.all([
          api.get('/admin/superadmin/users'),
          api.get('/admin/superadmin/audit-logs'),
          api.get('/admin/superadmin/system-health'),
        ]);

        setUsers(usersRes.data);
        setAuditLogs(logsRes.data);
        setSystemHealth(healthRes.data);
      } catch (error) {
        console.error('Failed to fetch superadmin data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.role === 'superadmin') {
      fetchData();
    }
  }, [user]);

  if (!loading && user?.role === 'superadmin') {
    return (
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-6">🛡️ Superadmin Controls</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* System Health Cards */}
          <div className="bg-black bg-opacity-30 rounded p-4">
            <p className="text-sm opacity-80">Total Users</p>
            <p className="text-3xl font-bold">{systemHealth?.totalUsers}</p>
          </div>
          <div className="bg-black bg-opacity-30 rounded p-4">
            <p className="text-sm opacity-80">Active Items</p>
            <p className="text-3xl font-bold">{systemHealth?.totalItems}</p>
          </div>
          <div className="bg-black bg-opacity-30 rounded p-4">
            <p className="text-sm opacity-80">Total Sales</p>
            <p className="text-3xl font-bold">{systemHealth?.totalSales}</p>
          </div>
        </div>

        {/* Users Management Table */}
        <div className="bg-white text-black rounded p-4">
          <h3 className="font-bold mb-4">All Users</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">Role</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b hover:bg-gray-100">
                    <td className="p-2">{u.email}</td>
                    <td className="p-2"><span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">{u.role}</span></td>
                    <td className="p-2">{u.is_active ? '✅ Active' : '❌ Deactivated'}</td>
                    <td className="p-2">
                      {u.role === 'admin' && (
                        <button className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs">
                          Deactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Logs */}
        <div className="bg-white text-black rounded p-4 mt-6">
          <h3 className="font-bold mb-4">Recent Admin Actions</h3>
          <div className="space-y-2 text-sm">
            {auditLogs.slice(0, 10).map((log, idx) => (
              <div key={idx} className="p-2 bg-gray-100 rounded">
                <p className="font-semibold">{log.action}</p>
                <p className="text-gray-600">{new Date(log.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
```

---

### STEP 7: Update Auth Service for Demo Users

**File:** `backend/src/services/auth.service.ts` (or equivalent)

Add superadmin demo user:

```typescript
const DEMO_USERS = {
  'superadmin@abifresh.com': {
    password: 'SuperAdmin@123456',
    role: 'superadmin',
    full_name: 'Super Administrator',
    id: 'demo-superadmin-id',
  },
  // ... existing users
};
```

---

## 📊 Superadmin Exclusive Features

| Feature | Admin | Superadmin |
|---------|-------|-----------|
| View Dashboard | ✅ | ✅ |
| Manage Staff | ✅ | ✅ |
| Approve Payments | ✅ | ✅ |
| Manage Inventory | ✅ | ✅ |
| View Reports | ✅ | ✅ |
| View All Users | ❌ | ✅ |
| Deactivate Admins | ❌ | ✅ |
| View Audit Logs | ❌ | ✅ |
| System Health Check | ❌ | ✅ |
| Reset User Password | ❌ | ✅ (optional) |

---

## 🔐 Security Considerations

1. **Superadmin Creation**: Only create via direct database insert, not through UI
2. **Role Separation**: Ensure `roleMiddleware` checks are strict
3. **Audit Logging**: Log all superadmin actions
4. **Token Expiry**: Superadmin tokens should have same expiry as admin
5. **Password Policy**: Enforce strong passwords for superadmin accounts

---

## ✅ Testing Checklist

- [ ] Create superadmin user in database
- [ ] Superadmin can login
- [ ] Superadmin redirects to admin dashboard
- [ ] Superadmin sees all admin features
- [ ] Superadmin sees superadmin-only section
- [ ] Superadmin can view all users
- [ ] Superadmin can view audit logs
- [ ] Superadmin can deactivate admins
- [ ] Regular admin CANNOT access superadmin endpoints
- [ ] API returns 403 for non-superadmin accessing `/superadmin/*` routes

---

## 🚀 Implementation Priority

1. **Phase 1 (CORE)**: Database + Backend auth + routes
2. **Phase 2 (UI)**: Frontend dashboard + conditional rendering
3. **Phase 3 (OPTIONAL)**: Full admin management UI + audit dashboard

---

## 💡 Future Enhancements

- Activity dashboard showing all admin actions
- Bulk operations (deactivate multiple users, etc.)
- Role assignment management (create/update admin roles)
- System configuration panel
- Backup/Restore functionality
- Advanced reporting and analytics
