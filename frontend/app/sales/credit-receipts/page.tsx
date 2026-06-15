'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import api from '@/lib/api';
import { Search, Eye, X, Printer, Download, ArrowUpDown } from 'lucide-react';
import { formatQty } from '@/lib/format-quantity';
import { printReceipt, downloadReceiptAsPDF } from '@/lib/receipt-utils';
import { Toast, CreditTabs } from '@/components/credits';
import { AbifreshLoading } from '@/components/AbifreshLoading';

export default function CreditReceiptsPage() {
  const user = useAuthStore((state) => state.user);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [sortField, setSortField] = useState<'date' | 'staff'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [datePreset, setDatePreset] = useState<'today' | 'yesterday' | 'all' | 'this_week' | 'this_month' | 'custom' | 'range'>('all');
  const [customDate, setCustomDate] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [staffFilter, setStaffFilter] = useState('');
  const [receiptsPage, setReceiptsPage] = useState(1);
  const perPage = 15;

  useEffect(() => {
    fetchReceipts();
  }, []);

  const fetchReceipts = async (retryCount = 0) => {
    try {
      const response = await api.get('/api/credits/sales');
      setReceipts(response.data || []);
      setToast(null);
      setIsLoading(false);
    } catch (error: any) {
      if (retryCount < 2) {
        // Silent retry after 1.5s
        setTimeout(() => fetchReceipts(retryCount + 1), 1500);
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

  const filteredReceipts = receipts
    .filter(r => {
      const range = getDateRange();
      const d = new Date(r.created_at).getTime();
      const staffName = r.users?.full_name;
      return (r.receipt_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.creditors?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (!range.from || d >= range.from.getTime()) &&
        (!range.to || d <= range.to.getTime()) &&
        (!staffFilter || staffName === staffFilter);
    })
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'date') return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      if (sortField === 'staff') return dir * ((a.users?.full_name || '').localeCompare(b.users?.full_name || ''));
      return 0;
    });

  const totalReceiptsPages = Math.ceil(filteredReceipts.length / perPage);
  const paginatedReceipts = filteredReceipts.slice((receiptsPage - 1) * perPage, receiptsPage * perPage);

  const handleViewReceipt = (receipt: any) => {
    const formattedReceipt = {
      receipt_number: receipt.receipt_number,
      timestamp: receipt.created_at,
      staff_name: receipt.users?.full_name || 'Staff',
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
    setSelectedReceipt(formattedReceipt);
  };

  if (isLoading) return <AbifreshLoading />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto"><CreditTabs />
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Credit Receipts</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">View all credit transaction receipts</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="space-y-3 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Credit Receipts</h2>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search receipts..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setReceiptsPage(1); }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500"
                />
              </div>
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
                    className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-bold"
                  >
                    <option value="">All</option>
                    {[...new Set(receipts.map(r => r.users?.full_name).filter(Boolean))].map(name => (
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
                  <th className="py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Receipt No.</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Creditor</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Amount</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedReceipts.map((receipt) => (
                  <tr key={receipt.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{new Date(receipt.created_at).toLocaleString()}</td>
                    {(user?.role === 'admin' || user?.role === 'superadmin') && (
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{receipt.users?.full_name}</td>
                    )}
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white font-medium">{receipt.receipt_number}</td>
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{receipt.creditors?.full_name}</td>
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white font-bold">₦{Number(receipt.total_amount).toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        receipt.status === 'paid' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' :
                        receipt.status === 'cancelled' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400' :
                        'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400'
                      }`}>
                        {(receipt.status || 'pending').replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <button
                        onClick={() => handleViewReceipt(receipt)}
                        className="text-pink-600 hover:text-pink-800 flex items-center gap-1"
                      >
                        <Eye size={16} /> View
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredReceipts.length === 0 && (
                  <tr>
                  <td colSpan={user?.role === 'admin' || user?.role === 'superadmin' ? 7 : 6} className="py-8 text-center text-gray-500 dark:text-gray-400">No receipts found.</td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
          {totalReceiptsPages > 1 && (
            <div className="p-4 border-t dark:border-gray-700 flex justify-center gap-2">
              <button disabled={receiptsPage === 1} onClick={() => setReceiptsPage(p => p - 1)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs font-bold disabled:opacity-50">Previous</button>
              <span className="px-4 py-2 text-xs font-black">Page {receiptsPage} of {totalReceiptsPages}</span>
              <button disabled={receiptsPage === totalReceiptsPages} onClick={() => setReceiptsPage(p => p + 1)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs font-bold disabled:opacity-50">Next</button>
            </div>
          )}
        </div>
      </div>

      {selectedReceipt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full p-6 max-h-screen overflow-y-auto shadow-2xl border dark:border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Credit Receipt</h2>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div id="receipt-content" className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border dark:border-gray-700">
              <div className="bg-gradient-to-r from-pink-500 to-pink-600 p-8 text-center">
                <h1 className="text-3xl font-bold text-white mb-2 tracking-wide">ABIFRESH & KIDDIES VENTURES</h1>
                <p className="text-pink-100 text-sm font-semibold">Credit Receipt #{selectedReceipt.receipt_number}</p>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <div className="border-r border-gray-200 dark:border-gray-700 pr-4">
                    <p className="text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase">Date</p>
                    <p className="font-semibold text-gray-900 dark:text-white mt-1">{new Date(selectedReceipt.timestamp).toLocaleDateString()}</p>
                  </div>
                  <div className="pl-4">
                    <p className="text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase">Time</p>
                    <p className="font-semibold text-gray-900 dark:text-white mt-1">{new Date(selectedReceipt.timestamp).toLocaleTimeString()}</p>
                  </div>
                  <div className="border-r border-gray-200 dark:border-gray-700 pr-4 mt-2 pt-2 border-t">
                    <p className="text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase">Creditor</p>
                    <p className="font-semibold text-gray-900 dark:text-white mt-1">{selectedReceipt.creditor?.name || 'N/A'}</p>
                  </div>
                  <div className="pl-4 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase">Staff</p>
                    <p className="font-semibold text-gray-900 dark:text-white mt-1">{selectedReceipt.staff_name}</p>
                  </div>
                </div>

                <div className="border-t-2 border-b-2 border-pink-300 dark:border-pink-900/30">
                  <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-t-lg">
                    <div className="flex justify-between text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wide">
                      <span className="flex-1">Item</span>
                      <span className="w-16 text-right">Qty</span>
                      <span className="w-20 text-right">Price</span>
                      <span className="w-24 text-right">Total</span>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    {selectedReceipt.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-3 last:border-0">
                        <span className="flex-1 font-medium">{item.name}</span>
                        <span className="w-16 text-right">{formatQty(item.sale_quantity)}</span>
                        <span className="w-20 text-right">₦{item.price.toLocaleString()}</span>
                        <span className="w-24 text-right font-bold text-gray-900 dark:text-white">₦{(item.price * item.sale_quantity).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gradient-to-r from-pink-50 to-pink-100 dark:from-pink-900/10 dark:to-pink-900/20 rounded-lg p-6 border border-pink-200 dark:border-pink-900/30">
                  <div className="flex justify-end">
                    <div className="text-right">
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">Total Credit Amount</p>
                      <div className="text-3xl font-bold text-pink-600 dark:text-pink-400">
                        ₦{selectedReceipt.total_amount.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setSelectedReceipt(null)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => printReceipt(selectedReceipt)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <Printer size={18} /> Print
              </button>
              <button
                onClick={() => downloadReceiptAsPDF(selectedReceipt)}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
              >
                <Download size={18} /> Download
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
