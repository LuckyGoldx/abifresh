# 🛡️ COMPREHENSIVE SUPERADMIN SYSTEM - TECHNICAL IMPLEMENTATION GUIDE

## 📋 Requirements Summary

- **Role Type**: `superadmin`
- **Accounts Needed**: 2-3 superadmin users
- **Scope**: Full system with user management, audit logs, analytics, system reports, configuration management, and comprehensive logging
- **Approach**: Role extension (share admin dashboard, add superadmin-exclusive sections)

---

## 🏗️ ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────┐
│                    SUPERADMIN LAYER                      │
├─────────────────────────────────────────────────────────┤
│  • System Management          • Audit & Logs             │
│  • User Administration        • Analytics & Reports      │
│  • Configuration Management   • System Health            │
├─────────────────────────────────────────────────────────┤
│              ADMIN DASHBOARD (Shared Interface)          │
├─────────────────────────────────────────────────────────┤
│  • Staff Management   • Payments   • Inventory           │
│  • Commissions        • Reports    • Items               │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 IMPLEMENTATION BREAKDOWN

## LAYER 1: DATABASE SCHEMA

### Step 1.1: Update Users Table Enum

```sql
-- Add 'superadmin' to role options (if using ENUM constraint)
-- Ensure your users table has superadmin as valid role:

ALTER TYPE user_role ADD VALUE 'superadmin';

-- OR if no ENUM, ensure your check constraint includes it:
-- CONSTRAINT check_valid_role CHECK (role IN ('admin', 'sales', 'staff_commission', 'staff_non_commission', 'superadmin'))
```

### Step 1.2: Create Audit Logs Table

```sql
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user_email VARCHAR(255),
  action VARCHAR(255),
  action_type VARCHAR(50), -- 'CREATE', 'UPDATE', 'DELETE', 'VIEW', 'APPROVE'
  resource_type VARCHAR(100), -- 'user', 'payment', 'inventory', 'staff', 'admin'
  resource_id UUID,
  details JSONB, -- Store additional context
  ip_address VARCHAR(45),
  status VARCHAR(20), -- 'success', 'failed'
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_user_id (user_id),
  INDEX idx_action_type (action_type),
  INDEX idx_created_at (created_at)
);
```

### Step 1.3: Create System Events Table

```sql
CREATE TABLE IF NOT EXISTS system_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type VARCHAR(100), -- 'login', 'logout', 'error', 'backup', 'sync'
  severity VARCHAR(20), -- 'info', 'warning', 'error', 'critical'
  title VARCHAR(255),
  description TEXT,
  affected_users INT,
  affected_records INT,
  metadata JSONB,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_event_type (event_type),
  INDEX idx_severity (severity),
  INDEX idx_created_at (created_at)
);
```

### Step 1.4: Create System Config Table

```sql
CREATE TABLE IF NOT EXISTS system_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_key VARCHAR(255) UNIQUE NOT NULL,
  config_value JSONB,
  data_type VARCHAR(50), -- 'string', 'number', 'boolean', 'array', 'object'
  description TEXT,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Step 1.5: Insert Superadmin Users

```sql
-- First, hash these passwords with bcrypt in backend:
-- SuperAdmin_Owner@2026 → hash
-- SuperAdmin_Finance@2026 → hash
-- SuperAdmin_Operations@2026 → hash

INSERT INTO public.users (
  email, full_name, role, password_hash, is_active, 
  phone_number, store_location, created_at
) VALUES
  ('superadmin.owner@abifresh.com', 'Owner - Superadmin', 'superadmin', 
   'bcrypt_hash_here', true, '+234802000001', 'Jalingo', NOW()),
  ('superadmin.finance@abifresh.com', 'Finance Director - Superadmin', 'superadmin', 
   'bcrypt_hash_here', true, '+234802000002', 'Jalingo', NOW()),
  ('superadmin.ops@abifresh.com', 'Operations Manager - Superadmin', 'superadmin', 
   'bcrypt_hash_here', true, '+234802000003', 'Jalingo', NOW());
```

---

## LAYER 2: BACKEND - SERVICES

### Step 2.1: Create SuperAdmin Service

**File:** `backend/src/services/superadmin.service.ts`

```typescript
import { supabaseAdmin } from '../config/supabase';
import logger from '../config/logger';

