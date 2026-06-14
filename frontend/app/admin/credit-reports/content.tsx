'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import api from '@/lib/api';
import { formatQty } from '@/lib/format-quantity';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, AreaChart, Area
} from 'recharts';
import {
  TrendingUp, Download, Filter, Calendar, User, Package, DollarSign,
  Users, Activity, ShoppingCart, Warehouse, AlertCircle, Eye, CreditCard,
  ArrowUpRight, ArrowDownRight, History, Receipt, RotateCcw
} from 'lucide-react';
import LoadingLogo from '@/components/LoadingLogo';
import { CreditTabs, Toast } from '@/components/credits';

interface CreditReport {
  summary: {
    total_issuance: number;
    total_collection: number;
    total_cost_price_issued: number;
    total_cost_price_collected: number;
    credit_profit: number;
    total_quantity: number;
    total_transactions: number;
    collection_rate: number;
  };
  trends: Array<{ date: string; issuance: number; collection: number }>;
  staff_performance: Array<{ staff_name: string; issuance: number; collection: number; transactions: number }>;
  item_analysis: Array<{ item_name: string; quantity: number; amount: number }>;
  creditor_performance: Array<{ creditor_name: string; issuance: number; collection: number }>;
  raw: {
    sales: any[];
    payments: any[];
  };
}

const COLORS = ['#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316'];

