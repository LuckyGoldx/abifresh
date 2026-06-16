'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { 
  DollarSign, Search, Filter, BarChart3, TrendingUp, Eye, Download, X, 
  Calendar, User, FileText, Phone, MapPin, Wallet, Tag, Check, Ban, Loader2
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { AbifreshLoading } from '@/components/AbifreshLoading';
import { useAlert } from '@/context/AlertContext';

interface ExpenseItem {
  id: string;
  staff_id: string;
  staff_name: string;
  staff_email: string;
  staff_role: string;
  staff_phone?: string;
  expense_type: string;
  amount: number;
  description?: string;
  admin_notes?: string;
  expense_date: string;
  status?: string;
  created_at: string;
  updated_at: string;
}

export default function ExpensesPage() {
  const { addToast } = useToast();
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<ExpenseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expenseTypeFilter, setExpenseTypeFilter] = useState('all');
  const [staffRoleFilter, setStaffRoleFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [selectedExpense, setSelectedExpense] = useState<ExpenseItem | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [sortBy, setSortBy] = useState('expense_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Tabs state: 'recorded' (approved + admin own) vs 'submitted' (all staff submissions)
  const [activeTab, setActiveTab] = useState<'recorded' | 'submitted'>('recorded');

  // Review Modal state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewType, setReviewType] = useState<'approve' | 'reject'>('approve');
  const [reviewExpense, setReviewExpense] = useState<ExpenseItem | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const { alert: showAlert, confirm: showConfirm } = useAlert();

  useEffect(() => {
    fetchExpenses();
  }, []);

  useEffect(() => {
    filterExpenses();
  }, [expenses, searchTerm, expenseTypeFilter, staffRoleFilter, dateRange, sortBy, sortOrder, activeTab]);

  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/api/admin/expenses');
      setExpenses(response.data || []);
    } catch (error: any) {
      console.error('Failed to fetch expenses:', error?.response?.data || error?.message);
      showAlert('Failed to load expenses. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const filterExpenses = () => {
    let filtered = [...expenses];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(e =>
        e.staff_name?.toLowerCase().includes(term) ||
        e.staff_email?.toLowerCase().includes(term) ||
        e.description?.toLowerCase().includes(term)
      );
    }

    // Expense type filter
    if (expenseTypeFilter !== 'all') {
      filtered = filtered.filter(e => e.expense_type?.toLowerCase() === expenseTypeFilter.toLowerCase());
    }

    // Staff role filter
    if (staffRoleFilter !== 'all') {
      const filterRole = staffRoleFilter.toLowerCase();
      filtered = filtered.filter(e => {
        const role = e.staff_role?.toLowerCase() || '';
        
        if (filterRole === 'admin') {
          return role === 'admin' || role === 'superadmin';
        } else if (filterRole === 'commission') {
          return role === 'commission' || role === 'commission_staff';
        } else if (filterRole === 'non_commission') {
          return role === 'non_commission' || role === 'non-commission' || role === 'non_commission_staff';
        } else if (filterRole === 'sales') {
          return role === 'sales' || role === 'sales_staff';
        }
        return false;
      });
    }

    // Date range filter
    if (dateRange.from) {
      const fromDate = new Date(dateRange.from);
      filtered = filtered.filter(e => new Date(e.expense_date) >= fromDate);
    }
    if (dateRange.to) {
      const toDate = new Date(dateRange.to);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(e => new Date(e.expense_date) <= toDate);
    }

    // Sorting
    filtered.sort((a, b) => {
      let aVal: any = a[sortBy as keyof ExpenseItem];
      let bVal: any = b[sortBy as keyof ExpenseItem];

      if (sortBy === 'amount') {
        const amountA = parseFloat(aVal?.toString() || '0');
        const amountB = parseFloat(bVal?.toString() || '0');
        if (amountA === amountB) {
          // Stable tie-break by newest created_at first
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        return sortOrder === 'asc' ? amountA - amountB : amountB - amountA;
      } 
      
      if (sortBy === 'expense_date') {
        const timeA = new Date(a.created_at || a.expense_date).getTime();
        const timeB = new Date(b.created_at || b.expense_date).getTime();
        if (timeA === timeB) {
          // Stable tie-break by newest created_at first
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      }

      if (sortBy === 'created_at') {
        const timeA = new Date(aVal).getTime();
        const timeB = new Date(bVal).getTime();
        return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      }

      if (aVal === bVal) {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return sortOrder === 'asc' 
        ? String(aVal).localeCompare(String(bVal)) 
        : String(bVal).localeCompare(String(aVal));
    });

    setFilteredExpenses(filtered);
    setCurrentPage(1);
  };

  const getExpenseTypeColor = (type: string) => {
    const lowerType = type?.toLowerCase() || '';
    
    if (lowerType === 'rent') return 'bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-400';
    if (lowerType === 'vehicle license renewal') return 'bg-orange-100 dark:bg-orange-950/40 text-orange-800 dark:text-orange-400';
    if (lowerType === 'local government levy') return 'bg-pink-100 dark:bg-pink-950/40 text-pink-800 dark:text-pink-400';
    if (lowerType === 'vehicle maintenance') return 'bg-yellow-100 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-400';
    if (lowerType === 'transport') return 'bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-400';
    if (lowerType === 'supplies' || lowerType === 'materials') return 'bg-purple-100 dark:bg-purple-950/40 text-purple-800 dark:text-purple-400';
    if (lowerType === 'food & refreshments' || lowerType === 'meal' || lowerType === 'food') return 'bg-yellow-100 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-400';
    if (lowerType === 'utilities') return 'bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-400';
    if (lowerType === 'maintenance') return 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-400';
    if (lowerType === 'communication') return 'bg-cyan-100 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-400';
    if (lowerType === 'fuel') return 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400';
    return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300';
  };

  const getRoleColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin':
      case 'superadmin':
        return 'bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-400';
      case 'commission':
      case 'commission_staff':
        return 'bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-400';
      case 'non_commission':
      case 'non-commission':
      case 'non_commission_staff':
        return 'bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-400';
      case 'sales':
      case 'sales_staff':
        return 'bg-orange-100 dark:bg-orange-950/40 text-orange-800 dark:text-orange-400';
      default:
        return 'bg-gray-100 dark:bg-gray-850 text-gray-800 dark:text-gray-300';
    }
  };

  // Helper to determine if an expense is admin's own or pre-approved
  const isApprovedOrAdminOwn = (e: ExpenseItem) => {
    const role = e.staff_role?.toLowerCase();
    return e.status === 'approved' || role === 'admin' || role === 'superadmin';
  };

  // 1. Approved Expenses: status is strictly 'approved' and NOT recorded by admin/superadmin
  const approvedList = expenses.filter(e => e.status === 'approved' && e.staff_role?.toLowerCase() !== 'admin' && e.staff_role?.toLowerCase() !== 'superadmin');

  // 2. Pending Expenses: status is strictly 'pending' and NOT recorded by admin/superadmin
  const pendingList = expenses.filter(e => e.status === 'pending' && e.staff_role?.toLowerCase() !== 'admin' && e.staff_role?.toLowerCase() !== 'superadmin');

  // 3. Rejected/Disapproved Expenses: status is strictly 'disapproved' and NOT recorded by admin/superadmin
  const rejectedList = expenses.filter(e => e.status === 'disapproved' && e.staff_role?.toLowerCase() !== 'admin' && e.staff_role?.toLowerCase() !== 'superadmin');

  // For tab item counts
  const recordedExpenses = expenses.filter(isApprovedOrAdminOwn);
  const submittedExpenses = expenses.filter(e => {
    const role = e.staff_role?.toLowerCase();
    return role !== 'admin' && role !== 'superadmin';
  });

  // Recorded ledger tab computed stats
  const totalRecordedCount = recordedExpenses.length;
  const totalRecordedAmount = recordedExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  const recordedExpenseTypesList = Array.from(
    new Set(recordedExpenses.map(e => e.expense_type).filter(Boolean))
  ).sort();

  const recordedCategoryStats = recordedExpenseTypesList.map(type => {
    const categoryExpenses = recordedExpenses.filter(e => e.expense_type?.toLowerCase() === type.toLowerCase());
    return {
      type,
      count: categoryExpenses.length,
      total: categoryExpenses.reduce((sum, e) => sum + (e.amount || 0), 0),
    };
  }).filter(stat => stat.count > 0);

  const getAdminExpenses = () => recordedExpenses.filter(e => e.staff_role?.toLowerCase() === 'admin' || e.staff_role?.toLowerCase() === 'superadmin');
  const getCommissionExpenses = () => recordedExpenses.filter(e => {
    const role = e.staff_role?.toLowerCase() || '';
    return role === 'commission' || role === 'commission_staff';
  });
  const getNonCommissionExpenses = () => recordedExpenses.filter(e => {
    const role = e.staff_role?.toLowerCase() || '';
    return role === 'non_commission' || role === 'non-commission' || role === 'non_commission_staff';
  });
  const getSalesExpenses = () => recordedExpenses.filter(e => {
    const role = e.staff_role?.toLowerCase() || '';
    return role === 'sales' || role === 'sales_staff';
  });

  const recordedRoleStats = {
    admin: getAdminExpenses().length,
    admin_amount: getAdminExpenses().reduce((sum, e) => sum + (e.amount || 0), 0),
    commission: getCommissionExpenses().length,
    commission_amount: getCommissionExpenses().reduce((sum, e) => sum + (e.amount || 0), 0),
    non_commission: getNonCommissionExpenses().length,
    non_commission_amount: getNonCommissionExpenses().reduce((sum, e) => sum + (e.amount || 0), 0),
    sales: getSalesExpenses().length,
    sales_amount: getSalesExpenses().reduce((sum, e) => sum + (e.amount || 0), 0),
  };

  // Partition the FILTERED expenses based on active tab
  const activeTabExpenses = filteredExpenses.filter(e => {
    if (activeTab === 'recorded') {
      return isApprovedOrAdminOwn(e);
    } else {
      // Submitted expenses shows all staff-submitted expenses (pending, approved, disapproved)
      const role = e.staff_role?.toLowerCase();
      return role !== 'admin' && role !== 'superadmin';
    }
  });

  const getExpensesByCategory = (category: string) => {
    return expenses.filter(e => e.expense_type?.toLowerCase() === category.toLowerCase());
  };

  // Calculate unique actual expense categories
  const expenseTypesList = Array.from(
    new Set(expenses.map(e => e.expense_type).filter(Boolean))
  ).sort();

  // Action Triggers for Admin
  const openApproveModal = (expense: ExpenseItem) => {
    setReviewExpense(expense);
    setReviewType('approve');
    setReviewNotes('');
    setShowReviewModal(true);
  };

  const openRejectModal = (expense: ExpenseItem) => {
    setReviewExpense(expense);
    setReviewType('reject');
    setReviewNotes('');
    setShowReviewModal(true);
  };

  const handleReviewSubmit = async () => {
    if (!reviewExpense) return;

    if (reviewType === 'reject' && !reviewNotes.trim()) {
      addToast('⚠️ Rejection reason is strictly required.', 'warning');
      return;
    }

    setSubmittingReview(true);
    try {
      if (reviewType === 'approve') {
        await api.post(`/api/admin/expenses/${reviewExpense.id}/approve`, {
          notes: reviewNotes,
        });
        addToast('✅ Expense request approved successfully!', 'success');
      } else {
        await api.post(`/api/admin/expenses/${reviewExpense.id}/reject`, {
          reason: reviewNotes,
        });
        addToast('❌ Expense request disapproved successfully!', 'error');
      }
      setShowReviewModal(false);
      setReviewExpense(null);
      setReviewNotes('');
      fetchExpenses(); // Reload data
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to update expense status', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  const pageItems = activeTabExpenses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (isLoading) return <AbifreshLoading />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Wallet className="w-8 h-8 text-blue-500" />
            Expense Review & Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track, audit, and approve/disapprove all business and staff expenses
          </p>
        </div>
        <button
          onClick={fetchExpenses}
          className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-755 transition shadow-lg shadow-blue-500/20 font-medium"
        >
          Refresh Data
        </button>
      </div>

      {/* Dynamic Statistics Dashboard based on Active Tab */}
      {activeTab === 'recorded' ? (
        <div className="space-y-6">
          {/* Dynamic Category Cards */}
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Card */}
            <div className="card border-l-4 border-l-blue-500 bg-white dark:bg-gray-800 shadow-md overflow-hidden">
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Expenses</p>
              <p className="text-3xl font-bold text-blue-600 mt-1 break-words">{totalRecordedCount}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 break-words">
                ₦{totalRecordedAmount.toLocaleString()}
              </p>
            </div>

            {recordedCategoryStats.map((stat, index) => {
              const colors = [
                { border: 'border-l-green-500', text: 'text-green-600 dark:text-green-455' },
                { border: 'border-l-orange-500', text: 'text-orange-600 dark:text-orange-400' },
                { border: 'border-l-pink-500', text: 'text-pink-600 dark:text-pink-400' },
                { border: 'border-l-yellow-500', text: 'text-yellow-600 dark:text-yellow-400' },
                { border: 'border-l-purple-500', text: 'text-purple-600 dark:text-purple-400' },
                { border: 'border-l-cyan-500', text: 'text-cyan-600 dark:text-cyan-400' },
                { border: 'border-l-red-500', text: 'text-red-600 dark:text-red-400' },
                { border: 'border-l-indigo-500', text: 'text-indigo-600 dark:text-indigo-400' },
                { border: 'border-l-amber-500', text: 'text-amber-600 dark:text-amber-400' },
                { border: 'border-l-teal-500', text: 'text-teal-600 dark:text-teal-400' },
                { border: 'border-l-violet-500', text: 'text-violet-600 dark:text-violet-400' },
                { border: 'border-l-rose-500', text: 'text-rose-600 dark:text-rose-400' },
                { border: 'border-l-sky-500', text: 'text-sky-600 dark:text-sky-400' },
              ];
              const color = colors[index % colors.length];
              
              return (
                <div key={stat.type} className={`card border-l-4 ${color.border} bg-white dark:bg-gray-800 shadow-md overflow-hidden`}>
                  <p className="text-gray-600 dark:text-gray-400 text-sm font-medium truncate">{stat.type}</p>
                  <p className={`text-3xl font-bold ${color.text} mt-1 break-words`}>₦{stat.total.toLocaleString()}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {stat.count} {stat.count === 1 ? 'entry' : 'entries'}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Staff Role Breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {recordedRoleStats.admin > 0 && (
              <div className="card border-l-4 border-l-red-500 bg-white dark:bg-gray-800 shadow-md overflow-hidden">
                <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Admin Expenses</p>
                <p className="text-2xl font-bold text-red-650 mt-1 break-words">{recordedRoleStats.admin}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 break-words">
                  ₦{recordedRoleStats.admin_amount.toLocaleString()}
                </p>
              </div>
            )}
            <div className="card border-l-4 border-l-green-500 bg-white dark:bg-gray-800 shadow-md overflow-hidden">
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Commission Staff</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-455 mt-1 break-words">{recordedRoleStats.commission}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 break-words">
                ₦{recordedRoleStats.commission_amount.toLocaleString()}
              </p>
            </div>
            <div className="card border-l-4 border-l-blue-500 bg-white dark:bg-gray-800 shadow-md overflow-hidden">
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Non-Commission Staff</p>
              <p className="text-2xl font-bold text-blue-600 mt-1 break-words">{recordedRoleStats.non_commission}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 break-words">
                ₦{recordedRoleStats.non_commission_amount.toLocaleString()}
              </p>
            </div>
            <div className="card border-l-4 border-l-orange-500 bg-white dark:bg-gray-800 shadow-md overflow-hidden">
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Sales Staff</p>
              <p className="text-2xl font-bold text-orange-600 mt-1 break-words">{recordedRoleStats.sales}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 break-words">
                ₦{recordedRoleStats.sales_amount.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Approved Card */}
          <div className="card bg-white dark:bg-gray-800 border-l-4 border-l-green-500 shadow-md overflow-hidden">
            <p className="text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase tracking-wider">Approved Expenses</p>
            <div className="flex justify-between items-baseline mt-2 gap-2">
              <p className="text-3xl font-bold text-green-600 dark:text-green-400 break-words">
                ₦{approvedList.reduce((sum, e) => sum + (e.amount || 0), 0).toLocaleString()}
              </p>
              <span className="text-sm font-medium bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-300 px-2 py-0.5 rounded-full flex-shrink-0">
                {approvedList.length} items
              </span>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Realized ledger transactions</p>
          </div>

          {/* Pending Card */}
          <div className="card bg-white dark:bg-gray-800 border-l-4 border-l-yellow-500 shadow-md overflow-hidden">
            <p className="text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase tracking-wider">Pending Approvals</p>
            <div className="flex justify-between items-baseline mt-2 gap-2">
              <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 break-words">
                ₦{pendingList.reduce((sum, e) => sum + (e.amount || 0), 0).toLocaleString()}
              </p>
              <span className="text-sm font-medium bg-yellow-100 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-300 px-2 py-0.5 rounded-full flex-shrink-0">
                {pendingList.length} items
              </span>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Awaiting administrative action</p>
          </div>

          {/* Rejected Card */}
          <div className="card bg-white dark:bg-gray-800 border-l-4 border-l-red-500 shadow-md overflow-hidden">
            <p className="text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase tracking-wider">Rejected Expenses</p>
            <div className="flex justify-between items-baseline mt-2 gap-2">
              <p className="text-3xl font-bold text-red-650 dark:text-red-400 break-words">
                ₦{rejectedList.reduce((sum, e) => sum + (e.amount || 0), 0).toLocaleString()}
              </p>
              <span className="text-sm font-medium bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-300 px-2 py-0.5 rounded-full flex-shrink-0">
                {rejectedList.length} items
              </span>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Disapproved staff claims</p>
          </div>
        </div>
      )}

      {/* Tabs Switcher */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex p-1.5 bg-gray-100/80 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl gap-1 border border-gray-200/50 dark:border-gray-700/40 shadow-sm">
          <button
            onClick={() => setActiveTab('recorded')}
            className={`py-2 px-5 text-sm font-semibold rounded-lg transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'recorded'
                ? 'bg-pink-600 text-white shadow-md shadow-pink-500/25'
                : 'text-gray-500 hover:text-pink-600 dark:text-gray-400 dark:hover:text-pink-400'
            }`}
          >
            <Wallet className={`w-4 h-4 transition-colors ${activeTab === 'recorded' ? 'text-white' : 'text-gray-400 dark:text-gray-500'}`} />
            <span>Recorded Ledger</span>
            <span className={`text-xs px-2 py-0.5 rounded-md font-medium transition-colors ${
              activeTab === 'recorded' 
                ? 'bg-white/20 text-white font-semibold' 
                : 'bg-gray-200/50 dark:bg-gray-700/30 text-gray-500 dark:text-gray-400'
            }`}>
              {recordedExpenses.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('submitted')}
            className={`py-2 px-5 text-sm font-semibold rounded-lg transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'submitted'
                ? 'bg-pink-600 text-white shadow-md shadow-pink-500/25'
                : 'text-gray-500 hover:text-pink-600 dark:text-gray-400 dark:hover:text-pink-400'
            }`}
          >
            <User className={`w-4 h-4 transition-colors ${activeTab === 'submitted' ? 'text-white' : 'text-gray-400 dark:text-gray-500'}`} />
            <span>Staff Submissions</span>
            <span className={`text-xs px-2 py-0.5 rounded-md font-medium transition-colors ${
              activeTab === 'submitted' 
                ? 'bg-white/20 text-white font-semibold' 
                : 'bg-gray-200/50 dark:bg-gray-700/30 text-gray-500 dark:text-gray-400'
            }`}>
              {submittedExpenses.length}
            </span>
            {pendingList.length > 0 && (
              <span className={`ml-1 min-w-[20px] h-5 px-1.5 flex items-center justify-center text-[10px] sm:text-[11px] font-bold rounded-full animate-pulse shadow-sm ${
                activeTab === 'submitted'
                  ? 'bg-amber-400 text-amber-950 shadow-amber-400/25'
                  : 'bg-amber-500 dark:bg-amber-600 text-white shadow-amber-500/25'
              }`}>
                {pendingList.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filters Card */}
      <div className="card border dark:border-gray-700/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
            <Filter className="w-5 h-5 text-blue-500" />
            Filter active results
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search staff, notes, description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Expense Type Filter */}
          <select
            value={expenseTypeFilter}
            onChange={(e) => setExpenseTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Expense Categories ({expenseTypesList.length})</option>
            {expenseTypesList.map(type => (
              <option key={type} value={type}>{type} ({getExpensesByCategory(type).length})</option>
            ))}
          </select>

          {/* Staff Role Filter */}
          <select
            value={staffRoleFilter}
            onChange={(e) => setStaffRoleFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Staff Roles</option>
            <option value="admin">Admin / Superadmin</option>
            <option value="commission">Commission Staff</option>
            <option value="non_commission">Non-Commission Staff</option>
            <option value="sales">Sales Staff</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          >
            <option value="expense_date">Date</option>
            <option value="amount">Amount</option>
            <option value="staff_name">Staff Name</option>
          </select>

          {/* Sort Order */}
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600 transition"
          >
            {sortOrder === 'desc' ? '↓ Newest First' : '↑ Oldest First'}
          </button>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400">From Date</label>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400">To Date</label>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Showing {Math.min((currentPage - 1) * itemsPerPage + 1, activeTabExpenses.length)}-{Math.min(currentPage * itemsPerPage, activeTabExpenses.length)} of {activeTabExpenses.length} filtered items
        </div>
      </div>

      {/* Expenses Table */}
      <div className="card border dark:border-gray-700/50">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-500" />
          {activeTab === 'recorded' ? 'Recorded Expenses Ledger' : 'Submitted Staff Expenses'}
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-850/50 text-gray-700 dark:text-gray-300 text-sm font-semibold">
                <th className="text-left py-3 px-4">Staff Information</th>
                <th className="text-left py-3 px-4">Category / Type</th>
                <th className="text-left py-3 px-4">Date</th>
                <th className="text-left py-3 px-4">Description</th>
                <th className="text-center py-3 px-4">Status</th>
                <th className="text-right py-3 px-4">Amount</th>
                <th className="text-center py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((expense) => (
                <tr key={expense.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{expense.staff_name || 'N/A'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{expense.staff_email || 'N/A'}</p>
                      <span className={`text-[10px] uppercase font-extrabold px-2 py-0.5 ${getRoleColor(expense.staff_role)} rounded-full`}>
                        {expense.staff_role ? expense.staff_role.replace('_', ' ') : 'Unknown'}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2.5 py-1 ${getExpenseTypeColor(expense.expense_type)} rounded-full font-semibold`}>
                      {expense.expense_type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm whitespace-nowrap">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1 font-medium text-gray-800 dark:text-gray-200">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        {new Date(expense.created_at || expense.expense_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 ml-4.5 font-mono">
                        {new Date(expense.created_at || expense.expense_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate" title={expense.description}>
                    {expense.description || '-'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold inline-block ${
                        isApprovedOrAdminOwn(expense)
                          ? 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400'
                          : expense.status === 'disapproved'
                          ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-400'
                      }`}
                    >
                      {expense.status && expense.staff_role?.toLowerCase() !== 'admin' && expense.staff_role?.toLowerCase() !== 'superadmin'
                        ? expense.status.charAt(0).toUpperCase() + expense.status.slice(1)
                        : 'Approved'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap font-bold text-green-600 dark:text-green-450">
                    ₦{(expense.amount || 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex justify-center items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedExpense(expense);
                          setShowDetailsModal(true);
                        }}
                        title="View Details"
                        className="p-1.5 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg transition-colors inline-flex items-center justify-center"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Display Approve/Disapprove for Pending submissions only */}
                      {activeTab === 'submitted' && expense.status === 'pending' && (
                        <>
                          <button
                            onClick={() => openApproveModal(expense)}
                            title="Approve Request"
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all shadow-sm shadow-emerald-500/10 hover:shadow-md whitespace-nowrap"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => openRejectModal(expense)}
                            title="Disapprove Request"
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-all shadow-sm shadow-rose-500/10 hover:shadow-md whitespace-nowrap"
                          >
                            Disapprove
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {activeTabExpenses.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              <Wallet className="w-16 h-16 mx-auto mb-4 opacity-30 text-gray-400 dark:text-gray-600" />
              <p className="font-semibold text-lg text-gray-750 dark:text-gray-300">No expenses found</p>
              <p className="text-sm mt-1 text-gray-450">Try adjusting your filters or search keywords</p>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {activeTabExpenses.length > itemsPerPage && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Page {currentPage} of {Math.ceil(activeTabExpenses.length / itemsPerPage)}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Previous
              </button>
              <div className="flex items-center gap-1 flex-wrap">
                {(() => {
                  const total = Math.ceil(activeTabExpenses.length / itemsPerPage);
                  const half = 2;
                  return Array.from({ length: total }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === total || (p >= currentPage - half && p <= currentPage + half))
                    .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                      if (idx > 0) { const prev = arr[idx - 1]; if (p - prev > 1) acc.push('ellipsis'); }
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((item, idx) =>
                      item === 'ellipsis' ? (
                        <span key={`e-${idx}`} className="w-8 h-8 flex items-center justify-center text-gray-400 text-sm">...</span>
                      ) : (
                        <button key={item} onClick={() => setCurrentPage(item)}
                          className={`w-8 h-8 rounded-lg text-sm font-medium transition ${
                            currentPage === item
                              ? 'bg-blue-500 text-white'
                              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}>{item}</button>
                      )
                    );
                })()}
              </div>
              <button
                onClick={() => setCurrentPage(Math.min(Math.ceil(activeTabExpenses.length / itemsPerPage), currentPage + 1))}
                disabled={currentPage === Math.ceil(activeTabExpenses.length / itemsPerPage)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* A. Expense Details Modal */}
      {showDetailsModal && selectedExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b dark:border-gray-800 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-900 z-10">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <Wallet className="w-5 h-5 text-blue-500" />
                Expense Request details
              </h2>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedExpense(null);
                }}
                className="text-gray-400 hover:text-gray-650 dark:hover:text-gray-200 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Staff Information Section */}
              <div className="border-b dark:border-gray-805 pb-4">
                <h3 className="text-md font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                  <User className="w-4.5 h-4.5 text-blue-500" />
                  Staff Information
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Staff Name</p>
                    <p className="font-semibold text-gray-800 dark:text-white">{selectedExpense.staff_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Phone Number</p>
                    <p className="font-semibold text-gray-850 dark:text-white flex items-center gap-1.5">
                      <Phone className="w-4 h-4 text-gray-400" />
                      {selectedExpense.staff_phone || 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Email Address</p>
                    <p className="font-semibold text-gray-800 dark:text-white">{selectedExpense.staff_email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Assigned Role</p>
                    <span className={`inline-block font-bold text-xs uppercase px-2.5 py-0.5 rounded-full mt-1 ${getRoleColor(selectedExpense.staff_role)}`}>
                      {selectedExpense.staff_role ? selectedExpense.staff_role.replace('_', ' ') : 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Expense Information Section */}
              <div className="border-b dark:border-gray-805 pb-4">
                <h3 className="text-md font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                  <Wallet className="w-4.5 h-4.5 text-blue-500" />
                  Expense Details
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Amount claimed</p>
                    <p className="font-bold text-2xl text-green-600 dark:text-green-450">₦{(selectedExpense.amount || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Category Type</p>
                    <span className={`inline-block font-semibold px-2.5 py-0.5 rounded-full text-xs mt-1.5 ${getExpenseTypeColor(selectedExpense.expense_type)}`}>
                      {selectedExpense.expense_type}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Transaction Date</p>
                    <p className="font-semibold text-gray-800 dark:text-white flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {new Date(selectedExpense.expense_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Submission Date</p>
                    <p className="font-semibold text-gray-800 dark:text-white">
                      {new Date(selectedExpense.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Workflow Approval Status</p>
                    <span className={`inline-block font-bold text-xs px-2.5 py-0.5 rounded-full mt-1.5 ${
                      isApprovedOrAdminOwn(selectedExpense)
                        ? 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400'
                        : selectedExpense.status === 'disapproved'
                        ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-400'
                    }`}>
                      {selectedExpense.status && selectedExpense.staff_role?.toLowerCase() !== 'admin' && selectedExpense.staff_role?.toLowerCase() !== 'superadmin'
                        ? selectedExpense.status.toUpperCase()
                        : 'APPROVED'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description Section */}
              {selectedExpense.description && (
                <div className="border-b dark:border-gray-805 pb-4">
                  <h3 className="text-md font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                    <FileText className="w-4.5 h-4.5 text-blue-500" />
                    Staff Description
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">{selectedExpense.description}</p>
                </div>
              )}

              {/* Admin Note Section */}
              <div className="pb-4">
                <h3 className="text-md font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                  <Tag className="w-4.5 h-4.5 text-blue-500" />
                  Administrative Review & Notes
                </h3>
                <p className="text-gray-700 dark:text-gray-350 text-sm italic whitespace-pre-wrap leading-relaxed">
                  {selectedExpense.admin_notes
                    ? selectedExpense.admin_notes
                    : selectedExpense.status === 'disapproved'
                    ? 'Disapproved. No specific reason entered by administrator.'
                    : isApprovedOrAdminOwn(selectedExpense)
                    ? 'Approved / direct ledger entry. No additional administrative notes.'
                    : 'Awaiting review notes.'}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t dark:border-gray-800 flex justify-end gap-2 sticky bottom-0 bg-white dark:bg-gray-900">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedExpense(null);
                }}
                className="px-5 py-2.5 bg-gray-150 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-205 dark:hover:bg-gray-750 transition font-medium"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* B. Admin Interactive Approve/Reject Review Notes Modal */}
      {showReviewModal && reviewExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="p-6 space-y-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white border-b pb-3 dark:border-gray-800 flex items-center gap-2">
                {reviewType === 'approve' ? (
                  <>
                    <Check className="w-5 h-5 text-green-500" />
                    Approve Expense Request
                  </>
                ) : (
                  <>
                    <Ban className="w-5 h-5 text-red-500" />
                    Disapprove Expense Request
                  </>
                )}
              </h3>

              <div className="space-y-2 py-2 text-sm text-gray-700 dark:text-gray-300">
                <p>
                  Reviewing expense request for <span className="font-bold text-gray-900 dark:text-white">{reviewExpense.staff_name}</span>.
                </p>
                <div className="bg-gray-50 dark:bg-gray-850 p-3 rounded-lg border dark:border-gray-800">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Category:</span>
                    <span className="font-semibold">{reviewExpense.expense_type}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-gray-500">Amount:</span>
                    <span className="font-bold text-green-600 dark:text-green-400">₦{reviewExpense.amount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Text Area for Review Notes */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {reviewType === 'approve' ? 'Approval Note (Optional)' : 'Disapproval Reason *'}
                </label>
                <textarea
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder={
                    reviewType === 'approve'
                      ? 'Add any additional notes for this approval...'
                      : 'Please specify the exact reason for disapproval (REQUIRED)...'
                  }
                  className={`w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    reviewType === 'reject' && !reviewNotes.trim()
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  required={reviewType === 'reject'}
                  disabled={submittingReview}
                />
                {reviewType === 'reject' && !reviewNotes.trim() && (
                  <p className="text-xs text-red-500 font-semibold">⚠️ Disapproval reason cannot be left empty.</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowReviewModal(false);
                    setReviewExpense(null);
                    setReviewNotes('');
                  }}
                  disabled={submittingReview}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReviewSubmit}
                  disabled={submittingReview || (reviewType === 'reject' && !reviewNotes.trim())}
                  className={`flex-1 px-4 py-2 rounded-lg transition-all font-medium text-sm flex items-center justify-center gap-2 ${
                    reviewType === 'approve'
                      ? 'text-white bg-green-600 hover:bg-green-700 shadow-md shadow-green-500/10 disabled:opacity-50 disabled:cursor-not-allowed'
                      : !reviewNotes.trim()
                        ? 'bg-gray-200 dark:bg-gray-850 text-gray-450 dark:text-gray-500 border border-gray-300 dark:border-gray-700 cursor-not-allowed shadow-none'
                        : 'text-white bg-red-600 hover:bg-red-700 shadow-md shadow-red-500/10'
                  }`}
                >
                  {submittingReview ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : reviewType === 'approve' ? (
                    'Approve Expense'
                  ) : (
                    'Reject Expense'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
