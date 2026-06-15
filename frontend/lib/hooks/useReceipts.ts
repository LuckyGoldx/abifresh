'use client';

import { useState, useCallback } from 'react';
import api from '@/lib/api';
import type { Receipt } from '@/types';

interface UseReceiptsOptions {
  role: 'admin' | 'sales' | 'staff' | 'superadmin';
}

interface UseReceiptsReturn {
  receipts: Receipt[];
  isLoading: boolean;
  error: string | null;
  fetchReceipts: () => Promise<void>;
}

export function useReceipts({ role }: UseReceiptsOptions): UseReceiptsReturn {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReceipts = useCallback(
    async () => {
      setIsLoading(true);
      setError(null);
      try {
        let endpoint = '/api/receipts/all';
        if (role === 'sales') endpoint = '/api/receipts';
        else if (role === 'staff') endpoint = '/api/receipts/my';

        const res = await api.get(endpoint);
        setReceipts(res.data || []);
      } catch (err: any) {
        console.error('Error fetching receipts:', err);
        setError(err?.response?.data?.message || err?.message || 'Failed to fetch receipts');
      } finally {
        setIsLoading(false);
      }
    },
    [role]
  );

  return { receipts, isLoading, error, fetchReceipts };
}
