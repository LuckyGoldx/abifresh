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
  fetchPayments: () => Promise<void>;
  fetchStaffSummary: () => Promise<void>;
  approvePayment: (id: string) => Promise<boolean>;
  rejectPayment: (id: string, reason: string) => Promise<boolean>;
}

export function usePayments({ role, staffId }: UsePaymentsOptions): UsePaymentsReturn {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [staffSummary, setStaffSummary] = useState<StaffSummaryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = useCallback(
    async () => {
      setIsLoading(true);
      setError(null);
      try {
        let endpoint = '/api/payments';
        if (role === 'admin') endpoint = '/api/admin/payments';
        else if (role === 'sales') endpoint = '/api/sales/payments';
        if (staffId) endpoint = `/api/admin/payments/staff/${staffId}`;

        const res = await api.get(endpoint);
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

  const fetchStaffSummary = useCallback(async () => {
    try {
      const res = await api.get('/api/admin/payments/staff-summary');
      setStaffSummary(res.data || []);
    } catch (err: any) {
      console.error('Error fetching staff summary:', err);
    }
  }, []);

  const approvePayment = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await api.put(
          `/api/admin/payments/${id}/approve`,
          {}
        );
        await fetchPayments();
        return true;
      } catch (err: any) {
        console.error('Error approving payment:', err);
        return false;
      }
    },
    [fetchPayments]
  );

  const rejectPayment = useCallback(
    async (id: string, reason: string): Promise<boolean> => {
      try {
        await api.put(
          `/api/admin/payments/${id}/reject`,
          { rejection_reason: reason }
        );
        await fetchPayments();
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
