'use client';

import { useState, useCallback } from 'react';
import api from '@/lib/api';
import type { Payment, StaffSummaryRow } from '@/types';

interface UsePaymentsOptions {
  role: 'admin' | 'sales' | 'staff';
  staffId?: string;
}

interface UsePaymentsReturn {
  payments: Payment[];
  staffSummary: StaffSummaryRow[];
  isLoading: boolean;
  error: string | null;
  fetchPayments: (token: string) => Promise<void>;
  fetchStaffSummary: (token: string) => Promise<void>;
  approvePayment: (id: string, token: string) => Promise<boolean>;
  rejectPayment: (id: string, reason: string, token: string) => Promise<boolean>;
}

export function usePayments({ role, staffId }: UsePaymentsOptions): UsePaymentsReturn {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [staffSummary, setStaffSummary] = useState<StaffSummaryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const headers = (token: string) => ({ Authorization: `Bearer ${token}` });

  const fetchPayments = useCallback(
    async (token: string) => {
      setIsLoading(true);
      setError(null);
      try {
        let endpoint = '/api/payments';
        if (role === 'admin') endpoint = '/api/admin/payments';
        else if (role === 'sales') endpoint = '/api/sales/payments';
        if (staffId) endpoint = `/api/admin/payments/staff/${staffId}`;

        const res = await api.get(endpoint, { headers: headers(token) });
        setPayments(res.data || []);
      } catch (err: any) {
        console.error('Error fetching payments:', err);
        setError(err?.response?.data?.message || err?.message || 'Failed to fetch payments');
      } finally {
        setIsLoading(false);
      }
    },
    [role, staffId]
  );

  const fetchStaffSummary = useCallback(async (token: string) => {
    try {
      const res = await api.get('/api/admin/payments/staff-summary', {
        headers: headers(token),
      });
      setStaffSummary(res.data || []);
    } catch (err: any) {
      console.error('Error fetching staff summary:', err);
    }
  }, []);

  const approvePayment = useCallback(
    async (id: string, token: string): Promise<boolean> => {
      try {
        await api.put(
          `/api/admin/payments/${id}/approve`,
          {},
          { headers: headers(token) }
        );
        // Refresh payments after approval
        await fetchPayments(token);
        return true;
      } catch (err: any) {
        console.error('Error approving payment:', err);
        return false;
      }
    },
    [fetchPayments]
  );

  const rejectPayment = useCallback(
    async (id: string, reason: string, token: string): Promise<boolean> => {
      try {
        await api.put(
          `/api/admin/payments/${id}/reject`,
          { rejection_reason: reason },
          { headers: headers(token) }
        );
        await fetchPayments(token);
        return true;
      } catch (err: any) {
        console.error('Error rejecting payment:', err);
        return false;
      }
    },
    [fetchPayments]
  );

  return {
    payments,
    staffSummary,
    isLoading,
    error,
    fetchPayments,
    fetchStaffSummary,
    approvePayment,
    rejectPayment,
  };
}
