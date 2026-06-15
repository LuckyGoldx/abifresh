'use client';

import { useState, useCallback } from 'react';
import api from '@/lib/api';
import type { AdminDashboardStats } from '@/types';

interface UseDashboardStatsOptions {
  role: 'admin' | 'superadmin';
}

interface UseDashboardStatsReturn {
  stats: AdminDashboardStats | null;
  isLoading: boolean;
  error: string | null;
  fetchStats: () => Promise<void>;
}

export function useDashboardStats({ role }: UseDashboardStatsOptions): UseDashboardStatsReturn {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [receiptsRes, staffRes, paymentsRes] = await Promise.all([
        api.get('/api/receipts/all').catch(() => ({ data: [] })),
        api.get(`/api/${role}/staff`).catch(() => ({ data: [] })),
        api.get(`/api/${role}/payments/pending`).catch(() => ({ data: [] })),
      ]);

      const allReceipts = receiptsRes.data || [];
      const staffList = staffRes.data || [];
      const pendingPayments = paymentsRes.data || [];

      // Today's receipts
      const today = Intl.DateTimeFormat('en-NG', {
        timeZone: 'Africa/Lagos',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());

      const todayReceipts = allReceipts.filter((receipt: any) => {
        try {
          const receiptDate = new Date(receipt.created_at);
          const formatted = Intl.DateTimeFormat('en-NG', {
            timeZone: 'Africa/Lagos',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          }).format(receiptDate);
          return formatted === today;
        } catch {
          return false;
        }
      });

      const todayStats = todayReceipts.reduce(
        (acc: any, receipt: any) => ({
          totalItems: acc.totalItems + (receipt.items_count || 0),
          totalSales: acc.totalSales + 1,
          totalAmount: acc.totalAmount + (Number(receipt.total_amount) || 0),
        }),
        { totalItems: 0, totalSales: 0, totalAmount: 0 }
      );

      const allTimeStats = allReceipts.reduce(
        (acc: any, receipt: any) => ({
          totalItems: acc.totalItems + (receipt.items_count || 0),
          totalSales: acc.totalSales + 1,
          totalAmount: acc.totalAmount + (Number(receipt.total_amount) || 0),
        }),
        { totalItems: 0, totalSales: 0, totalAmount: 0 }
      );

      const pendingAmount = (pendingPayments || []).reduce(
        (sum: number, p: any) => sum + (Number(p.amount) || 0),
        0
      );

      setStats({
        today_sales: todayStats.totalSales,
        today_amount: todayStats.totalAmount,
        today_items: todayStats.totalItems,
        total_sales: allTimeStats.totalSales,
        total_amount: allTimeStats.totalAmount,
        total_items: allTimeStats.totalItems,
        total_staff: staffList.length,
        pending_approvals: (pendingPayments || []).length,
        pending_amount: pendingAmount,
      });
    } catch (err: any) {
      console.error('Error fetching dashboard stats:', err);
      setError(err?.message || 'Failed to load dashboard statistics');
    } finally {
      setIsLoading(false);
    }
  }, [role]);

  return { stats, isLoading, error, fetchStats };
}
