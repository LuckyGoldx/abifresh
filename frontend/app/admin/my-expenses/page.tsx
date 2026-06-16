'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Wallet, CheckCircle } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import type { Expense } from '@/types';
import { useExpenseCategories } from '@/lib/hooks/useExpenseCategories';
import { AbifreshLoading } from '@/components/AbifreshLoading';
import Modal from '@/components/Modal';
import ExpenseForm from '@/components/expenses/ExpenseForm';
import ExpenseTable from '@/components/expenses/ExpenseTable';
import ExpenseDetailModal from '@/components/expenses/ExpenseDetailModal';
import { useAuthStore } from '@/store/auth';

const FALLBACK_CATEGORIES = ['Rent', 'Vehicle License Renewal', 'Local Government Levy', 'Vehicle Maintenance', 'Utilities', 'Others'];

export default function AdminExpensesPage() {
  const { addToast } = useToast();
  const user = useAuthStore((s) => s.user);
  const isSuperadmin = user?.role === 'superadmin';
  const { categories, addCategory, renameCategory } = useExpenseCategories({ fallbackCategories: FALLBACK_CATEGORIES });
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customInputValue, setCustomInputValue] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ amount: string; category: string } | null>(null);
  const [renamingCategory, setRenamingCategory] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const selectedCat = categories.find(c => c.name === category);

  useEffect(() => { fetchExpenses(); }, []);

  const fetchExpenses = async () => {
    try { const r = await api.get('/api/admin/my-expenses'); setExpenses(r.data); } catch { addToast('Failed to fetch expenses', 'error'); } finally { setIsLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true);
    const savedAmount = amount;
    const savedCategory = category;
    try {
      await api.post('/api/admin/expenses/create', { amount: parseFloat(amount), category, description, expense_date: expenseDate });
      await fetchExpenses(); setSuccessInfo({ amount: savedAmount, category: savedCategory }); setShowSuccessModal(true); setAmount(''); setCategory(''); setDescription('');
      setExpenseDate(new Date().toISOString().split('T')[0]);
    } catch (err: any) { addToast(err.response?.data?.error || 'Failed to record expense', 'error'); } finally { setSubmitting(false); }
  };

  const handleRename = async (): Promise<boolean> => {
    const t = renameValue.trim();
    if (t && t !== category && selectedCat) { const ok = await renameCategory(selectedCat.id, t); if (ok) setCategory(t); return ok; }
    setRenamingCategory(false); return false;
  };

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const byCategory = expenses.reduce((acc, e) => { const c = e.category || 'Other'; if (!acc[c]) acc[c] = 0; acc[c] += e.amount; return acc; }, {} as Record<string, number>);

  if (isLoading) return <AbifreshLoading />;

  return (<div className="space-y-6">
    <div><h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2"><Wallet className="w-8 h-8 text-pink-500" />My Expenses</h1><p className="text-gray-600 dark:text-gray-400 mt-1">Track all your work-related expenses</p></div>
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      <div className="card bg-gradient-to-br from-pink-500 to-purple-500 text-white overflow-hidden"><p className="text-sm opacity-90">Total Expenses</p><p className="text-3xl font-bold mt-1 break-words">₦{totalExpenses.toLocaleString()}</p><p className="text-xs opacity-75 mt-1">{expenses.length} entries</p></div>
      {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => <div key={cat} className="card bg-gray-50 dark:bg-gray-800 overflow-hidden"><p className="text-sm text-gray-600 dark:text-gray-400">{cat}</p><p className="text-2xl font-bold text-gray-800 dark:text-white break-words">₦{amt.toLocaleString()}</p></div>)}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1"><ExpenseForm amount={amount} category={category} description={description} expenseDate={expenseDate} categories={categories} submitting={submitting} showCustomInput={showCustomInput} customInputValue={customInputValue} canAddCustom={true} onAmountChange={setAmount} onCategoryChange={setCategory} onDescriptionChange={setDescription} onExpenseDateChange={setExpenseDate} onShowCustomInput={setShowCustomInput} onCustomInputValueChange={setCustomInputValue} onAddCustomCategory={addCategory} onSubmit={handleSubmit} onRenameClick={() => { setRenameValue(category); setRenamingCategory(true); }} showRenameInput={renamingCategory} renameValue={renameValue} onRenameValueChange={setRenameValue} onRenameSubmit={handleRename} onRenameCancel={() => setRenamingCategory(false)} /></div>
      <div className="lg:col-span-2"><ExpenseTable expenses={expenses} onViewExpense={(e) => { setSelectedExpense(e); setShowDetailModal(true); }} /></div>
    </div>
    <Modal isOpen={showSuccessModal} onClose={() => setShowSuccessModal(false)}>
      <div className="text-center"><div className="w-16 h-16 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" /></div><h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Expense Recorded!</h3><p className="text-sm text-gray-500 dark:text-gray-400 mb-6">₦{successInfo ? parseFloat(successInfo.amount).toLocaleString() : '0'} — {successInfo?.category || ''}</p><button onClick={() => { setShowSuccessModal(false); setSuccessInfo(null); }} className="w-full bg-pink-600 hover:bg-pink-700 text-white font-semibold py-2.5 rounded-xl transition">Done</button></div>
    </Modal>
    <ExpenseDetailModal expense={selectedExpense} onClose={() => { setShowDetailModal(false); setSelectedExpense(null); }} />
  </div>);
}
