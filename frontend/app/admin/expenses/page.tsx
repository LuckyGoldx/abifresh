'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { 
  DollarSign, Search, Filter, BarChart3, TrendingUp, Eye, Download, X, 
  Calendar, User, FileText, Phone, MapPin, Wallet, Tag
} from 'lucide-react';

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
  expense_date: string;
  status?: string;
  created_at: string;
  updated_at: string;
}

export default function ExpensesPage() {
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

  useEffect(() => {
    fetchExpenses();
  }, []);

  useEffect(() => {
    filterExpenses();
  }, [expenses, searchTerm, expenseTypeFilter, staffRoleFilter, dateRange, sortBy, sortOrder]);

  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      // Fetch all expenses (already enriched with staff details from backend)
      const response = await api.get('/api/admin/expenses');
      console.log('✅ Fetched all expenses:', response.data);
      
      if (response.data && response.data.length > 0) {
        console.log('📊 First expense data:', response.data[0]);
        console.log('📊 Staff name:', response.data[0].staff_name);
        console.log('📊 Staff email:', response.data[0].staff_email);
        console.log('📊 Staff role:', response.data[0].staff_role);
      }
      
      setExpenses(response.data);
    } catch (error: any) {
      console.error('Failed to fetch expenses:', error?.response?.data || error?.message);
      // Show user-friendly error
      alert('Failed to load expenses. Please try again.');
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
        
        if (filterRole === 'commission') {
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
        aVal = parseFloat(aVal?.toString() || '0');
        bVal = parseFloat(bVal?.toString() || '0');
      } else if (sortBy === 'expense_date' || sortBy === 'created_at') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    setFilteredExpenses(filtered);
    setCurrentPage(1);
  };

  const getExpenseTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'travel':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
      case 'meal':
      case 'food':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
      case 'supplies':
      case 'materials':
        return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200';
      case 'accommodation':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
      case 'utilities':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
      case 'other':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
      default:
        return 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
      case 'commission':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
      case 'non_commission':
      case 'non-commission':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
      case 'sales':
      case 'sales_staff':
        return 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  };

  // Calculate statistics
  const getCommissionExpenses = () => expenses.filter(e => {
    const role = e.staff_role?.toLowerCase() || '';
    return role === 'commission' || role === 'commission_staff';
  });
  
  const getNonCommissionExpenses = () => expenses.filter(e => {
    const role = e.staff_role?.toLowerCase() || '';
    return role === 'non_commission' || role === 'non-commission' || role === 'non_commission_staff';
  });
  
  const getSalesExpenses = () => expenses.filter(e => {
    const role = e.staff_role?.toLowerCase() || '';
    return role === 'sales' || role === 'sales_staff';
  });

  const stats = {
    total: expenses.length,
    totalAmount: expenses.reduce((sum, e) => sum + (e.amount || 0), 0),
    byRole: {
      commission: getCommissionExpenses().length,
      commission_amount: getCommissionExpenses().reduce((sum, e) => sum + (e.amount || 0), 0),
      non_commission: getNonCommissionExpenses().length,
      non_commission_amount: getNonCommissionExpenses().reduce((sum, e) => sum + (e.amount || 0), 0),
      sales: getSalesExpenses().length,
      sales_amount: getSalesExpenses().reduce((sum, e) => sum + (e.amount || 0), 0),
    },
    byType: {
      travel: expenses.filter(e => e.expense_type?.toLowerCase() === 'travel').reduce((sum, e) => sum + e.amount, 0),
      meal: expenses.filter(e => e.expense_type?.toLowerCase().includes('meal') || e.expense_type?.toLowerCase().includes('food')).reduce((sum, e) => sum + e.amount, 0),
      supplies: expenses.filter(e => e.expense_type?.toLowerCase().includes('supplies') || e.expense_type?.toLowerCase().includes('materials')).reduce((sum, e) => sum + e.amount, 0),
    }
  };

  const expenseTypes = Array.from(
    new Set(expenses.map(e => e.expense_type).filter(Boolean))
  ).sort();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <Wallet className="w-8 h-8 text-blue-500" />
          Comprehensive Expense Management
        </h1>
        <button
          onClick={fetchExpenses}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
        >
          Refresh
        </button>
      </div>

      {/* Statistics Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card border-l-4 border-l-blue-500">
          <p className="text-gray-600 dark:text-gray-400 text-sm">Total Expenses</p>
          <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            ₦{stats.totalAmount.toLocaleString()}
          </p>
        </div>

        <div className="card border-l-4 border-l-green-500">
          <p className="text-gray-600 dark:text-gray-400 text-sm">Travel Expenses</p>
          <p className="text-3xl font-bold text-green-600">₦{stats.byType.travel.toLocaleString()}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {expenses.filter(e => e.expense_type?.toLowerCase() === 'travel').length} entries
          </p>
        </div>

        <div className="card border-l-4 border-l-yellow-500">
          <p className="text-gray-600 dark:text-gray-400 text-sm">Meal & Food Expenses</p>
          <p className="text-3xl font-bold text-yellow-600">₦{stats.byType.meal.toLocaleString()}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {expenses.filter(e => e.expense_type?.toLowerCase().includes('meal') || e.expense_type?.toLowerCase().includes('food')).length} entries
          </p>
        </div>

        <div className="card border-l-4 border-l-purple-500">
          <p className="text-gray-600 dark:text-gray-400 text-sm">Supplies & Materials</p>
          <p className="text-3xl font-bold text-purple-600">₦{stats.byType.supplies.toLocaleString()}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {expenses.filter(e => e.expense_type?.toLowerCase().includes('supplies') || e.expense_type?.toLowerCase().includes('materials')).length} entries
          </p>
        </div>
      </div>

      {/* Staff Role Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="card border-l-4 border-l-green-500">
          <p className="text-gray-600 dark:text-gray-400 text-sm">Commission Staff</p>
          <p className="text-2xl font-bold text-green-600">{stats.byRole.commission}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            ₦{stats.byRole.commission_amount.toLocaleString()}
          </p>
        </div>
        <div className="card border-l-4 border-l-blue-500">
          <p className="text-gray-600 dark:text-gray-400 text-sm">Non-Commission Staff</p>
          <p className="text-2xl font-bold text-blue-600">{stats.byRole.non_commission}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            ₦{stats.byRole.non_commission_amount.toLocaleString()}
          </p>
        </div>
        <div className="card border-l-4 border-l-orange-500">
          <p className="text-gray-600 dark:text-gray-400 text-sm">Sales Staff</p>
          <p className="text-2xl font-bold text-orange-600">{stats.byRole.sales}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            ₦{stats.byRole.sales_amount.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
            <Filter className="w-5 h-5 text-blue-500" />
            Filters & Search
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search staff or description..."
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
            <option value="all">All Types</option>
            {expenseTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          {/* Staff Role Filter */}
          <select
            value={staffRoleFilter}
            onChange={(e) => setStaffRoleFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Staff Roles</option>
            <option value="admin">Admin</option>
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
            {sortOrder === 'desc' ? '↓ Newest' : '↑ Oldest'}
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
          Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredExpenses.length)}-{Math.min(currentPage * itemsPerPage, filteredExpenses.length)} of {filteredExpenses.length} expenses
        </div>
      </div>

      {/* Expenses Table */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-500" />
          All Expenses Detail
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <th className="text-left py-3 px-4 text-sm font-semibold">Staff Information</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Amount</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Type</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Date</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Description</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map((expense) => (
                <tr key={expense.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{expense.staff_name || 'N/A'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{expense.staff_email || 'N/A'}</p>
                      <span className={`text-xs px-2 py-1 ${getRoleColor(expense.staff_role)} rounded`}>
                        {expense.staff_role || 'Unknown'}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-lg text-green-600">₦{(expense.amount || 0).toLocaleString()}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-sm px-3 py-1 ${getExpenseTypeColor(expense.expense_type)} rounded`}>
                      {expense.expense_type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {new Date(expense.expense_date).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                    {expense.description || '-'}
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => {
                        setSelectedExpense(expense);
                        setShowDetailsModal(true);
                      }}
                      title="View Details"
                      className="flex items-center justify-center gap-1 px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredExpenses.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No expenses found</p>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {filteredExpenses.length > itemsPerPage && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Page {currentPage} of {Math.ceil(filteredExpenses.length / itemsPerPage)}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Previous
              </button>
              <div className="flex gap-1">
                {Array.from({ length: Math.ceil(filteredExpenses.length / itemsPerPage) }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 rounded-lg transition ${
                      currentPage === page
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage(Math.min(Math.ceil(filteredExpenses.length / itemsPerPage), currentPage + 1))}
                disabled={currentPage === Math.ceil(filteredExpenses.length / itemsPerPage)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Expense Details Modal */}
      {showDetailsModal && selectedExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Expense Details</h2>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedExpense(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Staff Information Section */}
              <div className="border-b dark:border-gray-700 pb-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Staff Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Staff Name</p>
                    <p className="font-semibold text-gray-800 dark:text-white">{selectedExpense.staff_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Phone Number</p>
                    <p className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {selectedExpense.staff_phone || 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                    <p className="font-semibold text-gray-800 dark:text-white">{selectedExpense.staff_email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Role</p>
                    <span className={`inline-block font-semibold px-3 py-1 rounded text-sm ${getRoleColor(selectedExpense.staff_role)}`}>
                      {selectedExpense.staff_role || 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Expense Information Section */}
              <div className="border-b dark:border-gray-700 pb-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  Expense Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Amount</p>
                    <p className="font-bold text-2xl text-green-600">₦{(selectedExpense.amount || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Expense Type</p>
                    <span className={`inline-block font-semibold px-3 py-1 rounded text-sm ${getExpenseTypeColor(selectedExpense.expense_type)}`}>
                      {selectedExpense.expense_type}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Expense Date</p>
                    <p className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {new Date(selectedExpense.expense_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Submitted Date</p>
                    <p className="font-semibold text-gray-800 dark:text-white">
                      {new Date(selectedExpense.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Description Section */}
              {selectedExpense.description && (
                <div className="border-b dark:border-gray-700 pb-4">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Description
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedExpense.description}</p>
                </div>
              )}

              {/* Additional Details */}
              <div className="pb-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                  <Tag className="w-5 h-5" />
                  Additional Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Expense ID</p>
                    <p className="font-mono text-xs text-gray-600 dark:text-gray-400 break-all">{selectedExpense.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Last Updated</p>
                    <p className="font-semibold text-gray-800 dark:text-white">
                      {new Date(selectedExpense.updated_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t dark:border-gray-700 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedExpense(null);
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
