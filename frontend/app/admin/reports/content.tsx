'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import api from '@/lib/api';
import { formatQty } from '@/lib/format-quantity';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart
} from 'recharts';
import {
  TrendingUp, Download, Filter, Calendar, User, Package, DollarSign,
  Users, Activity, ShoppingCart, Warehouse, AlertCircle, Eye, CreditCard
} from 'lucide-react';
import LoadingLogo from '@/components/LoadingLogo';

interface ReportFilters {
  staffId?: string;
  staffRole?: string;
  dateRange: 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';
  customFrom?: string;
  customTo?: string;
}

interface ComprehensiveReport {
  summary: {
    total_transactions: number;
    total_sales: number;
    total_expenses: number;
    total_profit: number;
    total_main_profit: number;
    total_credit_profit: number;
    total_credit_cost_collected: number;
    total_items_sold: number;
    avg_transaction: number;
    total_cost_price_sold: number;
    total_commission_generated: number;
    total_commission_paid: number;
    total_credits_paid: number;
    total_credits_amount: number;
    total_creditors: number;
  };
  sales: {
    by_staff: Array<any>;
    by_staff_role: Array<any>;
    by_day: Array<any>;
    by_hour?: Array<any>;
    items_list: Array<any>;
  };
  expenses: {
    total: number;
    by_staff: Array<any>;
    by_type: Array<any>;
    by_day: Array<any>;
  };
  inventory: {
    main_store_total: number;
    main_store_total_quantity: number;
    main_store_items: Array<any>;
    active_store_total: number;
    active_store_total_quantity: number;
    active_store_items: Array<any>;
    staff_store_total: number;
    staff_store_total_quantity: number;
    staff_store_items: Array<any>;
    credit_store_total: number;
    credit_store_total_quantity: number;
    credit_store_items: Array<any>;
    low_stock_total: number;
    low_stock_total_quantity: number;
    low_stock_items: Array<any>;
  };
  performance: {
    top_staff: Array<any>;
    top_items: Array<any>;
    staff_details: Array<any>;
  };
}

const COLORS = ['#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316'];

