'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import api from '@/lib/api';
import { Search, X, CheckCircle, XCircle, Clock, DollarSign, Eye, FileText, User, Loader2, Printer, Download, ArrowUpDown } from 'lucide-react';
import { Toast, CreditTabs } from '@/components/credits';
import { formatQty } from '@/lib/format-quantity';
import { printReceipt, downloadReceiptAsPDF } from '@/lib/receipt-utils';
import { AbifreshLoading } from '@/components/AbifreshLoading';

export default function RemitCreditPage() {
  const user = useAuthStore((state) => state.user);
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailPayment, setDetailPayment] = useState<any>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceiptData, setSelectedReceiptData] = useState<any>(null);
  const [loadingReceiptId, setLoadingReceiptId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'date' | 'staff'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [datePreset, setDatePreset] = useState<'today' | 'yesterday' | 'all' | 'this_week' | 'this_month' | 'custom' | 'range'>('all');
  const [customDate, setCustomDate] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [staffFilter, setStaffFilter] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const perPage = 15;

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async (retryCount = 0) => {
    try {
      const res = await api.get('/api/credits/payments/pending');
      setPayments(res.data || []);
      setToast(null);
      setIsLoading(false);
    } catch (error: any) {
      if (retryCount < 2) {
        // Silent retry after 1.5s
        setTimeout(() => fetchPayments(retryCount + 1), 1500);
      } else {
        setToast({ message: 'Connection interrupted. Retrying...', type: 'error' });
        setIsLoading(false);
      }
    }
  };

  const getDateRange = () => {
    const now = new Date();
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (datePreset === 'today') {
      const s = startOfDay(now);
      return { from: s, to: new Date(s.getTime() + 86400000 - 1) };
    }
    if (datePreset === 'yesterday') {
      const s = startOfDay(new Date(now.getTime() - 86400000));
      return { from: s, to: new Date(s.getTime() + 86400000 - 1) };
    }
    if (datePreset === 'this_week') {
      const day = now.getDay();
      const s = startOfDay(new Date(now.getTime() - (day === 0 ? 6 : day - 1) * 86400000));
      return { from: s, to: new Date(startOfDay(now).getTime() + 86400000 - 1) };
    }
    if (datePreset === 'this_month') {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: s, to: new Date(startOfDay(now).getTime() + 86400000 - 1) };
    }
    if (datePreset === 'custom' && customDate) {
      const s = startOfDay(new Date(customDate));
      return { from: s, to: new Date(s.getTime() + 86400000 - 1) };
    }
    if (datePreset === 'range' && dateFrom && dateTo) {
      const s = startOfDay(new Date(dateFrom));
      const e = new Date(dateTo + 'T23:59:59');
      return { from: s, to: e };
    }
    return { from: null, to: null };
  };

  const filteredPayments = payments
    .filter(p => {
      const range = getDateRange();
      const d = new Date(p.created_at).getTime();
      return (p.receipt_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.creditors?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (!range.from || d >= range.from.getTime()) &&
        (!range.to || d <= range.to.getTime()) &&
        (!staffFilter || p.staff_name === staffFilter);
    })
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'date') return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      if (sortField === 'staff') return dir * ((a.staff_name || '').localeCompare(b.staff_name || ''));
      return 0;
    });

  const totalHistoryPages = Math.ceil(filteredPayments.length / perPage);
  const paginatedHistory = filteredPayments.slice((historyPage - 1) * perPage, historyPage * perPage);

  const handleApprove = async (paymentId: string) => {
    try {
      await api.post(`/api/credits/payments/${paymentId}/approve`);
      setToast({ message: 'Payment approved and remitted', type: 'success' });
      fetchPayments();
    } catch (error: any) {
      setToast({ message: 'Failed to approve payment', type: 'error' });
    }
  };

  const handleReject = async (paymentId: string) => {
    const reason = window.prompt('Enter rejection reason:');
    if (!reason) return;
    try {
      await api.post(`/api/credits/payments/${paymentId}/reject`, { reason });
      setToast({ message: 'Payment rejected', type: 'success' });
      fetchPayments();
    } catch (error: any) {
      setToast({ message: 'Failed to reject payment', type: 'error' });
    }
  };

  const handleFetchReceipt = async (saleId: string | null, receiptNumber?: string | null) => {
    const trackingId = saleId || receiptNumber || 'unknown';
    setLoadingReceiptId(trackingId);
    try {
      let receipt: any = null;
      if (saleId && saleId.length > 20 && saleId.includes('-')) {
        try {
          const res = await api.get(`/api/credits/sales/${saleId}`);
          if (res.data && !res.data.error && res.data.receipt_number) {
            receipt = res.data;
          }
        } catch (e) {}
      }
      if (!receipt) {
        const targetRef = receiptNumber || (saleId?.startsWith('CR-') ? saleId : null);
        if (targetRef) {
          const res = await api.get('/api/credits/sales');
          const allSales = Array.isArray(res.data) ? res.data : [];
          receipt = allSales.find((s: any) => s.receipt_number === targetRef);
        }
      }
      if (!receipt) {
        setToast({ message: 'Could not find the original sale record', type: 'error' });
        return;
      }
      const formattedReceipt = {
        receipt_number: receipt.receipt_number,
        timestamp: receipt.created_at,
        staff_name: receipt.users?.full_name || (Array.isArray(receipt.users) ? receipt.users[0]?.full_name : 'Staff'),
        payment_method: 'Credit',
        items: receipt.credit_sale_items?.map((item: any) => ({
          name: item.item_name,
          sale_quantity: item.quantity,
          price: item.unit_price,
        })) || [],
        total_amount: receipt.total_amount,
        creditor: {
          name: receipt.creditors?.full_name,
          phone: receipt.creditors?.phone_number,
        }
      };
      setSelectedReceiptData(formattedReceipt);
      setShowReceiptModal(true);
    } catch (error) {
      setToast({ message: 'Failed to fetch receipt details', type: 'error' });
    } finally {
      setLoadingReceiptId(null);
    }
  };

  if (isLoading) return <AbifreshLoading />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto"><CreditTabs />
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Credit History</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">View all credit payments</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by receipt or creditor..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setHistoryPage(1); }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</span>
                <select
                  value={datePreset}
                  onChange={e => setDatePreset(e.target.value as any)}
                  className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-bold"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="this_week">This Week</option>
                  <option value="this_month">This Month</option>
                  <option value="custom">Custom Date</option>
                  <option value="range">Date Range</option>
                </select>
                {datePreset === 'custom' && (
                  <input
                    type="date"
                    value={customDate}
                    onChange={e => setCustomDate(e.target.value)}
                    className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                )}
                {datePreset === 'range' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={e => setDateFrom(e.target.value)}
                      className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <span className="text-[10px] font-bold text-gray-500">—</span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={e => setDateTo(e.target.value)}
                      className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                )}
              </div>
              {(user?.role === 'admin' || user?.role === 'superadmin') && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Staff</span>
                  <select
                    value={staffFilter}
                    onChange={e => setStaffFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">All</option>
                    {[...new Set(payments.map(p => p.staff_name).filter(Boolean))].map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex items-center gap-1 ml-auto">
                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sort:</span>
                <button
                  onClick={() => { if (sortField !== 'date') setSortField('date'); else setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}
                  className={`px-2.5 py-1.5 text-[10px] font-bold rounded-lg border transition-colors flex items-center gap-1 uppercase tracking-wider ${
                    sortField === 'date' ? 'bg-pink-50 dark:bg-pink-900/30 border-pink-300 dark:border-pink-700 text-pink-700 dark:text-pink-400' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <ArrowUpDown size={11} />
                  Date {sortField === 'date' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </button>
                {(user?.role === 'admin' || user?.role === 'superadmin') && (
                  <button
                    onClick={() => { if (sortField !== 'staff') setSortField('staff'); else setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}
                    className={`px-2.5 py-1.5 text-[10px] font-bold rounded-lg border transition-colors flex items-center gap-1 uppercase tracking-wider ${
                      sortField === 'staff' ? 'bg-pink-50 dark:bg-pink-900/30 border-pink-300 dark:border-pink-700 text-pink-700 dark:text-pink-400' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <ArrowUpDown size={11} />
                    Staff {sortField === 'staff' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <th
                    onClick={() => { if (sortField !== 'date') setSortField('date'); else setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}
                    className="py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:text-pink-600 select-none"
                  >
                    Date {sortField === 'date' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  {(user?.role === 'admin' || user?.role === 'superadmin') && (
                    <th
                      onClick={() => { if (sortField !== 'staff') setSortField('staff'); else setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}
                      className="py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:text-pink-600 select-none"
                    >
                      Staff {sortField === 'staff' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </th>
                  )}
                  <th className="py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Receipt</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Creditor</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Amount</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedHistory.map((payment) => (
                  <tr key={payment.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{new Date(payment.created_at).toLocaleString()}</td>
                    {(user?.role === 'admin' || user?.role === 'superadmin') && (
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{payment.staff_name}</td>
                    )}
                    <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">{payment.receipt_number}</td>
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{payment.creditors?.full_name}</td>
                    <td className="py-3 px-4 text-sm font-bold text-gray-900 dark:text-white">₦{Number(payment.amount).toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 w-fit ${
                        payment.status === 'approved' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' :
                        payment.status === 'rejected' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400' :
                        'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400'
                      }`}>
                        {payment.status === 'approved' ? <CheckCircle size={12} /> :
                         payment.status === 'rejected' ? <XCircle size={12} /> :
                         <Clock size={12} />}
                        {payment.status?.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setDetailPayment(payment); setShowDetailModal(true); }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        {payment.status === 'pending' && (user?.role === 'admin' || user?.role === 'superadmin') && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApprove(payment.id)}
                              className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-xs font-semibold"
                            >
                              <CheckCircle size={14} /> Approve
                            </button>
                            <button
                              onClick={() => handleReject(payment.id)}
                              className="flex items-center gap-1 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs font-semibold"
                            >
                              <XCircle size={14} /> Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredPayments.length === 0 && (
                  <tr>
                    <td colSpan={user?.role === 'admin' || user?.role === 'superadmin' ? 7 : 6} className="py-8 text-center text-gray-500 dark:text-gray-400">No remittances found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {totalHistoryPages > 1 && (
            <div className="p-4 border-t dark:border-gray-700 flex justify-center gap-2">
              <button disabled={historyPage === 1} onClick={() => setHistoryPage(p => p - 1)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs font-bold disabled:opacity-50">Previous</button>
              <span className="px-4 py-2 text-xs font-black">Page {historyPage} of {totalHistoryPages}</span>
              <button disabled={historyPage === totalHistoryPages} onClick={() => setHistoryPage(p => p + 1)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs font-bold disabled:opacity-50">Next</button>
            </div>
          )}
        </div>

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        {showDetailModal && detailPayment && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowDetailModal(false)}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border dark:border-gray-700" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-6 h-6 text-pink-500" />
                  Credit Payment Details
                </h3>
                <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border dark:border-gray-700">
                  <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Payment Info</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 font-semibold text-[10px] uppercase">Amount</p>
                      <p className="font-black text-gray-900 dark:text-white text-lg">₦{Number(detailPayment.amount).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 font-semibold text-[10px] uppercase">Method</p>
                      <p className="font-bold text-gray-900 dark:text-white uppercase">{detailPayment.payment_method?.replace('_', ' ') || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 font-semibold text-[10px] uppercase">Status</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        detailPayment.status === 'approved' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' :
                        detailPayment.status === 'rejected' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400' :
                        'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400'
                      }`}>
                        {detailPayment.status?.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 font-semibold text-[10px] uppercase">Date</p>
                      <p className="font-bold text-gray-900 dark:text-white">{new Date(detailPayment.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border dark:border-gray-700">
                  <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Creditor & Receipt</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 font-semibold text-[10px] uppercase">Creditor Name</p>
                      <p className="font-bold text-gray-900 dark:text-white">{detailPayment.creditors?.full_name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 font-semibold text-[10px] uppercase">Unique Code</p>
                      <p className="font-bold text-gray-900 dark:text-white font-mono">{detailPayment.creditors?.unique_code || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 font-semibold text-[10px] uppercase">Receipt Number</p>
                      <button
                        onClick={() => handleFetchReceipt(detailPayment.credit_sale_id, detailPayment.credit_sales?.receipt_number || detailPayment.receipt_number)}
                        disabled={!!loadingReceiptId}
                        className="font-bold text-pink-600 dark:text-pink-400 font-mono hover:text-pink-700 dark:hover:text-pink-300 hover:underline transition-all flex items-center gap-1.5"
                      >
                        {loadingReceiptId === (detailPayment.credit_sale_id || detailPayment.credit_sales?.receipt_number || detailPayment.receipt_number) ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <FileText className="w-3.5 h-3.5" />
                        )}
                        {detailPayment.receipt_number}
                      </button>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 font-semibold text-[10px] uppercase">Reference</p>
                      <p className="font-bold text-gray-900 dark:text-white font-mono">{detailPayment.reference_number || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border dark:border-gray-700">
                  <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Staff Info</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 font-semibold text-[10px] uppercase">Recorded By</p>
                      <p className="font-bold text-gray-900 dark:text-white">{detailPayment.staff_name}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 font-semibold text-[10px] uppercase">Remittance Status</p>
                      <p className="font-bold text-gray-900 dark:text-white uppercase">{detailPayment.remittance_status || 'Not Submitted'}</p>
                    </div>
                  </div>
                </div>

                {detailPayment.notes && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-xl border border-yellow-200 dark:border-yellow-900/30">
                    <p className="text-[10px] font-black text-yellow-700 dark:text-yellow-400 uppercase tracking-wider mb-1">Notes</p>
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">{detailPayment.notes}</p>
                  </div>
                )}

                {detailPayment.status === 'rejected' && detailPayment.rejection_reason && (
                  <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-200 dark:border-red-900/30">
                    <p className="text-[10px] font-black text-red-700 dark:text-red-400 uppercase tracking-wider mb-1">Rejection Reason</p>
                    <p className="text-sm text-red-800 dark:text-red-200">{detailPayment.rejection_reason}</p>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="w-full py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {showReceiptModal && selectedReceiptData && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={() => setShowReceiptModal(false)}>
            <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black flex items-center gap-2 text-gray-900 dark:text-white">
                  <FileText className="w-6 h-6 text-pink-500" /> Sale Receipt
                </h2>
                <button onClick={() => setShowReceiptModal(false)} className="text-gray-400 hover:text-red-500 transition-colors"><X size={24} /></button>
              </div>
              <div id="receipt-content" className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                <div className="bg-pink-600 p-8 text-center text-white">
                  <h1 className="text-2xl font-black uppercase tracking-tight">ABIFRESH & KIDDIES VENTURES</h1>
                  <p className="font-bold opacity-80 mt-1">Credit Receipt #{selectedReceiptData.receipt_number}</p>
                </div>
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-2 gap-4 text-xs bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border dark:border-gray-700">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 font-bold uppercase mb-0.5">Date</p>
                      <p className="font-black text-gray-900 dark:text-white">{new Date(selectedReceiptData.timestamp).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 font-bold uppercase mb-0.5">Staff</p>
                      <p className="font-black text-gray-900 dark:text-white">{selectedReceiptData.staff_name}</p>
                    </div>
                    <div className="col-span-2 pt-2 border-t dark:border-gray-700">
                      <p className="text-gray-500 dark:text-gray-400 font-bold uppercase mb-0.5">Creditor</p>
                      <p className="font-black text-gray-900 dark:text-white">{selectedReceiptData.creditor?.name}{selectedReceiptData.creditor?.phone ? ` — ${selectedReceiptData.creditor.phone}` : ''}</p>
                    </div>
                  </div>
                  <div className="border-y-2 border-pink-100 dark:border-pink-900/30 py-4">
                    {selectedReceiptData.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm py-2 border-b last:border-0 border-gray-100 dark:border-gray-800">
                        <span className="flex-1 font-bold text-gray-900 dark:text-gray-200">{item.name}</span>
                        <span className="w-12 text-center text-gray-500 dark:text-gray-400 font-medium">{formatQty(item.sale_quantity)}</span>
                        <span className="w-24 text-right font-black text-gray-900 dark:text-white">₦{(item.price * item.sale_quantity).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-pink-50 dark:bg-pink-900/20 p-6 rounded-2xl text-right">
                    <p className="text-pink-600 dark:text-pink-400 text-xs font-bold uppercase">Total Credit Amount</p>
                    <p className="text-3xl font-black text-pink-600 dark:text-pink-400">₦{selectedReceiptData.total_amount.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button onClick={() => setShowReceiptModal(false)} className="flex-1 py-4 border-2 border-gray-100 dark:border-gray-700 font-bold rounded-2xl hover:bg-gray-50 transition-colors">Close</button>
                <button onClick={() => printReceipt(selectedReceiptData)} className="flex-1 py-4 bg-blue-500 text-white font-black rounded-2xl hover:bg-blue-600 transition-colors shadow-lg shadow-blue-100 flex items-center justify-center gap-2"><Printer size={18} /> Print</button>
                <button onClick={() => downloadReceiptAsPDF(selectedReceiptData)} className="flex-1 py-4 bg-green-500 text-white font-black rounded-2xl hover:bg-green-600 transition-colors shadow-lg shadow-green-100 flex items-center justify-center gap-2"><Download size={18} /> Download</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
