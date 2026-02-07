'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Wallet, Plus, Calendar, TrendingDown } from 'lucide-react';

interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  created_at: string;
}

const expenseCategories = [
  'Transport',
  'Supplies',
  'Food & Refreshments',
  'Utilities',
  'Maintenance',
  'Communication',
  'Fuel',
  'Other',
];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const response = await api.get('/api/sales/expenses');
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
      await api.post('/api/sales/expenses/create', {
        amount: parseFloat(amount),
        category,
        description,
        expense_date: expenseDate
      });
      alert('Expense recorded successfully!');
      setAmount('');
      setCategory('');
      setDescription('');
      setExpenseDate(new Date().toISOString().split('T')[0]);
      fetchExpenses();
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
    return <div className="text-center py-12">Loading expenses...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <Wallet className="w-8 h-8 text-pink-500" />
          Expense Tracking
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Track all your work-related expenses
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card bg-gradient-to-br from-pink-500 to-purple-500 text-white">
          <p className="text-sm opacity-90">Total Expenses</p>
          <p className="text-3xl font-bold mt-1">₦{totalExpenses.toLocaleString()}</p>
          <p className="text-xs opacity-75 mt-1">{expenses.length} entries</p>
        </div>

        {Object.entries(expensesByCategory).slice(0, 3).map(([cat, amt]) => (
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
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="input"
                  min="1"
                  step="0.01"
                  required
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Expense Type *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="input"
                  required
                >
                  <option value="">Select category...</option>
                  {expenseCategories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
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
                  {expenses.map((expense) => (
                    <tr key={expense.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="py-3 px-4 text-sm">
                        {new Date(expense.created_at).toLocaleDateString('en-US', {
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
                  ))}
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
    </div>
  );
}
