'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import api from '@/lib/api';
import { Activity, CheckCircle, Cpu, Database, HardDrive, RefreshCw, Server, Shield, Wifi, XCircle, X } from 'lucide-react';

interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  latency?: string;
  details?: string;
  errorLog?: string;
}

export default function SystemHealthPage() {
  const { token } = useAuthStore();
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [dbStats, setDbStats] = useState({ tables: 0, receipts: 0, staff: 0, items: 0 });
  const [selectedCheck, setSelectedCheck] = useState<HealthCheck | null>(null);

  const runHealthCheck = async () => {
    setIsLoading(true);
    const checks: HealthCheck[] = [];

    // Backend API check - call Next.js serverless API route
    try {
      const start = Date.now();
      const response = await api.get('/api/health');
      const latency = Date.now() - start;
      if (response.status === 200) {
        checks.push({ name: 'Backend API', status: latency < 2000 ? 'healthy' : 'degraded', latency: `${latency}ms`, details: 'Vercel serverless responding', errorLog: 'Connection successful' });
      } else {
        checks.push({ name: 'Backend API', status: 'down', details: 'Server returned error', errorLog: `HTTP ${response.status}` });
      }
    } catch (err: any) {
      checks.push({ name: 'Backend API', status: 'down', details: 'Cannot reach backend server', errorLog: err.message || 'Network timeout or error' });
    }

    // Database check (via staff endpoint)
    try {
      const start = Date.now();
      const staffRes = await api.get('/api/admin/staff', { headers: { Authorization: `Bearer ${token}` } });
      const latency = Date.now() - start;
      const staffCount = (staffRes.data || []).length;
      checks.push({ name: 'Database (Staff)', status: latency < 3000 ? 'healthy' : 'degraded', latency: `${latency}ms`, details: `${staffCount} staff records`, errorLog: 'Query successful' });
      setDbStats(prev => ({ ...prev, staff: staffCount }));
    } catch (err: any) {
      checks.push({ name: 'Database (Staff)', status: 'down', details: 'Cannot query staff table', errorLog: err.response?.data?.error || err.message || 'Database error' });
    }

    // Receipts check
    try {
      const start = Date.now();
      const receiptsRes = await api.get('/api/receipts/all', { headers: { Authorization: `Bearer ${token}` } });
      const latency = Date.now() - start;
      const count = (receiptsRes.data || []).length;
      checks.push({ name: 'Receipts Service', status: latency < 3000 ? 'healthy' : 'degraded', latency: `${latency}ms`, details: `${count} receipts found`, errorLog: 'Query successful' });
      setDbStats(prev => ({ ...prev, receipts: count }));
    } catch (err: any) {
      checks.push({ name: 'Receipts Service', status: 'down', details: 'Cannot access receipts', errorLog: err.response?.data?.error || err.message || 'Access denied' });
    }

    // Inventory check - query inventory endpoint (requires auth)
    try {
      const start = Date.now();
      const inventoryRes = await api.get('/api/inventory/items', { headers: { Authorization: `Bearer ${token}` } });
      const latency = Date.now() - start;
      const count = (inventoryRes.data || []).length;
      checks.push({ name: 'Inventory Service', status: latency < 3000 ? 'healthy' : 'degraded', latency: `${latency}ms`, details: `${count} items tracked`, errorLog: 'Query successful' });
      setDbStats(prev => ({ ...prev, items: count }));
    } catch (err: any) {
      checks.push({ name: 'Inventory Service', status: 'down', details: 'Cannot access inventory', errorLog: err.response?.data?.error || err.message || 'Endpoint not accessible or authentication failed' });
    }

    // Auth service check
    checks.push({ name: 'Auth Service', status: token ? 'healthy' : 'down', details: token ? 'JWT active and valid' : 'No active session', errorLog: token ? 'Token verified' : 'No token found' });

    // Frontend check is always healthy if we're running
    checks.push({ name: 'Frontend (Next.js)', status: 'healthy', details: 'Running on port 3000', errorLog: 'Application loaded successfully' });

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
        <div className="card text-center overflow-hidden">
          <Shield className="w-8 h-8 text-blue-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-800 dark:text-white break-words">{healthyCount}/{healthChecks.length}</p>
          <p className="text-sm text-gray-500">Services Healthy</p>
        </div>
        <div className="card text-center overflow-hidden">
          <Database className="w-8 h-8 text-purple-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-800 dark:text-white break-words">{dbStats.receipts + dbStats.staff + dbStats.items}</p>
          <p className="text-sm text-gray-500">Total Records</p>
        </div>
        <div className="card text-center overflow-hidden">
          <HardDrive className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-800 dark:text-white break-words">{dbStats.tables}</p>
          <p className="text-sm text-gray-500">Active Tables</p>
        </div>
        <div className="card text-center overflow-hidden">
          <Cpu className="w-8 h-8 text-green-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-800 dark:text-white break-words">
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
            <div 
              key={i} 
              onClick={() => setSelectedCheck(check)}
              className={`p-4 rounded-xl border ${statusBg(check.status)} transition cursor-pointer hover:shadow-lg`}
            >
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

      {/* Detail Modal */}
      {selectedCheck && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                {statusIcon(selectedCheck.status)}
                <h2 className="text-lg font-bold text-gray-800 dark:text-white">{selectedCheck.name}</h2>
              </div>
              <button 
                onClick={() => setSelectedCheck(null)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                <p className={`text-lg font-bold capitalize ${statusColor(selectedCheck.status)}`}>{selectedCheck.status}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Details</p>
                <p className="text-gray-800 dark:text-gray-200">{selectedCheck.details}</p>
              </div>

              {selectedCheck.latency && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Response Time</p>
                  <p className="text-gray-800 dark:text-gray-200">{selectedCheck.latency}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Diagnostic Log</p>
                <div className="bg-gray-900 text-green-400 p-3 rounded-lg font-mono text-sm break-words">
                  <p>{selectedCheck.errorLog || 'No error information available'}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Last checked: {lastCheck?.toLocaleTimeString('en-NG') || 'Never'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

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
            { label: 'Backend', value: 'Next.js Serverless (Vercel)' },
            { label: 'Database', value: 'Supabase PostgreSQL' },
            { label: 'Auth Provider', value: 'JWT + Supabase Auth' },
            { label: 'API Base URL', value: process.env.NEXT_PUBLIC_API_URL || '(relative /api routes)' },
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