export default function ComprehensiveReportsPage() {
  const reportRef = useRef<HTMLDivElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const [report, setReport] = useState<ComprehensiveReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'expenses' | 'inventory' | 'performance' | 'credits'>('overview');
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [filters, setFilters] = useState<ReportFilters>({
    dateRange: 'all',
  });
  const [selectedMetric, setSelectedMetric] = useState<'revenue' | 'items' | 'profit'>('revenue');
  const [staff, setStaff] = useState<any[]>([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedStaffDetail, setSelectedStaffDetail] = useState<any>(null);
  const [selectedStore, setSelectedStore] = useState<'all' | 'main' | 'active' | 'staff' | 'credit'>('all');

  useEffect(() => {
    fetchAllStaff();
    fetchReport();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [filters]);

  useEffect(() => {
    checkTabsScroll();
    window.addEventListener('resize', checkTabsScroll);
    return () => window.removeEventListener('resize', checkTabsScroll);
  }, []);

  const checkTabsScroll = () => {
    if (tabsContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsContainerRef.current) {
      const scrollAmount = 200;
      tabsContainerRef.current.scroll({
        left: tabsContainerRef.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount),
        behavior: 'smooth',
      });
      setTimeout(checkTabsScroll, 300);
    }
  };

  const fetchAllStaff = async () => {
    try {
      const response = await api.get('/api/admin/staff');
      setStaff(response.data);
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    }
  };

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      // Only send staffId OR staffRole, never both - they should be mutually exclusive
      const params = new URLSearchParams({
        dateRange: filters.dateRange,
        ...(filters.staffId && { staffId: filters.staffId }),
        ...(filters.staffRole && !filters.staffId && { staffRole: filters.staffRole }),
        ...(filters.customFrom && { customFrom: filters.customFrom }),
        ...(filters.customTo && { customTo: filters.customTo }),
      });

      const response = await api.get(`/api/admin/reports/comprehensive?${params}`);
      setReport(response.data);
    } catch (error) {
      console.error('Failed to fetch report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) {
      alert('Report content not found');
      return;
    }

    try {
      const html2canvas = (await import('html2canvas')).default;
      const { default: jsPDF } = await import('jspdf');

      const element = reportRef.current;

      const canvas = await html2canvas(element, {
        scale: 2,
        allowTaint: true,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');

      // Add pages as needed
      while (heightLeft >= 0) {
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= 297; // A4 height in mm
        position -= 297;
        if (heightLeft > 0) {
          pdf.addPage();
        }
      }

      // Generate filename with timestamp
      const dateStr = new Date().toLocaleDateString('en-NG');
      const timeStr = new Date().toLocaleTimeString('en-NG');
      const filename = `Comprehensive_Report_${dateStr}_${timeStr.replace(/:/g, '-')}.pdf`;

      // Download PDF
      pdf.save(filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to export PDF. Please try again.');
    }
  };

  const getFilteredLowStockItems = () => {
    const items = report?.inventory.low_stock_items || [];
    
    if (selectedStore === 'all') {
      return items;
    }

    const storeNames: { [key: string]: string } = {
      main: 'Main',
      active: 'Active',
      staff: 'Staff',
    };

    const selectedStoreName = storeNames[selectedStore] || '';

    // Filter items to only show those that have stock in the selected store
    return items
      .filter((item: any) => {
        const storeEntry = item.stores?.find((store: any) => store.store === selectedStoreName);
        return storeEntry && storeEntry.quantity > 0;
      })
      .map((item: any) => ({
        ...item,
        // Filter stores array to only show the selected store
        stores: item.stores?.filter((store: any) => store.store === selectedStoreName),
      }));
  };

  const renderFilterSection = () => (
    <>
      <div className="flex justify-end mb-4">
        <button
          onClick={handleExportPDF}
          className="flex items-center gap-2 px-6 py-3 bg-pink-600 rounded-2xl text-sm font-bold text-white hover:bg-pink-700 transition-all shadow-lg shadow-pink-100 dark:shadow-none"
        >
          <Download size={18} /> Export PDF
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <Filter size={16} className="text-gray-400" />
          <select
            value={filters.dateRange}
            onChange={(e) => setFilters({ ...filters, dateRange: e.target.value as any })}
            className="text-sm font-bold text-gray-700 dark:text-gray-200 bg-transparent border-none focus:ring-0 outline-none"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
            <option value="custom">Custom Date</option>
          </select>
        </div>

        {filters.dateRange === 'custom' && (
          <>
            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <Calendar size={16} className="text-gray-400" />
              <input
                type="date"
                value={filters.customFrom || ''}
                onChange={(e) => setFilters({ ...filters, customFrom: e.target.value })}
                className="text-sm font-bold text-gray-700 dark:text-gray-200 bg-transparent border-none focus:ring-0 outline-none"
              />
            </div>
            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <Calendar size={16} className="text-gray-400" />
              <input
                type="date"
                value={filters.customTo || ''}
                onChange={(e) => setFilters({ ...filters, customTo: e.target.value })}
                className="text-sm font-bold text-gray-700 dark:text-gray-200 bg-transparent border-none focus:ring-0 outline-none"
              />
            </div>
          </>
        )}

        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <User size={16} className="text-gray-400" />
          <select
            value={filters.staffId || ''}
            onChange={(e) => setFilters({ ...filters, staffId: e.target.value || undefined, staffRole: undefined })}
            className="text-sm font-bold text-gray-700 dark:text-gray-200 bg-transparent border-none focus:ring-0 outline-none"
          >
            <option value="">All Staff</option>
            {staff.filter(s => s.role !== 'superadmin').map(s => (
              <option key={s.id} value={s.id}>{s.full_name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <Filter size={16} className="text-gray-400" />
          <select
            value={filters.staffRole || ''}
            onChange={(e) => setFilters({ ...filters, staffRole: e.target.value || undefined, staffId: undefined })}
            className="text-sm font-bold text-gray-700 dark:text-gray-200 bg-transparent border-none focus:ring-0 outline-none"
          >
            <option value="">All Roles</option>
            <option value="commission_staff">Commission Staff</option>
            <option value="non_commission_staff">Non-Commission Staff</option>
            <option value="sales">Sales Staff</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>
    </>
  );

  const renderSummaryCards = () => {
    const mainProfit = report?.summary.total_main_profit || 0;
    const creditProfit = report?.summary.total_credit_profit || 0;
    const overallProfit = report?.summary.total_profit || 0;
    const isOverallProfitable = overallProfit >= 0;
    const isMainProfitable = mainProfit >= 0;
    const isCreditProfitable = creditProfit >= 0;

    return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      <div className="card border-l-4 border-l-blue-600 overflow-hidden">
        <div className="flex flex-col gap-2">
          <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">Total Sales</p>
          <p className="text-lg sm:text-2xl md:text-3xl font-bold text-blue-700 dark:text-blue-400 break-words">₦{(report?.summary.total_sales || 0).toLocaleString()}</p>
          <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 opacity-20 self-end flex-shrink-0" />
        </div>
      </div>

      <div className={`card border-l-4 ${isOverallProfitable ? 'border-l-green-500' : 'border-l-red-500'} overflow-hidden`}>
        <div className="flex flex-col gap-2">
          <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">Total Profit</p>
          <p className={`text-lg sm:text-2xl md:text-3xl font-bold ${isOverallProfitable ? 'text-green-600' : 'text-red-600'} break-words`}>₦{overallProfit.toLocaleString()}</p>
          <TrendingUp className={`w-6 h-6 sm:w-8 sm:h-8 ${isOverallProfitable ? 'text-green-500' : 'text-red-500'} opacity-20 self-end flex-shrink-0`} />
        </div>
      </div>

      <div className={`card border-l-4 ${isMainProfitable ? 'border-l-emerald-600' : 'border-l-orange-600'} overflow-hidden`}>
        <div className="flex flex-col gap-2">
          <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">Main Sales Profit</p>
          <p className={`text-lg sm:text-2xl md:text-3xl font-bold ${isMainProfitable ? 'text-emerald-700 dark:text-emerald-400' : 'text-orange-700 dark:text-orange-400'} break-words`}>₦{mainProfit.toLocaleString()}</p>
        </div>
      </div>

      <div className={`card border-l-4 ${isCreditProfitable ? 'border-l-teal-500' : 'border-l-amber-500'} overflow-hidden`}>
        <div className="flex flex-col gap-2">
          <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">Credit Sales Profit</p>
          <p className={`text-lg sm:text-2xl md:text-3xl font-bold ${isCreditProfitable ? 'text-teal-700 dark:text-teal-400' : 'text-amber-700 dark:text-amber-400'} break-words`}>₦{creditProfit.toLocaleString()}</p>
        </div>
      </div>

      <div className="card border-l-4 border-l-orange-600 overflow-hidden">
        <div className="flex flex-col gap-2">
          <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">Total Cost Price Sold</p>
          <p className="text-lg sm:text-2xl md:text-3xl font-bold text-orange-700 dark:text-orange-400 break-words">₦{(report?.summary.total_cost_price_sold || 0).toLocaleString()}</p>
          <Warehouse className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600 opacity-20 self-end flex-shrink-0" />
        </div>
      </div>

      <div className="card border-l-4 border-l-rose-600 overflow-hidden">
        <div className="flex flex-col gap-2">
          <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">Total Expenses</p>
          <p className="text-lg sm:text-2xl md:text-3xl font-bold text-rose-700 dark:text-rose-400 break-words">₦{(report?.summary.total_expenses || 0).toLocaleString()}</p>
          <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-rose-600 opacity-20 self-end flex-shrink-0" />
        </div>
      </div>

      <div className="card border-l-4 border-l-purple-500 overflow-hidden">
        <div className="flex flex-col gap-2">
          <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">Total Items Sold</p>
          <p className="text-lg sm:text-2xl md:text-3xl font-bold text-purple-600 break-words">{formatQty(report?.summary.total_items_sold || 0)}</p>
          <ShoppingCart className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500 opacity-20 self-end flex-shrink-0" />
        </div>
      </div>

      <div className="card border-l-4 border-l-teal-600 overflow-hidden">
        <div className="flex flex-col gap-2">
          <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">Total Transactions</p>
          <p className="text-lg sm:text-2xl md:text-3xl font-bold text-teal-700 dark:text-teal-400 break-words">{report?.summary.total_transactions || 0}</p>
          <Activity className="w-6 h-6 sm:w-8 sm:h-8 text-teal-600 opacity-20 self-end flex-shrink-0" />
        </div>
      </div>

      <div className="card border-l-4 border-l-sky-600 overflow-hidden">
        <div className="flex flex-col gap-2">
          <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">Avg Transaction Value</p>
          <p className="text-lg sm:text-2xl md:text-3xl font-bold text-sky-700 dark:text-sky-400 break-words">₦{(report?.summary.avg_transaction || 0).toLocaleString('en-NG', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</p>
          <Package className="w-6 h-6 sm:w-8 sm:h-8 text-sky-600 opacity-20 self-end flex-shrink-0" />
        </div>
      </div>

      <div className="card border-l-4 border-l-amber-500 overflow-hidden">
        <div className="flex flex-col gap-2">
          <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">Total Commission Generated</p>
          <p className="text-lg sm:text-2xl md:text-3xl font-bold text-amber-600 break-words">₦{(report?.summary.total_commission_generated || 0).toLocaleString()}</p>
          <Users className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500 opacity-20 self-end flex-shrink-0" />
        </div>
      </div>

      <div className="card border-l-4 border-l-emerald-500 overflow-hidden">
        <div className="flex flex-col gap-2">
          <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">Total Commission Paid</p>
          <p className="text-lg sm:text-2xl md:text-3xl font-bold text-emerald-600 break-words">₦{(report?.summary.total_commission_paid || 0).toLocaleString()}</p>
          <User className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-500 opacity-20 self-end flex-shrink-0" />
        </div>
      </div>

      <div className="card border-l-4 border-l-pink-500 overflow-hidden">
        <div className="flex flex-col gap-2">
          <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">Total Paid Credits</p>
          <p className="text-lg sm:text-2xl md:text-3xl font-bold text-pink-600 break-words">₦{(report?.summary.total_credits_paid || 0).toLocaleString()}</p>
          <CreditCard className="w-6 h-6 sm:w-8 sm:h-8 text-pink-500 opacity-20 self-end flex-shrink-0" />
        </div>
      </div>
    </div>
  );
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {renderSummaryCards()}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sales by Staff */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Sales by Staff</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={report?.sales.by_staff || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="username" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip content={({ active, payload }) => {
                if (active && payload?.[0]) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-300 dark:border-gray-600 text-sm">
                      <p className="font-semibold">{data.staff_name}</p>
                      <p className="text-gray-600 dark:text-gray-400">Revenue: ₦{data.total_amount?.toLocaleString()}</p>
                    </div>
                  );
                }
                return null;
              }} />
              <Bar dataKey="total_amount" fill="#ec4899" name="Revenue (₦)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Sales by Staff Role */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Sales by Staff Role</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={report?.sales.by_staff_role || []}
                dataKey="total_amount"
                nameKey="role"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {(report?.sales.by_staff_role || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sales Trend */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Sales Trend Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={report?.sales.by_day || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="total_amount" stroke="#ec4899" name="Revenue (₦)" strokeWidth={2} />
            <Line yAxisId="right" type="monotone" dataKey="total_transactions" stroke="#3b82f6" name="Transactions" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderSalesTab = () => (
    <div className="space-y-6">
      {/* Top Items Sold */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-pink-500" />
          Top Items Sold
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Item Name</th>
                <th className="px-4 py-3 text-left font-semibold">Quantity Sold</th>
                <th className="px-4 py-3 text-left font-semibold">Total Amount</th>
                <th className="px-4 py-3 text-left font-semibold">Avg Price</th>
              </tr>
            </thead>
            <tbody>
              {(report?.sales.items_list || []).slice(0, 10).map((item, idx) => (
                <tr key={idx} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-4 py-3 font-medium">{item.item_name}</td>
                  <td className="px-4 py-3">{formatQty(item.quantity_sold)}</td>
                  <td className="px-4 py-3 text-green-600 font-semibold">₦{parseFloat(item.total_revenue).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3">₦{(item.avg_price || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sales by Staff Detailed */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Sales by Staff - Detailed</h3>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={report?.sales.by_staff || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="staff_name" angle={-45} textAnchor="end" height={80} />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="total_transactions" fill="#3b82f6" name="Transactions" />
            <Line yAxisId="right" type="monotone" dataKey="total_amount" stroke="#ec4899" name="Revenue (₦)" strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderExpensesTab = () => (
    <div className="space-y-6">
      {/* Expenses Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card border-l-4 border-l-red-500 overflow-hidden">
          <p className="text-gray-600 dark:text-gray-400 text-sm">Total Expenses</p>
          <p className="text-3xl font-bold text-red-600 break-words">₦{(report?.summary.total_expenses || 0).toLocaleString()}</p>
        </div>
        <div className="card border-l-4 border-l-yellow-500 overflow-hidden">
          <p className="text-gray-600 dark:text-gray-400 text-sm">Expense Entries</p>
          <p className="text-3xl font-bold text-yellow-600 break-words">{report?.expenses.by_staff?.length || 0}</p>
        </div>
        <div className="card border-l-4 border-l-orange-500 overflow-hidden">
          <p className="text-gray-600 dark:text-gray-400 text-sm">Avg Expense per Entry</p>
          <p className="text-3xl font-bold text-orange-600 break-words">
            ₦{report?.expenses.by_staff && report.expenses.by_staff.length > 0
              ? Math.round((report.summary.total_expenses / report.expenses.by_staff.length))
              : 0}
          </p>
        </div>
      </div>

      {/* Expenses by Staff */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Expenses by Staff</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={report?.expenses.by_staff || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="staff_name" angle={-45} textAnchor="end" height={80} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="total_amount" fill="#ef4444" name="Expense Amount (₦)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Expenses by Type */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Expenses by Type</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={report?.expenses.by_type || []}
              dataKey="total_amount"
              nameKey="expense_type"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label
            >
              {(report?.expenses.by_type || []).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Expenses Trend */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Expenses Trend Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={report?.expenses.by_day || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="total_amount" stroke="#ef4444" name="Expense Amount (₦)" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderInventoryTab = () => (
    <div className="space-y-6">
      {/* Data Quality Alert */}
      {(report?.inventory.main_store_items || []).some((item: any) => item.item_name?.includes('Item')) && (
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 rounded-lg p-4">
          <h3 className="text-red-800 dark:text-red-200 font-bold mb-2 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            ⚠️ Data Issue: Item Names Not Matching
          </h3>
          <p className="text-red-700 dark:text-red-300 text-sm mb-3">
            Item names are showing as IDs instead of actual names. This means the inventory database has invalid item IDs.
          </p>
          <p className="text-red-700 dark:text-red-300 text-sm font-mono bg-red-100 dark:bg-red-800 p-2 rounded mb-3">
            <strong>Quick Fix:</strong> Run the FIX_INVENTORY_DATA.sql script in Supabase SQL Editor. Check your desktop for FIX_INVENTORY_DATA.sql file.
          </p>
          <p className="text-red-600 dark:text-red-300 text-xs">
            This script will rebuild inventory tables with valid item IDs and show correct names and prices.
          </p>
        </div>
      )}

      {/* Inventory Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
        <div className="card border-l-4 border-l-indigo-500 overflow-hidden">
          <p className="text-gray-600 dark:text-gray-400 text-xs md:text-sm">Total Items</p>
          <p className="text-2xl md:text-3xl font-bold text-indigo-600 break-words">
            {((report?.inventory.main_store_total || 0) + (report?.inventory.active_store_total || 0) + (report?.inventory.staff_store_total || 0) + (report?.inventory.credit_store_total || 0))}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 md:mt-2">
            Quantity: {((report?.inventory.main_store_total_quantity || 0) + (report?.inventory.active_store_total_quantity || 0) + (report?.inventory.staff_store_total_quantity || 0) + (report?.inventory.credit_store_total_quantity || 0))}
          </p>
        </div>
        <div className="card border-l-4 border-l-blue-500 overflow-hidden">
          <p className="text-gray-600 dark:text-gray-400 text-xs md:text-sm">Main Store</p>
          <p className="text-2xl md:text-3xl font-bold text-blue-600 break-words">{report?.inventory.main_store_total || 0}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 md:mt-2">Quantity: {report?.inventory.main_store_total_quantity || 0}</p>
        </div>
        <div className="card border-l-4 border-l-green-500 overflow-hidden">
          <p className="text-gray-600 dark:text-gray-400 text-xs md:text-sm">Active Store</p>
          <p className="text-2xl md:text-3xl font-bold text-green-600 break-words">{report?.inventory.active_store_total || 0}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 md:mt-2">Quantity: {report?.inventory.active_store_total_quantity || 0}</p>
        </div>
        <div className="card border-l-4 border-l-purple-500 overflow-hidden">
          <p className="text-gray-600 dark:text-gray-400 text-xs md:text-sm">Staff Store</p>
          <p className="text-2xl md:text-3xl font-bold text-purple-600 break-words">{report?.inventory.staff_store_total || 0}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 md:mt-2">Quantity: {report?.inventory.staff_store_total_quantity || 0}</p>
        </div>
        <div className="card border-l-4 border-l-rose-500 overflow-hidden">
          <p className="text-gray-600 dark:text-gray-400 text-xs md:text-sm">Credit Store</p>
          <p className="text-2xl md:text-3xl font-bold text-rose-600 break-words">{report?.inventory.credit_store_total || 0}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 md:mt-2">Quantity: {report?.inventory.credit_store_total_quantity || 0}</p>
        </div>
      </div>

      {/* Store Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedStore('all')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            selectedStore === 'all'
              ? 'bg-blue-500 text-white shadow-lg'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          All Stores
        </button>
        <button
          onClick={() => setSelectedStore('main')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            selectedStore === 'main'
              ? 'bg-blue-500 text-white shadow-lg'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          Main Store
        </button>
        <button
          onClick={() => setSelectedStore('active')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            selectedStore === 'active'
              ? 'bg-blue-500 text-white shadow-lg'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          Active Store
        </button>
        <button
          onClick={() => setSelectedStore('staff')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            selectedStore === 'staff'
              ? 'bg-blue-500 text-white shadow-lg'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          Staff Store
        </button>
        <button
          onClick={() => setSelectedStore('credit')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            selectedStore === 'credit'
              ? 'bg-blue-500 text-white shadow-lg'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          Credit Store
        </button>
      </div>

      {/* Main Store Inventory */}
      {(selectedStore === 'all' || selectedStore === 'main') && (
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white flex items-center gap-2">
          <Warehouse className="w-5 h-5 text-blue-500" />
          Main Store Inventory
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Item Name</th>
                <th className="px-4 py-3 text-left font-semibold">Quantity</th>
                <th className="px-4 py-3 text-left font-semibold">Unit Price</th>
                <th className="px-4 py-3 text-left font-semibold">Total Value</th>
              </tr>
            </thead>
            <tbody>
              {(report?.inventory.main_store_items || []).slice(0, 15).map((item, idx) => (
                <tr key={idx} className={`border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 ${item.unit_price === 0 ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                  <td className="px-4 py-3 font-medium">
                    {item.item_name}
                    {item.unit_price === 0 && (
                      <span className="text-xs text-red-600 dark:text-red-400 ml-2 font-normal">(⚠️ Invalid Item ID)</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{formatQty(item.quantity)}</td>
                  <td className="px-4 py-3">
                    {item.unit_price === 0 ? (
                      <span className="text-red-600 dark:text-red-400 font-semibold">₦0 (Invalid)</span>
                    ) : (
                      `₦${(item.unit_price || 0).toLocaleString()}`
                    )}
                  </td>
                  <td className="px-4 py-3 text-green-600 font-semibold">
                    {item.unit_price === 0 ? (
                      <span className="text-red-600 dark:text-red-400">₦0 (Invalid)</span>
                    ) : (
                      `₦${((item.quantity || 0) * (item.unit_price || 0)).toLocaleString()}`
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Active Store Inventory */}
      {(selectedStore === 'all' || selectedStore === 'active') && (
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white flex items-center gap-2">
          <Warehouse className="w-5 h-5 text-green-500" />
          Active Store Inventory
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Item Name</th>
                <th className="px-4 py-3 text-left font-semibold">Quantity</th>
                <th className="px-4 py-3 text-left font-semibold">Unit Price</th>
                <th className="px-4 py-3 text-left font-semibold">Total Value</th>
              </tr>
            </thead>
            <tbody>
              {(report?.inventory.active_store_items || []).slice(0, 15).map((item, idx) => (
                <tr key={idx} className={`border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 ${item.unit_price === 0 ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                  <td className="px-4 py-3 font-medium">
                    {item.item_name}
                    {item.unit_price === 0 && (
                      <span className="text-xs text-red-600 dark:text-red-400 ml-2 font-normal">(⚠️ Invalid Item ID)</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{formatQty(item.quantity)}</td>
                  <td className="px-4 py-3">
                    {item.unit_price === 0 ? (
                      <span className="text-red-600 dark:text-red-400 font-semibold">₦0 (Invalid)</span>
                    ) : (
                      `₦${(item.unit_price || 0).toLocaleString()}`
                    )}
                  </td>
                  <td className="px-4 py-3 text-green-600 font-semibold">
                    {item.unit_price === 0 ? (
                      <span className="text-red-600 dark:text-red-400">₦0 (Invalid)</span>
                    ) : (
                      `₦${((item.quantity || 0) * (item.unit_price || 0)).toLocaleString()}`
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Staff Store Inventory */}
      {(selectedStore === 'all' || selectedStore === 'staff') && (
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white flex items-center gap-2">
          <Warehouse className="w-5 h-5 text-purple-500" />
          Staff Store Inventory
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Item Name</th>
                <th className="px-4 py-3 text-left font-semibold">Quantity</th>
                <th className="px-4 py-3 text-left font-semibold">Available</th>
                <th className="px-4 py-3 text-left font-semibold">Unit Price</th>
                <th className="px-4 py-3 text-left font-semibold">Total Value</th>
              </tr>
            </thead>
            <tbody>
              {(report?.inventory.staff_store_items || []).slice(0, 15).map((item, idx) => (
                <tr key={idx} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-4 py-3 font-medium">{item.item_name}</td>
                  <td className="px-4 py-3">{formatQty(item.quantity)}</td>
                  <td className="px-4 py-3">{formatQty(item.quantity_available || item.quantity)}</td>
                  <td className="px-4 py-3">₦{(item.unit_price || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-green-600 font-semibold">₦{((item.quantity || 0) * (item.unit_price || 0)).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Credit Store Inventory */}
      {(selectedStore === 'all' || selectedStore === 'credit') && (
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white flex items-center gap-2">
          <Warehouse className="w-5 h-5 text-rose-500" />
          Credit Store Inventory
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Item Name</th>
                <th className="px-4 py-3 text-left font-semibold">Quantity</th>
                <th className="px-4 py-3 text-left font-semibold">Unit Price</th>
                <th className="px-4 py-3 text-left font-semibold">Total Value</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {(report?.inventory.credit_store_items || []).slice(0, 15).map((item, idx) => (
                <tr key={idx} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-4 py-3 font-medium">{item.item_name}</td>
                  <td className="px-4 py-3">{formatQty(item.quantity)}</td>
                  <td className="px-4 py-3">₦{(item.unit_price || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-rose-600 font-semibold">₦{((item.quantity || 0) * (item.unit_price || 0)).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      item.status === 'active' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' :
                      item.status === 'partially_paid' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                      item.status === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
                      item.status === 'returned' || item.status === 'available_for_return' ? 'bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {item.status?.replace(/_/g, ' ') || 'unknown'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Low Stock Items - Action Required */}
      {getFilteredLowStockItems().length > 0 && (
        <div className="card border-2 border-orange-300 bg-orange-50 dark:bg-orange-900/20">
          <h3 className="text-lg font-semibold mb-4 text-orange-800 dark:text-orange-200 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Low Stock Items - Action Required 
            {selectedStore === 'main' && ' (Main Store)'}
            {selectedStore === 'active' && ' (Active Store)'}
            {selectedStore === 'staff' && ' (Staff Store)'}
            {selectedStore === 'all' && ' (All Stores)'}
            {' (Combined Quantity < 100)'}
          </h3>
          <div className="text-xs text-orange-700 dark:text-orange-300 mb-4 p-2 bg-orange-100 dark:bg-orange-900/30 rounded">
            <p><strong>Reorder Level:</strong> Minimum stock level before reordering. When stock falls below this, consider placing a new order.</p>
            <p><strong>Status:</strong> Urgent (0-19 qty), Critical (20-49 qty), Low (50-99 qty)</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-orange-100 dark:bg-orange-800">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Item Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Total Quantity</th>
                  <th className="px-4 py-3 text-left font-semibold">Reorder Level</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Stores</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredLowStockItems().map((item, idx) => (
                  <tr key={idx} className={`border-b dark:border-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20 ${item.unit_price === 0 ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                    <td className="px-4 py-3 font-medium">
                      {item.item_name || `Item ${item.item_id}`}
                      {item.unit_price === 0 && (
                        <span className="text-xs text-red-600 dark:text-red-400 ml-2 font-normal">(⚠️ Invalid)</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-lg">{item.total_quantity}</span>
                    </td>
                    <td className="px-4 py-3">100</td>
                    <td className="px-4 py-3">
                      <span className={`px-3 py-1 rounded text-xs font-semibold text-white ${
                        item.status === 'Urgent' ? 'bg-red-600' :
                        item.status === 'Critical' ? 'bg-red-500' :
                        'bg-orange-500'
                      }`}>
                        {item.status || 'Low'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {item.stores && item.stores.length > 0 ? (
                        <div className="space-y-1">
                          {item.stores.map((store: any, i: number) => (
                            <div key={i}>{store.store}: {formatQty(store.quantity)}</div>
                          ))}
                        </div>
                      ) : (
                        'N/A'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  const renderPerformanceTab = () => (
    <div className="space-y-6">
      {/* Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Staff by Sales */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            Top Staff by Sales
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={report?.performance.top_staff || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="username" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip content={({ active, payload }) => {
                if (active && payload?.[0]) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-300 dark:border-gray-600 text-sm">
                      <p className="font-semibold">{data.staff_name}</p>
                      <p className="text-gray-600 dark:text-gray-400">Revenue: ₦{data.total_amount?.toLocaleString()}</p>
                    </div>
                  );
                }
                return null;
              }} />
              <Bar dataKey="total_amount" fill="#10b981" name="Sales (₦)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Items by Sales */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-blue-500" />
            Top Items by Sales
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={report?.performance.top_items || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="item_name" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total_revenue" fill="#3b82f6" name="Sales (₦)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Staff Performance */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-500" />
          Staff Performance Details
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Staff Name</th>
                <th className="px-4 py-3 text-left font-semibold">Role</th>
                <th className="px-4 py-3 text-left font-semibold">Transactions</th>
                <th className="px-4 py-3 text-left font-semibold">Total Sales</th>
                <th className="px-4 py-3 text-left font-semibold">Expenses</th>
                <th className="px-4 py-3 text-left font-semibold">Profit/Loss</th>
                <th className="px-4 py-3 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(report?.performance.staff_details || []).map((staff, idx) => (
                <tr key={idx} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-4 py-3 font-medium">{staff.staff_name}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs font-semibold">
                      {staff.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">{staff.total_transactions}</td>
                  <td className="px-4 py-3 text-green-600 font-semibold">₦{(staff.total_revenue || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-red-600 font-semibold">₦{(staff.total_expenses || 0).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${(staff.profit_loss || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ₦{(staff.profit_loss || 0).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => {
                        setSelectedStaffDetail(staff);
                        setShowDetailsModal(true);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition"
                    >
                      <Eye className="w-3 h-3" />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );



  const renderCreditsTab = () => (
    <div className="space-y-6">
      {/* Credits Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card border-l-4 border-l-pink-600 overflow-hidden">
          <div className="flex flex-col gap-2">
            <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">Total Credits Amount</p>
            <p className="text-lg sm:text-2xl md:text-3xl font-bold text-pink-700 dark:text-pink-400 break-words">₦{(report?.summary.total_credits_amount || 0).toLocaleString()}</p>
            <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-pink-600 opacity-20 self-end flex-shrink-0" />
          </div>
        </div>

        <div className="card border-l-4 border-l-blue-600 overflow-hidden">
          <div className="flex flex-col gap-2">
            <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">Credits Paid</p>
            <p className="text-lg sm:text-2xl md:text-3xl font-bold text-blue-700 dark:text-blue-400 break-words">₦{(report?.summary.total_credits_paid || 0).toLocaleString()}</p>
            <ShoppingCart className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 opacity-20 self-end flex-shrink-0" />
          </div>
        </div>

        <div className="card border-l-4 border-l-orange-600 overflow-hidden">
          <div className="flex flex-col gap-2">
            <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">Credits Outstanding</p>
            <p className="text-lg sm:text-2xl md:text-3xl font-bold text-orange-700 dark:text-orange-400 break-words">₦{((report?.summary.total_credits_amount || 0) - (report?.summary.total_credits_paid || 0)).toLocaleString()}</p>
            <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600 opacity-20 self-end flex-shrink-0" />
          </div>
        </div>

        <div className="card border-l-4 border-l-purple-600 overflow-hidden">
          <div className="flex flex-col gap-2">
            <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">Total Creditors</p>
            <p className="text-lg sm:text-2xl md:text-3xl font-bold text-purple-700 dark:text-purple-400 break-words">{report?.summary.total_creditors || 0}</p>
            <Users className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 opacity-20 self-end flex-shrink-0" />
          </div>
        </div>
      </div>

      {/* Credits Information */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-pink-500" />
          Credit System Summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Credits (Items Sold on Credit)</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">₦{(report?.summary.total_credits_amount || 0).toLocaleString()}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
              Total value of items given on credit to all creditors
            </p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded">
            <p className="text-sm text-gray-600 dark:text-gray-400">Amount Recovered (Paid)</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">₦{(report?.summary.total_credits_paid || 0).toLocaleString()}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
              Total amount creditors have paid back
            </p>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded">
            <p className="text-sm text-gray-600 dark:text-gray-400">Outstanding Balance</p>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">₦{((report?.summary.total_credits_amount || 0) - (report?.summary.total_credits_paid || 0)).toLocaleString()}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
              Total amount still owed by creditors
            </p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded">
            <p className="text-sm text-gray-600 dark:text-gray-400">Collection Rate</p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {report?.summary.total_credits_amount && report.summary.total_credits_amount > 0 
                ? ((((report?.summary.total_credits_paid || 0) / (report?.summary.total_credits_amount || 1)) * 100).toFixed(1))
                : '0'}%
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
              Percentage of credits recovered
            </p>
          </div>
        </div>
      </div>

      {/* Info Message */}
      <div className="card bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <strong>Note:</strong> The credits system tracks all items given to customers on credit, payments received, and outstanding balances.
          Visit the <strong>Credit Management</strong> page to manage creditors, view payment history, and process credit payments.
        </p>
      </div>
    </div>
  );

  return (
    <div ref={reportRef} className="space-y-6 bg-white dark:bg-gray-900 p-6 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <BarChart className="w-8 h-8 text-blue-500" />
          Comprehensive Analytics & Reports
        </h1>
      </div>

      {/* Page Toggle: Main Reports ↔ Credit Reports */}
      <div className="flex justify-center mb-4">
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          <button
            className="px-4 py-2 rounded-lg text-sm font-bold bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white transition cursor-default"
          >
            Main Reports
          </button>
          <button
            onClick={() => router.push(`/${pathname.startsWith('/superadmin') ? 'superadmin' : 'admin'}/credit-reports`)}
            className="px-4 py-2 rounded-lg text-sm font-bold transition text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            Credit Reports
          </button>
        </div>
      </div>

      {renderFilterSection()}

      {/* Tab Navigation with Scroll Indicators */}
      <div className="relative">
        {/* Left Arrow - visible on mobile/tablet */}
        {canScrollLeft && (
          <button
            onClick={() => scrollTabs('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-gradient-to-r from-white dark:from-gray-900 to-transparent md:hidden p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition"
            aria-label="Scroll tabs left"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Tabs Container */}
        <div
          ref={tabsContainerRef}
          className="flex gap-2 border-b dark:border-gray-700 overflow-x-auto scrollbar-hide"
          onScroll={checkTabsScroll}
        >
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'sales', label: 'Sales Analysis', icon: ShoppingCart },
            { id: 'expenses', label: 'Expenses', icon: AlertCircle },
            { id: 'inventory', label: 'Inventory', icon: Warehouse },
            { id: 'performance', label: 'Performance', icon: TrendingUp },
            { id: 'credits', label: 'Credits', icon: CreditCard },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-3 font-medium border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Right Arrow - visible on mobile/tablet */}
        {canScrollRight && (
          <button
            onClick={() => scrollTabs('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-gradient-to-l from-white dark:from-gray-900 to-transparent md:hidden p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition"
            aria-label="Scroll tabs right"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {activeTab === 'overview' && renderOverviewTab()}
      {activeTab === 'sales' && renderSalesTab()}
      {activeTab === 'expenses' && renderExpensesTab()}
      {activeTab === 'inventory' && renderInventoryTab()}
      {activeTab === 'performance' && renderPerformanceTab()}
      {activeTab === 'credits' && renderCreditsTab()}

      {showDetailsModal && selectedStaffDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">{selectedStaffDetail.staff_name}</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-100 dark:bg-blue-900 rounded">
                <p className="text-sm text-gray-600 dark:text-gray-400">Role</p>
                <p className="text-lg font-bold">{selectedStaffDetail.role}</p>
              </div>
              <div className="p-4 bg-green-100 dark:bg-green-900 rounded">
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Sales</p>
                <p className="text-lg font-bold text-green-600">₦{(selectedStaffDetail.total_revenue || 0).toLocaleString()}</p>
              </div>
              <div className="p-4 bg-red-100 dark:bg-red-900 rounded">
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Expenses</p>
                <p className="text-lg font-bold text-red-600">₦{(selectedStaffDetail.total_expenses || 0).toLocaleString()}</p>
              </div>
              <div className="p-4 bg-purple-100 dark:bg-purple-900 rounded">
                <p className="text-sm text-gray-600 dark:text-gray-400">Profit/Loss</p>
                <p className={`text-lg font-bold ${(selectedStaffDetail.profit_loss || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₦{(selectedStaffDetail.profit_loss || 0).toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-cyan-100 dark:bg-cyan-900 rounded">
                <p className="text-sm text-gray-600 dark:text-gray-400">Transactions</p>
                <p className="text-lg font-bold">{selectedStaffDetail.total_transactions}</p>
              </div>
              <div className="p-4 bg-orange-100 dark:bg-orange-900 rounded">
                <p className="text-sm text-gray-600 dark:text-gray-400">Profit Margin</p>
                <p className="text-lg font-bold">
                  {selectedStaffDetail.total_revenue > 0
                    ? ((selectedStaffDetail.profit_loss / selectedStaffDetail.total_revenue) * 100).toFixed(2)
                    : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