export default function CreditReportsPage() {
  const reportRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const [report, setReport] = useState<CreditReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'issuance' | 'payments' | 'items' | 'creditors' | 'staff'>('overview');
  const [filters, setFilters] = useState({
    dateRange: 'month',
    staffId: '',
    customFrom: '',
    customTo: '',
  });
  const [staff, setStaff] = useState<any[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchReport();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [filters]);

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        dateRange: filters.dateRange,
        ...(filters.staffId && { staffId: filters.staffId }),
        ...(filters.customFrom && { customFrom: filters.customFrom }),
        ...(filters.customTo && { customTo: filters.customTo }),
      });
      const res = await api.get(`/api/admin/reports/credits?${params}`);
      setReport(res.data);
      if (res.data.active_staff) {
        setStaff(res.data.active_staff);
      }
    } catch (err) {
      console.error('Failed to fetch credit report');
      setToast({ message: 'Failed to load report data', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { default: jsPDF } = await import('jspdf');
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();

      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();
      }

      pdf.save(`Credit_Report_${new Date().toLocaleDateString()}.pdf`);
    } catch (err) {
      console.error('PDF Export failed');
    }
  };

  if (isLoading && !report) return <LoadingLogo />;

  const renderSummaryCards = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm border-l-4 border-l-pink-500 overflow-hidden">
        <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Total Issuance</p>
        <p className="text-2xl font-black text-gray-900 dark:text-white break-words">₦{(report?.summary.total_issuance || 0).toLocaleString()}</p>
        <div className="flex items-center gap-1 text-[10px] text-pink-600 font-bold mt-2">
          <ArrowUpRight size={12} /> Total Credit Given
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm border-l-4 border-l-green-500 overflow-hidden">
        <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Total Collection</p>
        <p className="text-2xl font-black text-gray-900 dark:text-white break-words">₦{(report?.summary.total_collection || 0).toLocaleString()}</p>
        <div className="flex items-center gap-1 text-[10px] text-green-600 font-bold mt-2">
          <ArrowDownRight size={12} /> Total Paid Back
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm border-l-4 border-l-orange-500 overflow-hidden">
        <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Outstanding</p>
        <p className="text-2xl font-black text-gray-900 dark:text-white break-words">₦{((report?.summary.total_issuance || 0) - (report?.summary.total_collection || 0)).toLocaleString()}</p>
        <div className="flex items-center gap-1 text-[10px] text-orange-600 font-bold mt-2">
          <Activity size={12} /> Net Period Balance
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm border-l-4 border-l-amber-500 overflow-hidden">
        <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Total Cost (Issued)</p>
        <p className="text-2xl font-black text-gray-900 dark:text-white break-words">₦{(report?.summary.total_cost_price_issued || 0).toLocaleString()}</p>
        <div className="flex items-center gap-1 text-[10px] text-amber-600 font-bold mt-2">
          <ShoppingCart size={12} /> Cost × Qty All Items
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm border-l-4 border-l-teal-500 overflow-hidden">
        <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Total Cost (Collected)</p>
        <p className="text-2xl font-black text-gray-900 dark:text-white break-words">₦{(report?.summary.total_cost_price_collected || 0).toLocaleString()}</p>
        <div className="flex items-center gap-1 text-[10px] text-teal-600 font-bold mt-2">
          <CreditCard size={12} /> Cost of Paid Items
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm border-l-4 border-l-emerald-600 overflow-hidden">
        <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Credit Profit</p>
        <p className={`text-2xl font-black break-words ${(report?.summary.credit_profit || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          ₦{(report?.summary.credit_profit || 0).toLocaleString()}
        </p>
        <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold mt-2">
          <TrendingUp size={12} /> Collection − Cost Collected
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm border-l-4 border-l-purple-500 overflow-hidden">
        <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Collection Rate</p>
        <p className="text-2xl font-black text-gray-900 dark:text-white break-words">{(report?.summary.collection_rate || 0).toFixed(1)}%</p>
        <div className="flex items-center gap-1 text-[10px] text-purple-600 font-bold mt-2">
          <TrendingUp size={12} /> Recovery Efficiency
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm border-l-4 border-l-blue-500 overflow-hidden">
        <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Total Quantity</p>
        <p className="text-2xl font-black text-gray-900 dark:text-white break-words">{formatQty(report?.summary.total_quantity || 0)}</p>
        <div className="flex items-center gap-1 text-[10px] text-blue-600 font-bold mt-2">
          <Package size={12} /> Units on Credit
        </div>
      </div>
    </div>
  );

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <TrendingUp className="text-pink-600" />
            Issuance vs Collection Trend
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={report?.trends || []}>
                <defs>
                  <linearGradient id="colorIssuance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCollection" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-gray-700" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1f2937', 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    color: '#fff'
                  }} 
                />
                <Legend iconType="circle" />
                <Area type="monotone" dataKey="issuance" stroke="#ec4899" fillOpacity={1} fill="url(#colorIssuance)" name="Issuance (₦)" strokeWidth={3} />
                <Area type="monotone" dataKey="collection" stroke="#10b981" fillOpacity={1} fill="url(#colorCollection)" name="Collection (₦)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Staff Performance */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Users className="text-blue-600" />
            Staff Credit Performance
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report?.staff_performance || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" className="dark:stroke-gray-700" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} />
                <YAxis dataKey="staff_name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} width={100} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1f2937', 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    color: '#fff'
                  }} 
                />
                <Legend iconType="circle" />
                <Bar dataKey="issuance" fill="#ec4899" radius={[0, 4, 4, 0]} name="Credit Given (₦)" />
                <Bar dataKey="collection" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Collected (₦)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Item Analysis */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Package className="text-purple-600" />
            Credit Sales by Item
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-widest border-b border-gray-50 dark:border-gray-700">
                  <th className="pb-3">Item Name</th>
                  <th className="pb-3 text-right">Qty</th>
                  <th className="pb-3 text-right">Value (₦)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {report?.item_analysis.slice(0, 8).map((item, i) => (
                  <tr key={i} className="group hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="py-4 text-sm font-bold text-gray-700 dark:text-gray-300">{item.item_name}</td>
                    <td className="py-4 text-sm font-black text-gray-900 dark:text-white text-right">{formatQty(item.quantity)}</td>
                    <td className="py-4 text-sm font-black text-pink-600 text-right">₦{item.amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Creditor Distribution */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Users className="text-orange-600" />
            Top Creditors
          </h3>
          <div className="space-y-4">
            {report?.creditor_performance.slice(0, 6).map((creditor, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-900/50">
                <div>
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{creditor.creditor_name}</p>
                  <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500">Recovery: {((creditor.collection / (creditor.issuance || 1)) * 100).toFixed(0)}%</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-pink-600">₦{creditor.issuance.toLocaleString()}</p>
                  <p className="text-[10px] font-bold text-green-600">₦{creditor.collection.toLocaleString()} paid</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <CreditTabs />
        
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight mb-2">Credit Reports</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium italic">Deep analytics and financial summaries for the credit system</p>
        </div>

        {/* Page Toggle: Main Reports ↔ Credit Reports */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
            <button
              onClick={() => router.push(`/${pathname.startsWith('/superadmin') ? 'superadmin' : 'admin'}/reports`)}
              className="px-4 py-2 rounded-lg text-sm font-bold transition text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              Main Reports
            </button>
            <button
              className="px-4 py-2 rounded-lg text-sm font-bold bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white transition cursor-default"
            >
              Credit Reports
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <Filter size={16} className="text-gray-400" />
              <select 
                value={filters.dateRange}
                onChange={(e) => setFilters({...filters, dateRange: e.target.value})}
                className="text-sm font-bold text-gray-700 dark:text-gray-200 bg-transparent border-none focus:ring-0 outline-none"
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
                <option value="all">All Time</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <User size={16} className="text-gray-400" />
              <select 
                value={filters.staffId}
                onChange={(e) => setFilters({...filters, staffId: e.target.value})}
                className="text-sm font-bold text-gray-700 dark:text-gray-200 bg-transparent border-none focus:ring-0 outline-none"
              >
                <option value="">All Staff</option>
                {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
            </div>
          </div>

          <button 
            onClick={handleExportPDF}
            className="flex items-center justify-center w-10 h-10 bg-pink-600 rounded-2xl text-white hover:bg-pink-700 transition-all shadow-lg shadow-pink-100 dark:shadow-none"
          >
            <Download size={18} />
          </button>
        </div>

        {filters.dateRange === 'custom' && (
          <div className="grid grid-cols-2 gap-4 mb-8 max-w-md animate-in slide-in-from-top-2 duration-300">
            <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl border border-gray-200 dark:border-gray-700">
              <p className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 mb-1 ml-1">From</p>
              <input 
                type="date" 
                value={filters.customFrom}
                onChange={(e) => setFilters({...filters, customFrom: e.target.value})}
                className="w-full text-sm font-bold text-gray-700 dark:text-gray-200 outline-none bg-transparent"
              />
            </div>
            <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl border border-gray-200 dark:border-gray-700">
              <p className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 mb-1 ml-1">To</p>
              <input 
                type="date" 
                value={filters.customTo}
                onChange={(e) => setFilters({...filters, customTo: e.target.value})}
                className="w-full text-sm font-bold text-gray-700 dark:text-gray-200 outline-none bg-transparent"
              />
            </div>
          </div>
        )}

        {/* Report Content */}
        <div ref={reportRef} className="space-y-8">
          {renderSummaryCards()}
          
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {[
              { id: 'overview', label: 'Overview', icon: Activity },
              { id: 'issuance', label: 'Issuance History', icon: History },
              { id: 'payments', label: 'Payment History', icon: DollarSign },
              { id: 'items', label: 'Itemized Analysis', icon: Package },
              { id: 'creditors', label: 'Creditor Leaderboard', icon: Users },
              { id: 'staff', label: 'Staff Performance', icon: User }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm whitespace-nowrap transition-all border-2 ${
                  activeTab === tab.id 
                    ? 'bg-pink-600 border-pink-600 text-white shadow-lg shadow-pink-100 dark:shadow-none' 
                    : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-pink-200 dark:hover:border-pink-900 hover:bg-pink-50/30 dark:hover:bg-pink-900/10'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="animate-in fade-in duration-500">
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'issuance' && (
              <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-widest border-b border-gray-100 dark:border-gray-700">
                      <th className="pb-4">Receipt #</th>
                      <th className="pb-4">Date</th>
                      <th className="pb-4">Creditor</th>
                      <th className="pb-4">Staff</th>
                      <th className="pb-4 text-right">Amount (₦)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                    {report?.raw.sales.map((s, i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="py-4 text-sm font-black text-gray-900 dark:text-white">{s.receipt_number}</td>
                        <td className="py-4 text-sm text-gray-600 dark:text-gray-400">{new Date(s.created_at).toLocaleDateString()}</td>
                        <td className="py-4 text-sm font-bold text-gray-700 dark:text-gray-300">{s.creditors?.full_name}</td>
                        <td className="py-4 text-sm text-gray-600 dark:text-gray-400">{s.users?.full_name || s.users?.username}</td>
                        <td className="py-4 text-sm font-black text-pink-600 text-right">₦{s.total_amount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {activeTab === 'payments' && (
              <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-widest border-b border-gray-100 dark:border-gray-700">
                      <th className="pb-4">ID</th>
                      <th className="pb-4">Date</th>
                      <th className="pb-4">Creditor</th>
                      <th className="pb-4">Staff</th>
                      <th className="pb-4 text-right">Amount (₦)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                    {report?.raw.payments.map((p, i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="py-4 text-xs font-mono text-gray-400 dark:text-gray-500">#{p.id.slice(0, 8)}</td>
                        <td className="py-4 text-sm text-gray-600 dark:text-gray-400">{new Date(p.created_at).toLocaleDateString()}</td>
                        <td className="py-4 text-sm font-bold text-gray-700 dark:text-gray-300">{p.creditors?.full_name}</td>
                        <td className="py-4 text-sm text-gray-600 dark:text-gray-400">{p.users?.full_name || p.users?.username}</td>
                        <td className="py-4 text-sm font-black text-green-600 text-right">₦{p.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {activeTab === 'items' && (
               <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-x-auto">
               <table className="w-full text-left">
                 <thead>
                   <tr className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-widest border-b border-gray-100 dark:border-gray-700">
                     <th className="pb-4">Item Name</th>
                     <th className="pb-4 text-right">Units Sold on Credit</th>
                     <th className="pb-4 text-right">Total Value (₦)</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                   {report?.item_analysis.map((item, i) => (
                     <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                       <td className="py-4 text-sm font-bold text-gray-700 dark:text-gray-300">{item.item_name}</td>
                       <td className="py-4 text-sm font-black text-gray-900 dark:text-white text-right">{formatQty(item.quantity)}</td>
                       <td className="py-4 text-sm font-black text-pink-600 text-right">₦{item.amount.toLocaleString()}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
            )}
            {activeTab === 'creditors' && (
               <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-x-auto">
               <table className="w-full text-left">
                 <thead>
                   <tr className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-widest border-b border-gray-100 dark:border-gray-700">
                     <th className="pb-4">Creditor Name</th>
                     <th className="pb-4 text-right">Total Issuance (₦)</th>
                     <th className="pb-4 text-right">Total Collection (₦)</th>
                     <th className="pb-4 text-right">Outstanding (₦)</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                   {report?.creditor_performance.map((c, i) => (
                     <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                       <td className="py-4 text-sm font-bold text-gray-700 dark:text-gray-300">{c.creditor_name}</td>
                       <td className="py-4 text-sm font-black text-pink-600 text-right">₦{c.issuance.toLocaleString()}</td>
                       <td className="py-4 text-sm font-black text-green-600 text-right">₦{c.collection.toLocaleString()}</td>
                       <td className="py-4 text-sm font-black text-orange-600 text-right">₦{(c.issuance - c.collection).toLocaleString()}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
            )}
            {activeTab === 'staff' && (
               <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-x-auto">
               <table className="w-full text-left">
                 <thead>
                   <tr className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-widest border-b border-gray-100 dark:border-gray-700">
                     <th className="pb-4">Staff Name</th>
                     <th className="pb-4 text-right">Transactions</th>
                     <th className="pb-4 text-right">Issuance (₦)</th>
                     <th className="pb-4 text-right">Collection (₦)</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                   {report?.staff_performance.map((s, i) => (
                     <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                       <td className="py-4 text-sm font-bold text-gray-700 dark:text-gray-300">{s.staff_name}</td>
                       <td className="py-4 text-sm font-black text-gray-900 dark:text-white text-right">{s.transactions}</td>
                       <td className="py-4 text-sm font-black text-pink-600 text-right">₦{s.issuance.toLocaleString()}</td>
                       <td className="py-4 text-sm font-black text-green-600 text-right">₦{s.collection.toLocaleString()}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
            )}
          </div>
        </div>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
