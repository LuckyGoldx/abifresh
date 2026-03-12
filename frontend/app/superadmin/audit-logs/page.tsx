'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import api from '@/lib/api';
import { Activity, AlertTriangle, CheckCircle, Clock, FileText, Search, Shield, User } from 'lucide-react';

interface AuditEntry {
  id: string;
  action: string;
  user: string;
  role: string;
  timestamp: string;
  details: string;
  ip?: string;
  status: 'success' | 'warning' | 'error';
}

export default function AuditLogsPage() {
  const { token, user } = useAuthStore();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        // Try to fetch from receipts/activity as a proxy for audit trail
        const [receiptsRes, staffRes] = await Promise.all([
          api.get('/api/receipts/all', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
          api.get('/api/admin/staff', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
        ]);

        const staffMap: { [id: string]: string } = {};
        (staffRes.data || []).forEach((s: any) => { staffMap[s.id] = s.full_name; });

        // Build audit entries from receipts (most recent activity)
        const auditEntries: AuditEntry[] = (receiptsRes.data || []).slice(0, 50).map((receipt: any, i: number) => ({
          id: receipt.id || `audit-${i}`,
          action: 'Sale Completed',
          user: staffMap[receipt.staff_id] || 'Unknown',
          role: 'staff',
          timestamp: receipt.created_at,
          details: `Receipt ${receipt.receipt_number} - ₦${(receipt.total_amount || 0).toLocaleString()} (${receipt.payment_method})`,
          status: 'success' as const,
        }));

        setLogs(auditEntries);
      } catch (error) {
        console.error('Failed to fetch audit logs:', error);
      } finally {
        setIsLoading(false);
      }
    };
    if (token) fetchLogs();
  }, [token]);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = !searchQuery ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3">
          <FileText className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">Audit Logs</h1>
            <p className="text-amber-200 text-sm">Track all system activities and user actions</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card text-center">
          <Activity className="w-8 h-8 text-blue-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-800 dark:text-white">{logs.length}</p>
          <p className="text-sm text-gray-500">Total Activities</p>
        </div>
        <div className="card text-center">
          <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-800 dark:text-white">{logs.filter(l => l.status === 'success').length}</p>
          <p className="text-sm text-gray-500">Successful</p>
        </div>
        <div className="card text-center">
          <AlertTriangle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-800 dark:text-white">{logs.filter(l => l.status === 'warning').length}</p>
          <p className="text-sm text-gray-500">Warnings</p>
        </div>
        <div className="card text-center">
          <Clock className="w-8 h-8 text-purple-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-800 dark:text-white">
            {logs.length > 0 ? new Date(logs[0].timestamp).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' }) : 'N/A'}
          </p>
          <p className="text-sm text-gray-500">Latest Activity</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input type="text" placeholder="Search logs..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white bg-white">
            <option value="">All Status</option>
            <option value="success">Success</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
          </select>
        </div>
      </div>

      {/* Logs Timeline */}
      <div className="card">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Activity Timeline</h3>
        <div className="space-y-3">
          {filteredLogs.length > 0 ? filteredLogs.map(log => (
            <div key={log.id} className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition border-l-4 border-gray-200 dark:border-gray-600">
              <div className="flex-shrink-0 mt-1">{statusIcon(log.status)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-900 dark:text-white">{log.action}</span>
                  <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">{log.role}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{log.details}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><User size={12} /> {log.user}</span>
                  <span className="flex items-center gap-1"><Clock size={12} /> {new Date(log.timestamp).toLocaleString('en-NG')}</span>
                </div>
              </div>
            </div>
          )) : (
            <div className="text-center py-8 text-gray-500">No audit logs found</div>
          )}
        </div>
      </div>
    </div>
  );
}
