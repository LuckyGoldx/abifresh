'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Wallet, Plus, Calendar, TrendingDown, Eye, Loader2 } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import type { Expense } from '@/types';
import { useAuthStore } from '@/store/auth';

const FALLBACK_CATEGORIES = [
  'Transport', 'Supplies', 'Food & Refreshments', 'Utilities', 'Maintenance', 'Communication', 'Fuel', 'Other',
];

interface ExpenseCategory {
  id: string;
  name: string;
  is_built_in: boolean;
}

export default function ExpensesPage() {
  const { addToast } = useToast();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<ExpenseCategory[]>(
    FALLBACK_CATEGORIES.map((name, i) => ({ id: `fallback-${i}`, name, is_built_in: true }))
  );
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customInputValue, setCustomInputValue] = useState('');

  // Modal States
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  useEffect(() => {
    fetchExpenses();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/api/expense-categories');
      if (res.data && res.data.length > 0) {
        setCategories(res.data);
      }
    } catch (e) {
      console.warn('Failed to fetch expense categories, using fallback', e);
    }
  };

  const fetchExpenses = async () => {
    try {
      const response = await api.get('/api/staff/expenses');
      setExpenses(response.data);
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenPreview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category || !description) return;
    setShowPreviewModal(true);
  };

  const submitExpenseRequest = async () => {
    setSubmitting(true);
    try {
      await api.post('/api/staff/expenses/create', {
        amount: parseFloat(amount),
        category, // staff expenses create route expects 'category'
        description,
        expense_date: expenseDate,
      });
      setShowPreviewModal(false);
      setAmount('');
      setCategory('');
      setDescription('');
      setExpenseDate(new Date().toISOString().split('T')[0]);
      await fetchExpenses();
      addToast('✅ Expense request submitted successfully!', 'success');
    } catch (error: any) {
      addToast(error.response?.data?.error || 'Failed to submit expense request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Only approved expenses are summed up on dashboards
  const totalApprovedExpenses = expenses
    .filter((exp) => exp.status === 'approved')
    .reduce((sum, exp) => sum + exp.amount, 0);

  // Group approved expenses by category
  const expensesByCategory = expenses
    .filter((exp) => exp.status === 'approved')
    .reduce((acc, expense) => {
      const cat = expense.category || 'Other';
      if (!acc[cat]) acc[cat] = 0;
      acc[cat] += expense.amount;
      return acc;
    }, {} as Record<string, number>);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-pulse">
            <img src="/favicon.svg" alt="" className="w-20 h-20" />
          </div>
          <div className="flex items-center gap-2 text-pink-600 dark:text-pink-400">
            <div className="w-5 h-5 border-2 border-pink-600 dark:border-pink-400 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-bold">Abifreshing...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <Wallet className="w-8 h-8 text-pink-500" />
          Expense Tracking
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Submit and track all your work-related expenses
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card col-span-2 md:col-span-1 bg-gradient-to-br from-pink-500 to-purple-500 text-white shadow-lg shadow-pink-500/20">
          <p className="text-sm opacity-90 font-medium">Total Approved Expenses</p>
          <p className="text-3xl font-bold mt-1">₦{totalApprovedExpenses.toLocaleString()}</p>
          <p className="text-xs opacity-75 mt-1">
            {expenses.filter((e) => e.status === 'approved').length} approved entries
          </p>
        </div>

        {Object.entries(expensesByCategory).slice(0, 3).map(([cat, amt]) => (
          <div key={cat} className="card bg-gray-50 dark:bg-gray-800 border dark:border-gray-700/50">
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">{cat}</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">
              ₦{amt.toLocaleString()}
            </p>
          </div>
        ))}
        
        {Object.keys(expensesByCategory).length === 0 && (
          <div className="card col-span-2 md:col-span-1 bg-gray-50 dark:bg-gray-800 border dark:border-gray-700/50 flex items-center justify-center py-6 text-gray-500 text-sm italic">
            No approved category data yet
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add Expense Form */}
        <div className="lg:col-span-1">
          <div className="card sticky top-6 border dark:border-gray-700/50">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Plus className="w-6 h-6 text-pink-500" />
              Add New Expense
            </h2>
            <form onSubmit={handleOpenPreview} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Expense Date *
                </label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="input w-full cursor-pointer disabled:opacity-50"
                  required
                  disabled={submitting || showPreviewModal}
                  max={new Date().toISOString().split('T')[0]}
                  onFocus={(e) => e.currentTarget.showPicker?.()}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Amount (₦) *
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9.]/g, '');
                    const parts = value.split('.');
                    if (parts.length <= 2) {
                      setAmount(parts.length === 2 ? `${parts[0]}.${parts[1].slice(0, 2)}` : parts[0]);
                    }
                  }}
                  className="input disabled:opacity-50"
                  required
                  disabled={submitting || showPreviewModal}
                  placeholder="Enter amount"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Expense Type *
                </label>
                <select
                  value={showCustomInput ? '__add_custom__' : category}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '__add_custom__') {
                      setShowCustomInput(true);
                    } else {
                      setCategory(val);
                    }
                  }}
                  className="input disabled:opacity-50"
                  required
                  disabled={submitting || showPreviewModal}
                >
                  <option value="">Select category...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                  {isAdmin && <option value="__add_custom__">➕ Add Custom</option>}
                </select>
                {isAdmin && showCustomInput && (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="text"
                      value={customInputValue}
                      onChange={(e) => setCustomInputValue(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter') {
                          const trimmed = customInputValue.trim();
                          const names = categories.map(c => c.name);
                          if (trimmed && !names.includes(trimmed)) {
                            try {
                              await api.post('/api/expense-categories', { name: trimmed });
                              setCategory(trimmed);
                              await fetchCategories();
                            } catch (err: any) {
                              addToast(err?.response?.data?.error || 'Failed to add category', 'error');
                            }
                          }
                          setShowCustomInput(false);
                          setCustomInputValue('');
                        }
                        if (e.key === 'Escape') {
                          setShowCustomInput(false);
                          setCustomInputValue('');
                        }
                      }}
                      className="input flex-1"
                      placeholder="Type custom category..."
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        const trimmed = customInputValue.trim();
                        const names = categories.map(c => c.name);
                        if (trimmed && !names.includes(trimmed)) {
                          try {
                            await api.post('/api/expense-categories', { name: trimmed });
                            setCategory(trimmed);
                            await fetchCategories();
                          } catch (err: any) {
                            addToast(err?.response?.data?.error || 'Failed to add category', 'error');
                          }
                        }
                        setShowCustomInput(false);
                        setCustomInputValue('');
                      }}
                      className="bg-pink-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-pink-700 transition"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomInput(false);
                        setCustomInputValue('');
                      }}
                      className="text-gray-500 dark:text-gray-400 px-3 py-2 text-sm hover:text-gray-700 transition"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Description *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input disabled:opacity-50"
                  rows={3}
                  required
                  disabled={submitting || showPreviewModal}
                  placeholder="Describe the expense..."
                />
              </div>

              <button
                type="submit"
                className="btn-primary w-full disabled:opacity-50 flex items-center justify-center gap-2"
                disabled={submitting || showPreviewModal || !amount || !category || !description}
              >
                Record Expense
              </button>
            </form>
          </div>
        </div>

        {/* Expense History */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card border dark:border-gray-700/50">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Expense History</h2>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {expenses.length} total entries
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold">
                    <th className="text-left py-3 px-4">Date</th>
                    <th className="text-left py-3 px-4">Category</th>
                    <th className="text-left py-3 px-4">Description</th>
                    <th className="text-center py-3 px-4">Status</th>
                    <th className="text-right py-3 px-4">Amount</th>
                    <th className="text-center py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr
                      key={expense.id}
                      className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 text-sm whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-800 dark:text-gray-200">
                            {new Date(expense.created_at || expense.expense_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                          <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                            {new Date(expense.created_at || expense.expense_date).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true,
                            })}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 rounded text-xs font-semibold">
                          {expense.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm max-w-[150px] truncate" title={expense.description}>
                        {expense.description}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold inline-block ${
                            expense.status === 'approved'
                              ? 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400'
                              : expense.status === 'disapproved'
                              ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-400'
                          }`}
                        >
                          {expense.status ? expense.status.charAt(0).toUpperCase() + expense.status.slice(1) : 'Pending'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap font-bold text-red-600 dark:text-red-400">
                        <span className="flex items-center justify-end gap-1">
                          <TrendingDown className="w-4 h-4" />
                          ₦{expense.amount.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            setSelectedExpense(expense);
                            setShowDetailModal(true);
                          }}
                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-pink-500 dark:text-pink-400 rounded-lg transition-colors inline-flex items-center justify-center"
                          title="View Details"
                        >
                          <Eye className="w-4.5 h-4.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {expenses.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Wallet className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-700" />
                <p className="font-medium text-gray-750 dark:text-gray-300">No expenses recorded yet</p>
                <p className="text-sm mt-1 text-gray-400">Submit new ones to see them here</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 1. Stylish Preview & Confirm Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden transform transition-all duration-300 scale-100">
            <div className="p-6 space-y-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white border-b pb-3 dark:border-gray-800 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-pink-500" />
                Preview Expense Request
              </h3>

              <div className="space-y-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                <div className="grid grid-cols-3 gap-2 border-b dark:border-gray-800 pb-2">
                  <span className="font-semibold text-gray-500 dark:text-gray-400">Date</span>
                  <span className="col-span-2 font-medium">
                    {new Date(expenseDate).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 border-b dark:border-gray-800 pb-2">
                  <span className="font-semibold text-gray-500 dark:text-gray-400">Category</span>
                  <span className="col-span-2">
                    <span className="px-2.5 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 rounded-full text-xs font-semibold">
                      {category}
                    </span>
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 border-b dark:border-gray-800 pb-2">
                  <span className="font-semibold text-gray-500 dark:text-gray-400">Amount</span>
                  <span className="col-span-2 text-lg font-bold text-red-600 dark:text-red-400">
                    ₦{parseFloat(amount || '0').toLocaleString()}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="font-semibold text-gray-500 dark:text-gray-400">Description</span>
                  <span className="col-span-2 whitespace-pre-wrap break-words">{description}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitExpenseRequest}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all shadow-md shadow-pink-500/10 font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Payment'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Eye Detail Viewer Modal */}
      {showDetailModal && selectedExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden transform transition-all duration-300 scale-100">
            <div className="p-6 space-y-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white border-b pb-3 dark:border-gray-800 flex justify-between items-center">
                <span className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-pink-500" />
                  Expense Request Details
                </span>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedExpense(null);
                  }}
                  className="text-gray-400 hover:text-gray-650 dark:hover:text-gray-200 transition-colors text-lg"
                >
                  ✕
                </button>
              </h3>

              <div className="space-y-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                <div className="grid grid-cols-3 gap-2 border-b dark:border-gray-800 pb-2">
                  <span className="font-semibold text-gray-500 dark:text-gray-400">Date</span>
                  <span className="col-span-2 font-medium">
                    {new Date(selectedExpense.expense_date || selectedExpense.created_at).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 border-b dark:border-gray-800 pb-2">
                  <span className="font-semibold text-gray-500 dark:text-gray-400">Category</span>
                  <span className="col-span-2">
                    <span className="px-2.5 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 rounded-full text-xs font-semibold">
                      {selectedExpense.category}
                    </span>
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 border-b dark:border-gray-800 pb-2">
                  <span className="font-semibold text-gray-500 dark:text-gray-400">Amount</span>
                  <span className="col-span-2 text-lg font-bold text-red-650 dark:text-red-400">
                    ₦{selectedExpense.amount.toLocaleString()}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 border-b dark:border-gray-800 pb-2">
                  <span className="font-semibold text-gray-500 dark:text-gray-400">Status</span>
                  <span className="col-span-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold inline-block ${
                        selectedExpense.status === 'approved'
                          ? 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400'
                          : selectedExpense.status === 'disapproved'
                          ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-400'
                      }`}
                    >
                      {selectedExpense.status ? selectedExpense.status.charAt(0).toUpperCase() + selectedExpense.status.slice(1) : 'Pending'}
                    </span>
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 border-b dark:border-gray-800 pb-2">
                  <span className="font-semibold text-gray-500 dark:text-gray-400">Description</span>
                  <span className="col-span-2 whitespace-pre-wrap break-words">{selectedExpense.description}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="font-semibold text-gray-500 dark:text-gray-400">Admin Note</span>
                  <span className="col-span-2 italic text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-words">
                    {selectedExpense.admin_notes
                      ? selectedExpense.admin_notes
                      : selectedExpense.status === 'disapproved'
                      ? 'No reason provided by admin'
                      : 'No notes added yet'}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedExpense(null);
                  }}
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium text-sm"
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
