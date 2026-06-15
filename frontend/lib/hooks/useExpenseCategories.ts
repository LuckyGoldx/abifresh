'use client';

import { useState, useCallback, useEffect } from 'react';
import api from '@/lib/api';
import { useToast } from '@/context/ToastContext';

export interface ExpenseCategory {
  id: string;
  name: string;
  is_built_in: boolean;
}

interface UseExpenseCategoriesOptions {
  fallbackCategories: string[];
}

interface UseExpenseCategoriesReturn {
  categories: ExpenseCategory[];
  addCategory: (name: string) => Promise<boolean>;
  renameCategory: (id: string, newName: string) => Promise<boolean>;
  refreshCategories: () => Promise<void>;
}

export function useExpenseCategories({ fallbackCategories }: UseExpenseCategoriesOptions): UseExpenseCategoriesReturn {
  const { addToast } = useToast();
  const [categories, setCategories] = useState<ExpenseCategory[]>(
    fallbackCategories.map((name, i) => ({ id: `fallback-${i}`, name, is_built_in: true }))
  );

  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get('/api/expense-categories');
      if (res.data && res.data.length > 0) {
        setCategories(res.data);
      }
    } catch (e) {
      console.warn('Failed to fetch expense categories, using fallback', e);
    }
  }, []);

  const addCategory = useCallback(async (name: string): Promise<boolean> => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    const existing = categories.find(c => c.name === trimmed);
    if (existing) return false;
    try {
      await api.post('/api/expense-categories', { name: trimmed });
      await fetchCategories();
      return true;
    } catch (err: any) {
      addToast(err?.response?.data?.error || 'Failed to add category', 'error');
      return false;
    }
  }, [categories, fetchCategories, addToast]);

  const renameCategory = useCallback(async (id: string, newName: string): Promise<boolean> => {
    const trimmed = newName.trim();
    if (!trimmed) return false;
    try {
      await api.put(`/api/expense-categories/${id}`, { name: trimmed });
      await fetchCategories();
      return true;
    } catch (err: any) {
      addToast(err?.response?.data?.error || 'Failed to rename category', 'error');
      return false;
    }
  }, [fetchCategories, addToast]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return { categories, addCategory, renameCategory, refreshCategories: fetchCategories };
}
