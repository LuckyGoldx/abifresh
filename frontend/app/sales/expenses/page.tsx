'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Wallet, Loader2 } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import type { Expense } from '@/types';
import { useExpenseCategories } from '@/lib/hooks/useExpenseCategories';
import { AbifreshLoading } from '@/components/AbifreshLoading';
import Modal from '@/components/Modal';
import ExpenseForm from '@/components/expenses/ExpenseForm';
import ExpenseTable from '@/components/expenses/ExpenseTable';
import ExpenseDetailModal from '@/components/expenses/ExpenseDetailModal';

const FALLBACK_CATEGORIES = ['Transport', 'Supplies', 'Food & Refreshments', 'Utilities', 'Maintenance', 'Communication', 'Fuel', 'Other'];

export default function ExpensesPage() {
  const { addToast } = useToast();
  const { categories, addCategory } = useExpenseCategories({ fallbackCategories: FALLBACK_CATEGORIES });
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customInputValue, setCustomInputValue] = useState('');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  useEffect(() => { fetchExpenses(); }, []);

  const fetchExpenses = async () => {
    try { const r = await api.get('/api/sales/expenses'); setExpenses(r.data); } catch { addToast('Failed to fetch expenses', 'error'); } finally { setIsLoading(false); }
  };

  const handleOpenPreview = (e: React.FormEvent) => { e.preventDefault(); if (!amount || !category || !description) return; setShowPreviewModal(true); };

  const submitExpenseRequest = async () => {
    setSubmitting(true);
    try {
      await api.post('/api/sales/expenses', { amount: parseFloat(amount), expense_type: category, description, expense_date: expenseDate });
      setShowPreviewModal(false); setAmount(''); setCategory(''); setDescription('');
      setExpenseDate(new Date().toISOString().split('T')[0]); await fetchExpenses();
      addToast('Expense request submitted successfully!', 'success');
    } catch (err: any) { addToast(err.response?.data?.error || 'Failed', 'error'); } finally { setSubmitting(false); }
  };

  const totalApproved = expenses.filter(e => e.status === 'approved').reduce((s, e) => s + e.amount, 0);
  const byCategory = expenses.filter(e => e.status === 'approved').reduce((acc, e) => { const c = e.category || 'Other'; if (!acc[c]) acc[c] = 0; acc[c] += e.amount; return acc; }, {} as Record<string, number>);

  if (isLoading) return <AbifreshLoading />;

  return (<div className="space-y-6">
    <div><h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2"><Wallet className="w-8 h-8 text-pink-500" />Expense Tracking</h1><p className="text-gray-600 dark:text-gray-400 mt-1">Submit and track all your work-related expenses</p></div>
    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="card col-span-2 md:col-span-1 bg-gradient-to-br from-pink-500 to-purple-500 text-white shadow-lg overflow-hidden"><p className="text-sm opacity-90 font-medium">Total Approved Expenses</p><p className="text-3xl font-bold mt-1 break-words">₦{totalApproved.toLocaleString()}</p><p className="text-xs opacity-75 mt-1">{expenses.filter(e => e.status === 'approved').length} approved entries</p></div>
      {Object.entries(byCategory).slice(0, 3).map(([cat, amt]) => <div key={cat} className="card bg-gray-50 dark:bg-gray-800 border overflow-hidden"><p className="text-sm text-gray-600 dark:text-gray-400 font-medium">{cat}</p><p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">₦{amt.toLocaleString()}</p></div>)}
      {Object.keys(byCategory).length === 0 && <div className="card col-span-2 md:col-span-1 bg-gray-50 dark:bg-gray-800 border flex items-center justify-center py-6 text-gray-500 text-sm italic">No approved category data yet</div>}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1"><ExpenseForm amount={amount} category={category} description={description} expenseDate={expenseDate} categories={categories} submitting={submitting} showCustomInput={showCustomInput} customInputValue={customInputValue} canAddCustom={true} onAmountChange={setAmount} onCategoryChange={setCategory} onDescriptionChange={setDescription} onExpenseDateChange={setExpenseDate} onShowCustomInput={setShowCustomInput} onCustomInputValueChange={setCustomInputValue} onAddCustomCategory={addCategory} onSubmit={handleOpenPreview} /></div>
      <div className="lg:col-span-2"><ExpenseTable expenses={expenses} onViewExpense={(e) => { setSelectedExpense(e); setShowDetailModal(true); }} /></div>
    </div>
    <Modal isOpen={showPreviewModal} onClose={() => setShowPreviewModal(false)} title="Preview Expense Request">
      <div className="space-y-3 py-2 text-sm text-gray-700 dark:text-gray-300">
        <div className="grid grid-cols-3 gap-2 border-b dark:border-gray-800 pb-2"><span className="font-semibold text-gray-500 dark:text-gray-400">Date</span><span className="col-span-2 font-medium">{new Date(expenseDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span></div>
        <div className="grid grid-cols-3 gap-2 border-b dark:border-gray-800 pb-2"><span className="font-semibold text-gray-500 dark:text-gray-400">Category</span><span className="col-span-2"><span className="px-2.5 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 rounded-full text-xs font-semibold">{category}</span></span></div>
        <div className="grid grid-cols-3 gap-2 border-b dark:border-gray-800 pb-2"><span className="font-semibold text-gray-500 dark:text-gray-400">Amount</span><span className="col-span-2 text-lg font-bold text-red-600 dark:text-red-400">₦{parseFloat(amount || '0').toLocaleString()}</span></div>
        <div className="grid grid-cols-3 gap-2"><span className="font-semibold text-gray-500 dark:text-gray-400">Description</span><span className="col-span-2 whitespace-pre-wrap break-words">{description}</span></div>
      </div>
      <div className="flex gap-3 pt-4 border-t dark:border-gray-800"><button onClick={() => setShowPreviewModal(false)} disabled={submitting} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 font-medium text-sm">Cancel</button><button onClick={submitExpenseRequest} disabled={submitting} className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50">{submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting...</> : 'Submit Payment'}</button></div>
    </Modal>
    <ExpenseDetailModal expense={selectedExpense} onClose={() => { setShowDetailModal(false); setSelectedExpense(null); }} />
  </div>);
}
