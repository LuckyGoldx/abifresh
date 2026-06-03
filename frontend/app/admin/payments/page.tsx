'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { CreditCard, CheckCircle, Clock, XCircle, Search, Filter, BarChart3, TrendingUp, Eye, Download, X, FileText, Phone, MapPin, AlertTriangle, Users } from 'lucide-react';
import LoadingLogo from '@/components/LoadingLogo';
import { formatQty } from '@/lib/format-quantity';
import type { Payment, StaffSummaryRow } from '@/types';

export default function PaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [staffSummary, setStaffSummary] = useState<StaffSummaryRow[]>([]);
  const [staffSummaryLoading, setStaffSummaryLoading] = useState(true);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [sortBy, setSortBy] = useState('requested_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [actionInProgress, setActionInProgress] = useState(false);
  const [receiptLoading, setReceiptLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [outstandingSummary, setOutstandingSummary] = useState<{ outstandingTotal: number } | null>(null);
  const [activeTab, setActiveTab] = useState<'payments' | 'breakdown'>('payments');

  // Download receipt handler - handles cross-origin downloads
  const handleDownloadReceipt = async (url: string, filename?: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename || `receipt_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback: open in new tab
      window.open(url, '_blank');
    }
  };

  // Format payment method for display
  const formatPaymentMethod = (method?: string) => {
    if (!method) return 'Not specified';
    const formatted: { [key: string]: string } = {
      'cash': 'Cash',
      'online': 'Online Transfer',
      'bank_deposit': 'Bank Deposit',
      'pos': 'POS',
    };
    return formatted[method.toLowerCase()] || method;
  };

  useEffect(() => {
    fetchPayments();
    fetchOutstandingSummary();
    fetchStaffSummary();
  }, []);

  useEffect(() => {
    filterPayments();
  }, [payments, searchTerm, statusFilter, paymentTypeFilter, dateRange, sortBy, sortOrder]);

  useEffect(() => {
    if (showDetailsModal && selectedPayment) {
      setReceiptLoading(true);
      console.log('📋 Admin Payment Details Modal opened with data:', selectedPayment);
      console.log('  - staff_phone:', selectedPayment.staff_phone);
      console.log('  - reference_number:', selectedPayment.reference_number);
      console.log('  - receipt_url:', selectedPayment.receipt_url);
      console.log('  - items_paid_for:', selectedPayment.items_paid_for);
      console.log('  - approved_by_name:', selectedPayment.approved_by_name);
    }
  }, [showDetailsModal, selectedPayment]);

  const fetchStaffSummary = async () => {
    try {
      setStaffSummaryLoading(true);
      const res = await api.get('/api/admin/payments/staff-summary');
      setStaffSummary(res.data || []);
    } catch (err: any) {
      console.error('Failed to fetch staff summary:', err?.response?.data || err?.message);
    } finally {
      setStaffSummaryLoading(false);
    }
  };

  const fetchOutstandingSummary = async () => {
    try {
      const response = await api.get('/api/admin/payments/outstanding-summary');
      setOutstandingSummary(response.data);
    } catch (error: any) {
      console.error('Failed to fetch outstanding summary:', error?.response?.data || error?.message);
    }
  };

  const fetchPayments = async () => {
    try {
      setIsLoading(true);
      let response;
      try {
        // Try to fetch all payments first
        response = await api.get('/api/admin/payments/all');
        console.log('✅ Fetched all payments:', response.data);
      } catch (error: any) {
        // Fall back to pending payments
        console.log('⚠️ /all endpoint not available, falling back to /pending');
        response = await api.get('/api/admin/payments/pending');
        console.log('✅ Fetched pending payments:', response.data);
      }
      setPayments(response.data || []);
    } catch (error: any) {
      console.error('Failed to fetch payments:', error?.response?.data || error?.message);
    } finally {
      setIsLoading(false);
    }
  };

  const filterPayments = () => {
    let filtered = [...payments];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.staff_name?.toLowerCase().includes(term) ||
        p.staff_email?.toLowerCase().includes(term) ||
        p.id.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    // Payment method filter
    if (paymentTypeFilter !== 'all') {
      filtered = filtered.filter(p => (p.payment_method || p.payment_type) === paymentTypeFilter);
    }

    // Date range filter
    if (dateRange.from) {
      const fromDate = new Date(dateRange.from);
      filtered = filtered.filter(p => new Date(p.requested_date!) >= fromDate);
    }
    if (dateRange.to) {
      const toDate = new Date(dateRange.to);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(p => new Date(p.requested_date!) <= toDate);
    }

    // Sorting
    filtered.sort((a, b) => {
      let aVal: any = a[sortBy as keyof Payment];
      let bVal: any = b[sortBy as keyof Payment];

      if (sortBy === 'amount') {
        aVal = parseFloat(aVal);
        bVal = parseFloat(bVal);
      } else {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    setFilteredPayments(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleApprove = async (id: string) => {
    if (!confirm('Are you sure you want to approve this payment?')) return;

    setActionInProgress(true);
    try {
      await api.post(`/api/admin/payments/${id}/approve`);
      alert('✅ Payment approved successfully! Staff member has been notified.');
      setShowDetailsModal(false);
      setSelectedPayment(null);
      fetchPayments();
    } catch (error: any) {
      alert('❌ ' + (error.response?.data?.error || 'Failed to approve payment'));
    } finally {
      setActionInProgress(false);
    }
  };

  const handleReject = async (paymentId: string) => {
    if (!rejectReason.trim()) {
      alert('Please enter a reason for rejection');
      return;
    }

    setActionInProgress(true);
    try {
      await api.post(`/api/admin/payments/${paymentId}/reject`, { reason: rejectReason });
      alert('✅ Payment rejected successfully! Staff member has been notified with the reason.');
      setShowRejectModal(false);
      setShowDetailsModal(false);
      setRejectReason('');
      setSelectedPayment(null);
      fetchPayments();
    } catch (error: any) {
      alert('❌ ' + (error.response?.data?.error || 'Failed to reject payment'));
    } finally {
      setActionInProgress(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
      case 'approved':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
      case 'rejected':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
      case 'paid':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      default:
        return <CreditCard className="w-4 h-4" />;
    }
  };

  const stats = {
    total: payments.length,
    pending: payments.filter(p => p.status === 'pending').length,
    approved: payments.filter(p => p.status === 'approved').length,
    rejected: payments.filter(p => p.status === 'rejected').length,
    totalAmount: ((outstandingSummary?.outstandingTotal ?? 0) +
                  payments.filter(p => p.status === 'approved').reduce((sum, p) => sum + p.amount, 0) +
                  payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0)),
    pendingAmount: payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0),
    approvedAmount: payments.filter(p => p.status === 'approved').reduce((sum, p) => sum + p.amount, 0),
    rejectedAmount: payments.filter(p => p.status === 'rejected').reduce((sum, p) => sum + p.amount, 0),
  };

  /**
   * Returns true if another payment from the same staff member has the same
   * amount and was submitted within 5 minutes — flagging likely duplicates.
   */
  const isNearDuplicate = (payment: Payment): boolean => {
    const FIVE_MINUTES = 5 * 60 * 1000;
    return payments.some(
      (other) =>
        other.id !== payment.id &&
        other.staff_id === payment.staff_id &&
        Number(other.amount) === Number(payment.amount) &&
        Math.abs(
          new Date(other.created_at).getTime() -
            new Date(payment.created_at).getTime()
        ) < FIVE_MINUTES
    );
  };

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

  const HIDDEN_EMAILS = ['staff@abifresh.com', 'commission@abifresh.com', 'sales.@abifresh.com'];
  const visibleStaff = staffSummary.filter(s => !HIDDEN_EMAILS.includes(s.email));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <CreditCard className="w-8 h-8 text-pink-500" />
          Payment Management System
        </h1>
        <button
          onClick={() => { fetchPayments(); fetchOutstandingSummary(); fetchStaffSummary(); }}
          className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition"
        >
          Refresh
        </button>
      </div>

      {/* Total Outstanding Card */}
      <div 
        onClick={() => {
          setActiveTab('breakdown');
          setTimeout(() => {
            const tabElement = document.getElementById('payments-tabs');
            if (tabElement) {
              tabElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 0);
        }}
        className="card border-l-4 border-l-orange-500 bg-orange-50 dark:bg-orange-950 cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200"
      >
        <div className="flex items-start gap-3">
          <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-full flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-medium text-orange-700 dark:text-orange-300">Total Outstanding</p>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-orange-600 dark:text-orange-400 break-words">
              ₦{(outstandingSummary?.outstandingTotal ?? 0).toLocaleString()}
            </p>
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
              Sum of sales not yet submitted by all staff
            </p>
          </div>
        </div>
      </div>

      {/* Statistics Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card border-l-4 border-l-yellow-500">
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Pending Payments</p>
          <p className="text-lg sm:text-2xl md:text-3xl font-bold text-yellow-600 break-words">{stats.pending}</p>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 break-words">
            ₦{stats.pendingAmount.toLocaleString()}
          </p>
        </div>

        <div className="card border-l-4 border-l-green-500">
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Approved Payments</p>
          <p className="text-lg sm:text-2xl md:text-3xl font-bold text-green-600 break-words">{stats.approved}</p>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 break-words">
            ₦{stats.approvedAmount.toLocaleString()}
          </p>
        </div>

        <div className="card border-l-4 border-l-red-500">
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Rejected Payments</p>
          <p className="text-lg sm:text-2xl md:text-3xl font-bold text-red-600 break-words">{stats.rejected}</p>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 break-words">
            ₦{stats.rejectedAmount.toLocaleString()}
          </p>
        </div>

        <div className="card border-l-4 border-l-blue-500">
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Total Amount</p>
          <p className="text-lg sm:text-2xl md:text-3xl font-bold text-blue-600 break-words">₦{stats.totalAmount.toLocaleString()}</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div id="payments-tabs" className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-3 font-medium text-sm sm:text-base transition-colors border-b-2 ${
            activeTab === 'payments'
              ? 'border-b-pink-500 text-pink-600 dark:text-pink-400'
              : 'border-b-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300'
          }`}
        >
          Payments
        </button>
        <button
          onClick={() => setActiveTab('breakdown')}
          className={`px-4 py-3 font-medium text-sm sm:text-base transition-colors border-b-2 ${
            activeTab === 'breakdown'
              ? 'border-b-pink-500 text-pink-600 dark:text-pink-400'
              : 'border-b-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300'
          }`}
        >
          Payments Breakdown
        </button>
      </div>

      {/* Staff Payment Breakdown Tab */}
      {activeTab === 'breakdown' && (
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-pink-500" />
            Staff Payment Breakdown
          </h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {visibleStaff.length} staff member{visibleStaff.length !== 1 ? 's' : ''}
          </span>
        </div>

        {staffSummaryLoading ? (
          <div className="flex items-center justify-center py-10 text-gray-500 dark:text-gray-400 gap-2">
            <div className="w-5 h-5 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
            Loading staff data...
          </div>
        ) : staffSummary.length === 0 ? (
          <div className="text-center py-10 text-gray-500 dark:text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>No staff found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <th className="text-left py-3 px-4 font-semibold">Staff</th>
                  <th className="text-left py-3 px-4 font-semibold">Role</th>
                  <th className="text-right py-3 px-4 font-semibold">Total Qty Sold</th>
                  <th className="text-right py-3 px-4 font-semibold">Total Sales</th>
                  <th className="text-right py-3 px-4 font-semibold">Pending</th>
                  <th className="text-right py-3 px-4 font-semibold">Approved</th>
                  <th className="text-right py-3 px-4 font-semibold">Outstanding</th>
                  <th className="text-center py-3 px-4 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleStaff.sort((a, b) => {
                  if (b.outstanding_amount !== a.outstanding_amount) {
                    return b.outstanding_amount - a.outstanding_amount;
                  }
                  return b.total_sales_amount - a.total_sales_amount;
                }).map(staff => (
                  <tr key={staff.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-900 dark:text-white">{staff.full_name}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{staff.email}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs px-2 py-0.5 bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300 rounded-full capitalize">
                        {staff.role.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300 font-medium">
                      {staff.total_qty.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-blue-600 dark:text-blue-400">
                      ₦{(staff.total_sales_amount || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-semibold text-yellow-600 dark:text-yellow-400">
                        ₦{(staff.pending_amount || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        ₦{(staff.approved_amount || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-bold text-red-600 dark:text-red-400">
                        ₦{(staff.outstanding_amount || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => router.push(`/admin/payments/staff/${staff.id}`)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs font-medium transition"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Totals Row */}
              <tfoot>
                <tr className="bg-gray-100 dark:bg-gray-700 border-t-2 dark:border-gray-600 font-bold text-sm">
                  <td colSpan={2} className="py-3 px-4 text-gray-700 dark:text-gray-200">Totals</td>
                  <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-200">
                    {visibleStaff.reduce((s, r) => s + r.total_qty, 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right text-blue-700 dark:text-blue-300">
                    ₦{visibleStaff.reduce((s, r) => s + r.total_sales_amount, 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right text-yellow-700 dark:text-yellow-300">
                    ₦{visibleStaff.reduce((s, r) => s + r.pending_amount, 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right text-green-700 dark:text-green-300">
                    ₦{visibleStaff.reduce((s, r) => s + (r.approved_amount || 0), 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right text-red-700 dark:text-red-300">
                    ₦{visibleStaff.reduce((s, r) => s + r.outstanding_amount, 0).toLocaleString()}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && (
      <>
      {/* Filters */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
            <Filter className="w-5 h-5 text-pink-500" />
            Filters & Search
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search staff name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          {/* Payment Method Filter */}
          <select
            value={paymentTypeFilter}
            onChange={(e) => setPaymentTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Methods</option>
            <option value="cash">Cash</option>
            <option value="online">Online Transfer</option>
            <option value="bank_deposit">Bank Deposit</option>
            <option value="pos">POS</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          >
            <option value="requested_date">Date</option>
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
          Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredPayments.length)}-{Math.min(currentPage * itemsPerPage, filteredPayments.length)} of {filteredPayments.length} payments
        </div>
      </div>

      {/* Payments Table */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-pink-500" />
          Payment Details
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <th className="text-left py-3 px-4 text-sm font-semibold">Staff Information</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Amount</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Type</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Date</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map((payment) => (
                <tr key={payment.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{payment.staff_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{payment.staff_email}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 capitalize">{payment.staff_role}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-lg text-orange-600">₦{payment.amount.toLocaleString()}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                      {formatPaymentMethod(payment.payment_method || payment.payment_type)}
                    </span>
                  </td>
                <td className="py-3 px-4">
                    <div className="flex flex-col gap-1">
                      <span className={`px-2 py-1 ${getStatusColor(payment.status)} rounded text-xs flex items-center gap-1 w-fit`}>
                        {getStatusIcon(payment.status)}
                        {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                      </span>
                      {isNearDuplicate(payment) && (
                        <span
                          title={`Another ₦${Number(payment.amount).toLocaleString()} payment from this staff member was submitted within 5 minutes. Possible duplicate — review before approving.`}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 rounded text-xs font-semibold cursor-help w-fit"
                        >
                          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                          Possible Duplicate
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <div>
                      <p className="text-gray-900 dark:text-white">{new Date(payment.requested_date!).toLocaleString()}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedPayment(payment);
                          setShowDetailsModal(true);
                        }}
                        title="View Details"
                        className="flex items-center justify-center gap-1 px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {payment.status === 'pending' && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedPayment(payment);
                              setShowDetailsModal(true);
                            }}
                            className="flex items-center gap-1 px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-xs"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setSelectedPayment(payment);
                              setShowDetailsModal(true);
                            }}
                            className="flex items-center gap-1 px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs"
                          >
                            <XCircle className="w-4 h-4" />
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredPayments.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No payments found</p>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {filteredPayments.length > itemsPerPage && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Page {currentPage} of {Math.ceil(filteredPayments.length / itemsPerPage)}
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
                  const total = Math.ceil(filteredPayments.length / itemsPerPage);
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
                              ? 'bg-pink-500 text-white'
                              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}>{item}</button>
                      )
                    );
                })()}
              </div>
              <button
                onClick={() => setCurrentPage(Math.min(Math.ceil(filteredPayments.length / itemsPerPage), currentPage + 1))}
                disabled={currentPage === Math.ceil(filteredPayments.length / itemsPerPage)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      </>
      )}

      {/* Payment Details Modal */}
      {showDetailsModal && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Payment Details</h2>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setShowRejectModal(false);
                  setSelectedPayment(null);
                  setRejectReason('');
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
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Staff Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Staff Name</p>
                    <p className="font-semibold text-gray-800 dark:text-white">{selectedPayment.staff_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Phone Number</p>
                    <p className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {selectedPayment.staff_phone || 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                    <p className="font-semibold text-gray-800 dark:text-white">{selectedPayment.staff_email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Role</p>
                    <p className="font-semibold text-gray-800 dark:text-white capitalize">{selectedPayment.staff_role}</p>
                  </div>
                </div>
              </div>

              {/* Payment Information Section */}
              <div className="border-b dark:border-gray-700 pb-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Payment Information</h3>

                {/* Near-duplicate warning inside modal */}
                {selectedPayment && isNearDuplicate(selectedPayment) && (
                  <div className="mb-4 flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">⚠️ Possible Duplicate Payment Detected</p>
                      <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                        Another payment of ₦{Number(selectedPayment.amount).toLocaleString()} from <strong>{selectedPayment.staff_name}</strong> was submitted within 5 minutes of this one.
                        Please verify this is not an accidental double-submission before approving.
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Amount</p>
                    <p className="font-bold text-2xl text-orange-600">₦{selectedPayment.amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                    <p className={`font-semibold inline-block px-3 py-1 rounded text-sm ${getStatusColor(selectedPayment.status)}`}>
                      {selectedPayment.status.charAt(0).toUpperCase() + selectedPayment.status.slice(1)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Payment Method</p>
                    <p className="font-semibold text-gray-800 dark:text-white capitalize">{selectedPayment.payment_method || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Reference Number</p>
                    <p className="font-semibold text-gray-800 dark:text-white">{selectedPayment.reference_number || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Items Paid For Section */}
              {selectedPayment.items_paid_for && selectedPayment.items_paid_for.length > 0 && (
                <div className="border-b dark:border-gray-700 pb-4">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Items Paid For</h3>
                  <div className="space-y-2">
                    {selectedPayment.items_paid_for.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700 p-3 rounded">
                        <div>
                          <p className="font-semibold text-gray-800 dark:text-white">{item.item_name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Quantity: {formatQty(item.quantity)}</p>
                        </div>
                        <p className="font-bold text-lg text-orange-600">₦{item.amount.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Receipt Section */}
              {selectedPayment.receipt_url && selectedPayment.receipt_url.trim() !== '' && (
                <div className="border-b dark:border-gray-700 pb-4">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Receipt Preview</h3>
                  
                  {/* Clickable Receipt Image */}
                  <div 
                    className="cursor-pointer mb-3 relative min-h-[100px] flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700"
                    onClick={() => setShowReceiptPreview(true)}
                    title="Click to view fullscreen"
                  >
                    {receiptLoading && (
                      <div className="absolute inset-0 flex items-center justify-center z-10 bg-gray-50/80 dark:bg-gray-900/80 rounded">
                        <LoadingLogo text="Loading receipt..." />
                      </div>
                    )}
                    <img 
                      src={selectedPayment.receipt_url} 
                      alt="Receipt"
                      className={`max-w-full h-auto transition-opacity duration-300 ${receiptLoading ? 'opacity-0' : 'opacity-100'}`}
                      onLoad={() => setReceiptLoading(false)}
                      onError={(e) => {
                        setReceiptLoading(false);
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="100"%3E%3Crect fill="%23f0f0f0" width="200" height="100"/%3E%3Ctext x="100" y="50" text-anchor="middle" dy=".3em" fill="%23999"%3EImage not found%3C/text%3E%3C/svg%3E';
                      }}
                    />
                  </div>
                  
                  {/* Simple Icon Buttons */}
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setShowReceiptPreview(true)}
                      className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
                      title="View fullscreen"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDownloadReceipt(selectedPayment.receipt_url!, `receipt_${selectedPayment.reference_number || selectedPayment.id}.jpg`)}
                      className="text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition"
                      title="Download receipt"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Notes Section */}
              {selectedPayment.notes && (
                <div className="border-b dark:border-gray-700 pb-4">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Notes</h3>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded">
                    <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{selectedPayment.notes}</p>
                  </div>
                </div>
              )}

              {/* Rejection Reason Section */}
              {selectedPayment.status === 'rejected' && selectedPayment.rejection_reason && (
                <div className="border-b dark:border-gray-700 pb-4">
                  <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-3">Rejection Reason</h3>
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded">
                    <p className="text-red-800 dark:text-red-200 whitespace-pre-wrap">{selectedPayment.rejection_reason}</p>
                  </div>
                </div>
              )}

              {/* Dates Section */}
              <div className="border-b dark:border-gray-700 pb-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Timeline</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Requested Date</p>
                    <p className="font-semibold text-gray-800 dark:text-white">{new Date(selectedPayment.requested_date!).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Created Date</p>
                    <p className="font-semibold text-gray-800 dark:text-white">{new Date(selectedPayment.created_at).toLocaleString()}</p>
                  </div>
                  {selectedPayment.approved_date && selectedPayment.status === 'approved' && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Approved Date</p>
                      <p className="font-semibold text-green-600">{new Date(selectedPayment.approved_date).toLocaleString()}</p>
                    </div>
                  )}
                  {selectedPayment.approved_by_name && selectedPayment.status === 'approved' && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Approved By</p>
                      <p className="font-semibold text-green-600">{selectedPayment.approved_by_name}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer - Action Buttons */}
            {selectedPayment.status === 'pending' && !showRejectModal && (
              <div className="p-6 border-t dark:border-gray-700 flex gap-4 bg-gray-50 dark:bg-gray-700">
                <button
                  onClick={() => handleApprove(selectedPayment.id)}
                  disabled={actionInProgress}
                  className="flex-1 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle className="w-5 h-5" />
                  Approve Payment
                </button>
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={actionInProgress}
                  className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <XCircle className="w-5 h-5" />
                  Reject Payment
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {showRejectModal && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
            {/* Modal Header */}
            <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Reject Payment</h2>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Staff: <span className="font-semibold text-gray-800 dark:text-white">{selectedPayment.staff_name}</span>
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Amount: <span className="font-bold text-lg text-orange-600">₦{selectedPayment.amount.toLocaleString()}</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 dark:text-white mb-2">
                  Reason for Rejection <span className="text-gray-400">(Optional)</span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Enter reason for rejecting this payment (staff will see this message)..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white resize-none"
                  rows={5}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  💡 Tip: Be specific about why the payment was rejected so the staff member can correct the issue.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t dark:border-gray-700 flex gap-3 bg-gray-50 dark:bg-gray-700">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
                disabled={actionInProgress}
                className="flex-1 px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(selectedPayment.id)}
                disabled={actionInProgress}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <XCircle className="w-4 h-4" />
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Receipt Preview Modal */}
      {showReceiptPreview && selectedPayment?.receipt_url && (
        <div className="fixed inset-0 bg-black bg-opacity-95 z-50 overflow-auto">
          {/* Fixed header with reference, download and close */}
          <div className="fixed top-0 left-0 right-0 flex justify-between items-center p-4 z-20 bg-gradient-to-b from-black/80 to-transparent">
            <div className="text-white text-sm">
              {selectedPayment.reference_number && (
                <span className="bg-black/50 px-3 py-1 rounded">Ref: {selectedPayment.reference_number}</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleDownloadReceipt(selectedPayment.receipt_url!, `receipt_${selectedPayment.reference_number || selectedPayment.id}.jpg`)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center gap-2 text-sm transition"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              <button
                onClick={() => setShowReceiptPreview(false)}
                className="bg-white rounded-full p-2 hover:bg-gray-200"
                title="Close"
              >
                <X className="w-5 h-5 text-black" />
              </button>
            </div>
          </div>
          
          {/* Scrollable image container */}
          <div className="min-h-full flex items-start justify-center p-4 pt-20 pb-8">
            <img
              src={selectedPayment.receipt_url}
              alt="Receipt"
              className="max-w-full h-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
}
