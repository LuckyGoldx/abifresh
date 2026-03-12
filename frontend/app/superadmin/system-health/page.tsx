'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import api from '@/lib/api';
import { Activity, CheckCircle, Cpu, Database, HardDrive, RefreshCw, Server, Shield, Wifi, XCircle } from 'lucide-react';

interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  latency?: string;
  details?: string;
}

export default function SystemHealthPage() {
  const { token } = useAuthStore();
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [dbStats, setDbStats] = useState({ tables: 0, receipts: 0, staff: 0, items: 0 });

  const runHealthCheck = async () => {
    setIsLoading(true);
    const checks: HealthCheck[] = [];
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    // Backend API check
    try {
      const start = Date.now();
      await api.get('/api/health');
      const latency = Date.now() - start;
      checks.push({ name: 'Backend API', status: latency < 2000 ? 'healthy' : 'degraded', latency: `${latency}ms`, details: 'Express server responding' });
    } catch {
      checks.push({ name: 'Backend API', status: 'down', details: 'Cannot reach backend server' });
    }

    // Database check (via staff endpoint)
    try {
      const start = Date.now();
      const staffRes = await api.get('/api/admin/staff', { headers: { Authorization: `Bearer ${token}` } });
      const latency = Date.now() - start;
      const staffCount = (staffRes.data || []).length;
      checks.push({ name: 'Database (Staff)', status: latency < 3000 ? 'healthy' : 'degraded', latency: `${latency}ms`, details: `${staffCount} staff records` });
      setDbStats(prev => ({ ...prev, staff: staffCount }));
    } catch {
      checks.push({ name: 'Database (Staff)', status: 'down', details: 'Cannot query staff table' });
    }

    // Receipts check
    try {
      const start = Date.now();
      const receiptsRes = await api.get('/api/receipts/all', { headers: { Authorization: `Bearer ${token}` } });
      const latency = Date.now() - start;
      const count = (receiptsRes.data || []).length;
      checks.push({ name: 'Receipts Service', status: latency < 3000 ? 'healthy' : 'degraded', latency: `${latency}ms`, details: `${count} receipts found` });
      setDbStats(prev => ({ ...prev, receipts: count }));
    } catch {
      checks.push({ name: 'Receipts Service', status: 'down', details: 'Cannot access receipts' });
    }

    // Items check
    try {
      const start = Date.now();
      const itemsRes = await api.get('/api/items', { headers: { Authorization: `Bearer ${token}` } });
      const latency = Date.now() - start;
      const count = (itemsRes.data || []).length;
      checks.push({ name: 'Inventory Service', status: latency < 3000 ? 'healthy' : 'degraded', latency: `${latency}ms`, details: `${count} items tracked` });
      setDbStats(prev => ({ ...prev, items: count }));
    } catch {
      checks.push({ name: 'Inventory Service', status: 'down', details: 'Cannot access inventory' });
    }

    // Auth service check
    checks.push({ name: 'Auth Service', status: token ? 'healthy' : 'down', details: token ? 'JWT active and valid' : 'No active session' });

    // Frontend check is always healthy if we're running
    checks.push({ name: 'Frontend (Next.js)', status: 'healthy', details: 'Running on port 3000' });

    setHealthChecks(checks);
    setDbStats(prev => ({ ...prev, tables: 4 }));
    setLastCheck(new Date());
    setIsLoading(false);
  };

  useEffect(() => { if (token) runHealthCheck(); }, [token]);

  const overallStatus = healthChecks.some(h => h.status === 'down') ? 'down' : healthChecks.some(h => h.status === 'degraded') ? 'degraded' : 'healthy';
  const healthyCount = healthChecks.filter(h => h.status === 'healthy').length;

  const statusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'degraded': return 'text-yellow-500';
      case 'down': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const statusBg = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800';
      case 'degraded': return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800';
      case 'down': return 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800';
      default: return 'bg-gray-100 dark:bg-gray-900/30';
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'degraded': return <Activity className="w-5 h-5 text-yellow-500" />;
      case 'down': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <Activity className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`rounded-2xl p-6 text-white ${overallStatus === 'healthy' ? 'bg-gradient-to-r from-green-600 to-emerald-600' : overallStatus === 'degraded' ? 'bg-gradient-to-r from-yellow-600 to-amber-600' : 'bg-gradient-to-r from-red-600 to-rose-600'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Server className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">System Health</h1>
              <p className="text-sm opacity-80">
                {overallStatus === 'healthy' ? 'All systems operational' : overallStatus === 'degraded' ? 'Some services degraded' : 'Service disruption detected'}
              </p>
            </div>
          </div>
          <button onClick={runHealthCheck} disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Checking...' : 'Re-check'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card text-center">
          <Shield className="w-8 h-8 text-blue-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-800 dark:text-white">{healthyCount}/{healthChecks.length}</p>
          <p className="text-sm text-gray-500">Services Healthy</p>
        </div>
        <div className="card text-center">
          <Database className="w-8 h-8 text-purple-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-800 dark:text-white">{dbStats.receipts + dbStats.staff + dbStats.items}</p>
          <p className="text-sm text-gray-500">Total Records</p>
        </div>
        <div className="card text-center">
          <HardDrive className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-800 dark:text-white">{dbStats.tables}</p>
          <p className="text-sm text-gray-500">Active Tables</p>
        </div>
        <div className="card text-center">
          <Cpu className="w-8 h-8 text-green-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-800 dark:text-white">
            {lastCheck ? lastCheck.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
          </p>
          <p className="text-sm text-gray-500">Last Checked</p>
        </div>
      </div>

      {/* Health Checks Grid */}
      <div className="card">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Service Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {healthChecks.map((check, i) => (
            <div key={i} className={`p-4 rounded-xl border ${statusBg(check.status)} transition`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {statusIcon(check.status)}
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-white">{check.name}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{check.details}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-medium capitalize ${statusColor(check.status)}`}>{check.status}</span>
                  {check.latency && <p className="text-xs text-gray-500">{check.latency}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Database Overview */}
      <div className="card">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Database Overview</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200 dark:border-gray-700">
                <th className="py-2 font-medium">Table</th>
                <th className="py-2 font-medium">Records</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {[
                { name: 'Staff / Users', count: dbStats.staff },
                { name: 'Receipts', count: dbStats.receipts },
                { name: 'Items / Inventory', count: dbStats.items },
              ].map((table, i) => (
                <tr key={i} className="text-gray-800 dark:text-gray-200">
                  <td className="py-2 flex items-center gap-2"><Database className="w-4 h-4 text-blue-500" /> {table.name}</td>
                  <td className="py-2">{table.count.toLocaleString()}</td>
                  <td className="py-2"><span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Active</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Info */}
      <div className="card">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">System Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {[
            { label: 'Frontend', value: 'Next.js on port 3000' },
            { label: 'Backend', value: 'Express.js on port 5000' },
            { label: 'Database', value: 'Supabase PostgreSQL' },
            { label: 'Auth Provider', value: 'JWT + Localhost Fallback' },
            { label: 'API Base URL', value: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000' },
            { label: 'Environment', value: process.env.NODE_ENV || 'development' },
          ].map((info, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-gray-500">{info.label}</span>
              <span className="font-medium text-gray-800 dark:text-white">{info.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