export class SuperAdminService {
  
  // ============= USER MANAGEMENT =============
  
  async getAllUsers(filters?: { role?: string; isActive?: boolean }) {
    let query = supabaseAdmin.from('users').select('*');
    
    if (filters?.role) {
      query = query.eq('role', filters.role);
    }
    if (filters?.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  async getUserDetails(userId: string) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data;
  }

  async getUserActivityLog(userId: string, limit = 200) {
    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data;
  }

  // ============= ADMIN MANAGEMENT =============

  async deactivateAdmin(adminId: string, reason: string, superadminId: string) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ 
        is_active: false, 
        deactivated_at: new Date(),
        deactivated_reason: reason
      })
      .eq('id', adminId)
      .select();
    
    if (error) throw error;

    // Log the action
    await this.logAuditEvent({
      userId: superadminId,
      action: 'Admin Deactivated',
      actionType: 'UPDATE',
      resourceType: 'admin_user',
      resourceId: adminId,
      details: { reason, timestamp: new Date() },
      status: 'success'
    });

    return data;
  }

  async reactivateAdmin(adminId: string, superadminId: string) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ 
        is_active: true, 
        deactivated_at: null,
        deactivated_reason: null
      })
      .eq('id', adminId)
      .select();
    
    if (error) throw error;

    await this.logAuditEvent({
      userId: superadminId,
      action: 'Admin Reactivated',
      actionType: 'UPDATE',
      resourceType: 'admin_user',
      resourceId: adminId,
      status: 'success'
    });

    return data;
  }

  async resetUserPassword(userId: string, tempPassword: string, superadminId: string) {
    // Hash the temp password with bcrypt
    const hashedPassword = await hashPassword(tempPassword);
    
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ 
        password_hash: hashedPassword,
        force_password_change: true
      })
      .eq('id', userId)
      .select();
    
    if (error) throw error;

    await this.logAuditEvent({
      userId: superadminId,
      action: 'Password Reset',
      actionType: 'UPDATE',
      resourceType: 'user',
      resourceId: userId,
      details: { tempPassword, forced: true },
      status: 'success'
    });

    return data;
  }

  // ============= AUDIT & LOGGING =============

  async getAuditLogs(filters?: { 
    userId?: string;
    actionType?: string;
    resourceType?: string;
    startDate?: Date;
    endDate?: Date;
  }, limit = 500) {
    let query = supabaseAdmin.from('audit_logs').select('*');
    
    if (filters?.userId) query = query.eq('user_id', filters.userId);
    if (filters?.actionType) query = query.eq('action_type', filters.actionType);
    if (filters?.resourceType) query = query.eq('resource_type', filters.resourceType);
    if (filters?.startDate) query = query.gte('created_at', filters.startDate.toISOString());
    if (filters?.endDate) query = query.lte('created_at', filters.endDate.toISOString());
    
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data;
  }

  private async logAuditEvent(logData: {
    userId: string;
    userEmail?: string;
    action: string;
    actionType: string;
    resourceType: string;
    resourceId?: string;
    details?: any;
    status: string;
    errorMessage?: string;
  }) {
    try {
      const { error } = await supabaseAdmin.from('audit_logs').insert([{
        user_id: logData.userId,
        user_email: logData.userEmail,
        action: logData.action,
        action_type: logData.actionType,
        resource_type: logData.resourceType,
        resource_id: logData.resourceId,
        details: logData.details,
        status: logData.status,
        error_message: logData.errorMessage,
        created_at: new Date()
      }]);
      
      if (error) logger.error('Failed to log audit event:', error);
    } catch (err) {
      logger.error('Audit logging error:', err);
    }
  }

  async getFailedLogins(hoursBack = 24) {
    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .eq('action_type', 'LOGIN_FAILED')
      .gte('created_at', new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  async getSuspiciousActivity(hoursBack = 24) {
    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .or('status.eq.failed,action_type.eq.UNAUTHORIZED_ACCESS')
      .gte('created_at', new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  async getSystemEvents(filters?: { 
    eventType?: string;
    severity?: string;
    limit?: number;
  }) {
    let query = supabaseAdmin.from('system_events').select('*');
    
    if (filters?.eventType) query = query.eq('event_type', filters.eventType);
    if (filters?.severity) query = query.eq('severity', filters.severity);
    
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(filters?.limit || 200);
    
    if (error) throw error;
    return data;
  }

  // ============= SYSTEM ANALYTICS =============

  async getSystemHealth() {
    const [
      users,
      activeUsers,
      admins,
      payments,
      sales,
      items,
      failedLogins,
      systemEvents
    ] = await Promise.all([
      this.countRecords('users'),
      this.countRecords('users', { is_active: true }),
      this.countRecords('users', { role: 'admin' }),
      this.countRecords('staff_payments'),
      this.countRecords('sales'),
      this.countRecords('items'),
      this.countFailedLogins(24),
      this.countSystemEvents('error', 24)
    ]);

    return {
      users: { total: users, active: activeUsers, admins },
      transactions: { payments, sales },
      inventory: { items },
      security: { failedLoginsLast24h: failedLogins, errorsLast24h: systemEvents },
      timestamp: new Date(),
      status: systemEvents > 5 ? 'warning' : 'healthy'
    };
  }

  private async countRecords(table: string, filters?: any) {
    let query = supabaseAdmin.from(table).select('id', { count: 'exact', head: true });
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }
    
    const { count } = await query;
    return count || 0;
  }

  private async countFailedLogins(hoursBack: number) {
    const startDate = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    const { count } = await supabaseAdmin
      .from('audit_logs')
      .select('id', { count: 'exact', head: true })
      .eq('action_type', 'LOGIN_FAILED')
      .gte('created_at', startDate.toISOString());
    
    return count || 0;
  }

  private async countSystemEvents(severity: string, hoursBack: number) {
    const startDate = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    const { count } = await supabaseAdmin
      .from('system_events')
      .select('id', { count: 'exact', head: true })
      .eq('severity', severity)
      .gte('created_at', startDate.toISOString());
    
    return count || 0;
  }

  async getAdminActivity(limit = 300) {
    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .in('action_type', ['APPROVE', 'REJECT', 'DELETE', 'CREATE', 'UPDATE'])
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data;
  }

  async getRevenueAnalytics(daysBack = 30) {
    const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
    
    const { data, error } = await supabaseAdmin
      .from('sales')
      .select('id, total_amount, created_at')
      .gte('created_at', startDate.toISOString());
    
    if (error) throw error;
    
    // Process data for analytics
    const dailyRevenue: { [key: string]: number } = {};
    data?.forEach(sale => {
      const date = new Date(sale.created_at).toISOString().split('T')[0];
      dailyRevenue[date] = (dailyRevenue[date] || 0) + sale.total_amount;
    });
    
    return dailyRevenue;
  }

  // ============= CONFIGURATION MANAGEMENT =============

  async getSystemConfig(configKey?: string) {
    let query = supabaseAdmin.from('system_config').select('*');
    
    if (configKey) {
      query = query.eq('config_key', configKey);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async updateSystemConfig(configKey: string, configValue: any, updatedBy: string) {
    const { data, error } = await supabaseAdmin
      .from('system_config')
      .upsert([{
        config_key: configKey,
        config_value: configValue,
        updated_by: updatedBy,
        updated_at: new Date()
      }], { onConflict: 'config_key' })
      .select();
    
    if (error) throw error;

    await this.logAuditEvent({
      userId: updatedBy,
      action: `Config Updated: ${configKey}`,
      actionType: 'UPDATE',
      resourceType: 'system_config',
      details: { oldValue: 'hidden', newValue: 'hidden' },
      status: 'success'
    });

    return data;
  }

  // ============= SYSTEM REPORTS =============

  async getComprehensiveReport(daysBack = 30) {
    const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
    
    const [health, adminActivity, revenueData, auditLogs, systemEvents] = await Promise.all([
      this.getSystemHealth(),
      this.getAdminActivity(100),
      this.getRevenueAnalytics(daysBack),
      this.getAuditLogs({ startDate }, 200),
      this.getSystemEvents({ severity: 'error', limit: 100 })
    ]);

    return {
      generatedAt: new Date(),
      period: `Last ${daysBack} days`,
      health,
      adminActivity: adminActivity.length,
      totalRevenue: Object.values(revenueData).reduce((a, b) => a + b, 0),
      auditEventsCount: auditLogs.length,
      systemErrorsCount: systemEvents.length,
      details: {
        adminActivity: adminActivity.slice(0, 20),
        revenueByDay: revenueData,
        recentErrors: systemEvents.slice(0, 10)
      }
    };
  }
}

export const superAdminService = new SuperAdminService();
```

---

## LAYER 3: BACKEND - API ROUTES

### Step 3.1: Create SuperAdmin Routes File

**New File:** `backend/src/routes/superadmin.routes.ts`

```typescript
import { Router, Response } from 'express';
import { authMiddleware, roleMiddleware, AuthRequest } from '../middleware/auth';
import { superAdminService } from '../services/superadmin.service';
import logger, { logSecurity } from '../config/logger';

const router = Router();

// ============= USER MANAGEMENT ENDPOINTS =============

/**
 * GET /api/superadmin/users
 * Get all users with filters
 */
router.get('/users', authMiddleware, roleMiddleware('superadmin'), async (req: AuthRequest, res: Response) => {
  try {
    const { role, isActive } = req.query;
    const users = await superAdminService.getAllUsers({
      role: role as string,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined
    });
    res.json(users);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/superadmin/users/:userId
 * Get specific user details
 */
router.get('/users/:userId', authMiddleware, roleMiddleware('superadmin'), async (req: AuthRequest, res: Response) => {
  try {
    const user = await superAdminService.getUserDetails(req.params.userId);
    const activity = await superAdminService.getUserActivityLog(req.params.userId, 50);
    
    res.json({ user, recentActivity: activity });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/superadmin/users/:userId/deactivate
 * Deactivate any user
 */
router.post('/users/:userId/deactivate', authMiddleware, roleMiddleware('superadmin'), async (req: AuthRequest, res: Response) => {
  try {
    const { reason } = req.body;
    
    if (req.params.userId === req.user?.id) {
      return res.status(400).json({ error: 'Cannot deactivate your own account' });
    }

    const result = await superAdminService.deactivateAdmin(req.params.userId, reason || 'Manual deactivation', req.user!.id);
    
    logSecurity('user_deactivated', {
      superadminId: req.user?.id,
      targetUserId: req.params.userId,
      reason
    });

    res.json({ message: 'User deactivated', data: result });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/superadmin/users/:userId/reactivate
 * Reactivate a user
 */
router.post('/users/:userId/reactivate', authMiddleware, roleMiddleware('superadmin'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await superAdminService.reactivateAdmin(req.params.userId, req.user!.id);
    res.json({ message: 'User reactivated', data: result });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/superadmin/users/:userId/reset-password
 * Reset user password
 */
router.post('/users/:userId/reset-password', authMiddleware, roleMiddleware('superadmin'), async (req: AuthRequest, res: Response) => {
  try {
    const { tempPassword } = req.body;
    
    if (!tempPassword) {
      return res.status(400).json({ error: 'Temporary password required' });
    }

    const result = await superAdminService.resetUserPassword(req.params.userId, tempPassword, req.user!.id);
    
    logSecurity('password_reset', {
      superadminId: req.user?.id,
      targetUserId: req.params.userId
    });

    res.json({ message: 'Password reset. User must change on next login.', data: result });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============= AUDIT & LOGGING ENDPOINTS =============

/**
 * GET /api/superadmin/audit-logs
 * Get audit logs with filters
 */
router.get('/audit-logs', authMiddleware, roleMiddleware('superadmin'), async (req: AuthRequest, res: Response) => {
  try {
    const { userId, actionType, resourceType, startDate, endDate, limit } = req.query;
    
    const logs = await superAdminService.getAuditLogs(
      {
        userId: userId as string,
        actionType: actionType as string,
        resourceType: resourceType as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      },
      parseInt(limit as string) || 500
    );
    
    res.json(logs);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/superadmin/suspicious-activity
 * Get suspicious activities (failed logins, unauthorized access)
 */
router.get('/suspicious-activity', authMiddleware, roleMiddleware('superadmin'), async (req: AuthRequest, res: Response) => {
  try {
    const { hoursBack } = req.query;
    const activity = await superAdminService.getSuspiciousActivity(parseInt(hoursBack as string) || 24);
    res.json(activity);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/superadmin/failed-logins
 * Get failed login attempts
 */
router.get('/failed-logins', authMiddleware, roleMiddleware('superadmin'), async (req: AuthRequest, res: Response) => {
  try {
    const { hoursBack } = req.query;
    const logs = await superAdminService.getFailedLogins(parseInt(hoursBack as string) || 24);
    res.json(logs);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============= ANALYTICS ENDPOINTS =============

/**
 * GET /api/superadmin/system-health
 * Get system health metrics
 */
router.get('/system-health', authMiddleware, roleMiddleware('superadmin'), async (req: AuthRequest, res: Response) => {
  try {
    const health = await superAdminService.getSystemHealth();
    res.json(health);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/superadmin/system-events
 * Get system events (errors, warnings, info)
 */
router.get('/system-events', authMiddleware, roleMiddleware('superadmin'), async (req: AuthRequest, res: Response) => {
  try {
    const { eventType, severity, limit } = req.query;
    const events = await superAdminService.getSystemEvents({
      eventType: eventType as string,
      severity: severity as string,
      limit: parseInt(limit as string) || 200
    });
    res.json(events);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/superadmin/admin-activity
 * Get all admin actions/approvals
 */
router.get('/admin-activity', authMiddleware, roleMiddleware('superadmin'), async (req: AuthRequest, res: Response) => {
  try {
    const { limit } = req.query;
    const activity = await superAdminService.getAdminActivity(parseInt(limit as string) || 300);
    res.json(activity);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/superadmin/revenue-analytics
 * Get revenue analytics for period
 */
router.get('/revenue-analytics', authMiddleware, roleMiddleware('superadmin'), async (req: AuthRequest, res: Response) => {
  try {
    const { daysBack } = req.query;
    const data = await superAdminService.getRevenueAnalytics(parseInt(daysBack as string) || 30);
    res.json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============= CONFIGURATION ENDPOINTS =============

/**
 * GET /api/superadmin/config
 * Get system configuration
 */
router.get('/config', authMiddleware, roleMiddleware('superadmin'), async (req: AuthRequest, res: Response) => {
  try {
    const { key } = req.query;
    const config = await superAdminService.getSystemConfig(key as string);
    res.json(config);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * PUT /api/superadmin/config
 * Update system configuration
 */
router.put('/config', authMiddleware, roleMiddleware('superadmin'), async (req: AuthRequest, res: Response) => {
  try {
    const { configKey, configValue } = req.body;
    
    if (!configKey) {
      return res.status(400).json({ error: 'Config key required' });
    }

    const result = await superAdminService.updateSystemConfig(configKey, configValue, req.user!.id);
    
    logSecurity('config_updated', {
      superadminId: req.user?.id,
      configKey
    });

    res.json({ message: 'Configuration updated', data: result });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============= REPORTING ENDPOINT =============

/**
 * GET /api/superadmin/comprehensive-report
 * Get comprehensive system report
 */
router.get('/comprehensive-report', authMiddleware, roleMiddleware('superadmin'), async (req: AuthRequest, res: Response) => {
  try {
    const { daysBack } = req.query;
    const report = await superAdminService.getComprehensiveReport(parseInt(daysBack as string) || 30);
    
    logSecurity('report_generated', {
      superadminId: req.user?.id,
      daysBack: parseInt(daysBack as string) || 30
    });

    res.json(report);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
```

### Step 3.2: Register Routes in Main App

**File:** `backend/src/index.ts` (or your main app file)

```typescript
import superadminRoutes from './routes/superadmin.routes';

// ... other imports and middleware ...

// Register superadmin routes
app.use('/api/superadmin', superadminRoutes);

// Register before other routes
app.use('/api/admin', adminRoutes); // existing admin routes
```

---

## LAYER 4: FRONTEND - TYPE DEFINITIONS

### Step 4.1: Create TypeScript Types

**New File:** `frontend/types/superadmin.ts`

```typescript
export interface SuperAdminUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  phone_number: string;
  created_at: string;
  last_login: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_email: string;
  action: string;
  action_type: string;
  resource_type: string;
  resource_id: string;
  details: any;
  status: 'success' | 'failed';
  created_at: string;
}

export interface SystemHealth {
  users: { total: number; active: number; admins: number };
  transactions: { payments: number; sales: number };
  inventory: { items: number };
  security: { failedLoginsLast24h: number; errorsLast24h: number };
  status: 'healthy' | 'warning' | 'critical';
  timestamp: string;
}

export interface SystemEvent {
  id: string;
  event_type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  description: string;
  metadata: any;
  resolved: boolean;
  created_at: string;
}

export interface ComprehensiveReport {
  generatedAt: string;
  period: string;
  health: SystemHealth;
  adminActivity: number;
  totalRevenue: number;
  auditEventsCount: number;
  systemErrorsCount: number;
  details: {
    adminActivity: AuditLog[];
    revenueByDay: { [date: string]: number };
    recentErrors: SystemEvent[];
  };
}
```

---

## LAYER 5: FRONTEND - UI COMPONENTS

### Step 5.1: Main SuperAdmin Dashboard Component

**New File:** `frontend/components/superadmin/SuperAdminDashboard.tsx`

Complete with tabs for: Users Management, Audit Logs, System Analytics, Configuration

[See my comprehensive implementation guide document for full component code - this is provided in SUPERADMIN_IMPLEMENTATION_PLAN.md]

---

## 🔑 KEY IMPLEMENTATION POINTS

### 1. **Database First**
   - Create all tables with proper indexes
   - Insert superadmin users (don't expose creation via UI)
   - Ensure audit logging tables are ready

### 2. **Backend Middleware**
   - Add 'superadmin' to roleMiddleware normalization
   - Implement superadmin service with all methods
   - Create routes with proper authorization checks

### 3. **Frontend UI**
   - Create conditional rendering: `user.role === 'superadmin'`
   - Build tabbed interface for different superadmin features
   - Add comprehensive data visualization

### 4. **Security Measures**
   - Log all superadmin actions
   - Prevent self-deactivation
   - Use strong password policies
   - Implement IP-based logging

---

## 📝 SUPERADMIN CAPABILITIES SUMMARY

| Feature | Endpoint | Purpose |
|---------|----------|---------|
| **View All Users** | `GET /api/superadmin/users` | User directory & management |
| **View User Details** | `GET /api/superadmin/users/:id` | Detailed user + activity log |
| **Deactivate User** | `POST /api/superadmin/users/:id/deactivate` | Disable user access |
| **Reactivate User** | `POST /api/superadmin/users/:id/reactivate` | Re-enable user access |
| **Reset Password** | `POST /api/superadmin/users/:id/reset-password` | Force password change |
| **Audit Logs** | `GET /api/superadmin/audit-logs` | Track all admin actions |
| **Suspicious Activity** | `GET /api/superadmin/suspicious-activity` | Security monitoring |
| **Failed Logins** | `GET /api/superadmin/failed-logins` | Failed login attempts |
| **System Health** | `GET /api/superadmin/system-health` | Real-time metrics |
| **System Events** | `GET /api/superadmin/system-events` | Error tracking |
| **Admin Activity** | `GET /api/superadmin/admin-activity` | All admin approvals/actions |
| **Revenue Analytics** | `GET /api/superadmin/revenue-analytics` | Financial reports |
| **System Config** | `GET/PUT /api/superadmin/config` | System settings |
| **Comprehensive Report** | `GET /api/superadmin/comprehensive-report` | Full system report |

---

## ✅ TESTING CHECKLIST

- [ ] Database tables created with proper schema
- [ ] Superadmin users inserted
- [ ] Superadmin can login successfully
- [ ] Routes return 403 for non-superadmin users
- [ ] Audit logs are being recorded
- [ ] User deactivation works
- [ ] Password reset functionality works
- [ ] System health metrics calculate correctly
- [ ] Frontend displays superadmin components only for superadmin role
- [ ] Dashboard shows all expected data

---

## 🚀 DEPLOYMENT NOTES

1. **Database Migration**: Run SQL scripts on Supabase first
2. **Backend Deployment**: Deploy superadmin service + routes
3. **Frontend Deployment**: Deploy UI components (auto-hidden for non-superadmins)
4. **Testing**: Use test superadmin accounts before production
5. **Monitoring**: Check logs immediately after deploy

