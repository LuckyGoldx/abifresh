'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Wallet, Plus, Calendar, TrendingDown, CheckCircle, X } from 'lucide-react';
import type { Expense } from '@/types';
import { useAuthStore } from '@/store/auth';

const FALLBACK_CATEGORIES = [
  'Rent', 'Vehicle License Renewal', 'Local Government Levy', 'Vehicle Maintenance', 'Utilities', 'Others',
];

interface ExpenseCategory {
  id: string;
  name: string;
  is_built_in: boolean;
}

export default function AdminExpensesPage() {
  const user = useAuthStore((s) => s.user);
  const isSuperadmin = user?.role === 'superadmin';
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
  const [renamingCategory, setRenamingCategory] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const categoryNames = categories.map(c => c.name);
  const selectedCat = categories.find(c => c.name === category);
  const canRename = isSuperadmin || (selectedCat && !selectedCat.is_built_in);

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
      const response = await api.get('/api/admin/my-expenses');
      setExpenses(response.data);
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      // DEBUG LOGGING
      console.log('💰 [ADMIN MY-EXPENSES FORM] Submitting expense:');
      console.log('  amount (state):', amount, `(type: ${typeof amount})`);
      console.log('  parseFloat(amount):', parseFloat(amount));
      console.log('  category:', category);
      console.log('  expenseDate:', expenseDate);

      const parsedAmount = parseFloat(amount);
      console.log('  Final amount being sent:', parsedAmount);

      await api.post('/api/admin/expenses/create', {
        amount: parsedAmount,
        category,
        description,
        expense_date: expenseDate
      });
      await fetchExpenses();
      setShowSuccessModal(true);
      setAmount('');
      setCategory('');
      setDescription('');
      setExpenseDate(new Date().toISOString().split('T')[0]);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to record expense');
    } finally {
      setSubmitting(false);
    }
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  
  // Group expenses by category
  const expensesByCategory = expenses.reduce((acc, expense) => {
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
          My Expenses
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Track all your work-related expenses
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <div className="card bg-gradient-to-br from-pink-500 to-purple-500 text-white">
          <p className="text-sm opacity-90">Total Expenses</p>
          <p className="text-3xl font-bold mt-1">₦{totalExpenses.toLocaleString()}</p>
          <p className="text-xs opacity-75 mt-1">{expenses.length} entries</p>
        </div>

        {Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
          <div key={cat} className="card bg-gray-50 dark:bg-gray-800">
            <p className="text-sm text-gray-600 dark:text-gray-400">{cat}</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">
              ₦{amt.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add Expense Form */}
        <div className="lg:col-span-1">
          <div className="card sticky top-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Plus className="w-6 h-6 text-pink-500" />
              Add New Expense
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Expense Date *
                </label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="input w-full cursor-pointer"
                  required
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
                    // Only allow digits and one decimal point
                    const value = e.target.value.replace(/[^0-9.]/g, '');
                    // Prevent multiple decimal points
                    const parts = value.split('.');
                    if (parts.length <= 2) {
                      setAmount(parts.length === 2 ? `${parts[0]}.${parts[1].slice(0, 2)}` : parts[0]);
                    }
                  }}
                  className="input"
                  required
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
                      setRenamingCategory(false);
                    } else {
                      setCategory(val);
                    }
                  }}
                  className="input"
                  required
                >
                  <option value="">Select category...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                  <option value="__add_custom__">➕ Add Custom</option>
                </select>
                {category && !showCustomInput && canRename && (
                  <button
                    type="button"
                    onClick={() => {
                      setRenameValue(category);
                      setRenamingCategory(true);
                    }}
                    className="ml-2 text-gray-400 hover:text-pink-600 transition inline-flex items-center gap-1 text-xs mt-1"
                  >
                    ✏️ Rename
                  </button>
                )}
                {renamingCategory && (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter') {
                          const trimmed = renameValue.trim();
                          if (trimmed && trimmed !== category && selectedCat) {
                            try {
                              await api.put(`/api/expense-categories/${selectedCat.id}`, { name: trimmed });
                              setCategory(trimmed);
                              await fetchCategories();
                            } catch (err: any) {
                              alert(err?.response?.data?.error || 'Failed to rename category');
                            }
                          }
                          setRenamingCategory(false);
                        }
                        if (e.key === 'Escape') {
                          setRenamingCategory(false);
                        }
                      }}
                      className="input flex-1"
                      placeholder="Rename category..."
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        const trimmed = renameValue.trim();
                        if (trimmed && trimmed !== category && selectedCat) {
                          try {
                            await api.put(`/api/expense-categories/${selectedCat.id}`, { name: trimmed });
                            setCategory(trimmed);
                            await fetchCategories();
                          } catch (err: any) {
                            alert(err?.response?.data?.error || 'Failed to rename category');
                          }
                        }
                        setRenamingCategory(false);
                      }}
                      className="bg-pink-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-pink-700 transition"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setRenamingCategory(false)}
                      className="text-gray-500 dark:text-gray-400 px-3 py-2 text-sm hover:text-gray-700 transition"
                    >
                      Cancel
                    </button>
                  </div>
                )}
                {showCustomInput && (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="text"
                      value={customInputValue}
                      onChange={(e) => setCustomInputValue(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter') {
                          const trimmed = customInputValue.trim();
                          if (trimmed && !categoryNames.includes(trimmed)) {
                            try {
                              await api.post('/api/expense-categories', { name: trimmed });
                              setCategory(trimmed);
                              await fetchCategories();
                            } catch (err: any) {
                              alert(err?.response?.data?.error || 'Failed to add category');
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
                        if (trimmed && !categoryNames.includes(trimmed)) {
                          try {
                            await api.post('/api/expense-categories', { name: trimmed });
                            setCategory(trimmed);
                            await fetchCategories();
                          } catch (err: any) {
                            alert(err?.response?.data?.error || 'Failed to add category');
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
                  className="input"
                  rows={3}
                  required
                  placeholder="Describe the expense..."
                />
              </div>

              <button 
                type="submit" 
                className="btn-primary w-full disabled:opacity-50"
                disabled={submitting}
              >
                {submitting ? 'Recording...' : 'Record Expense'}
              </button>
            </form>
          </div>
        </div>

        {/* Expense History */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Expense History</h2>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {expenses.length} total entries
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b dark:border-gray-700">
                    <th className="text-left py-3 px-4">Date</th>
                    <th className="text-left py-3 px-4">Category</th>
                    <th className="text-left py-3 px-4">Description</th>
                    <th className="text-right py-3 px-4">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => {
                    console.log('📊 Displaying expense:', {
                      id: expense.id,
                      amount: expense.amount,
                      amountType: typeof expense.amount,
                      amountRepr: JSON.stringify(expense.amount)
                    });
                    return (
                    <tr key={expense.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="py-3 px-4 text-sm">
                        {new Date(expense.expense_date || expense.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded text-xs font-semibold">
                          {expense.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm max-w-xs truncate">
                        {expense.description}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-bold text-red-600 dark:text-red-400 flex items-center justify-end gap-1">
                          <TrendingDown className="w-4 h-4" />
                          ₦{expense.amount.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {expenses.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Wallet className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>No expenses recorded yet</p>
                <p className="text-sm mt-2">Start tracking your work expenses</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Expense Recorded!
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              ₦{parseFloat(amount).toLocaleString()} — {category}
            </p>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full bg-pink-600 hover:bg-pink-700 text-white font-semibold py-2.5 rounded-xl transition"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
