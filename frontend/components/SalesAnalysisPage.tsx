'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  BarChart3, 
  Users, 
  DollarSign, 
  Package, 
  ShoppingCart, 
  Calendar, 
  Filter, 
  ArrowUpDown, 
  ChevronDown, 
  ChevronUp, 
  Search, 
  Download, 
  RefreshCw, 
  FileSpreadsheet,
  FileText,
  UserCheck,
  Award
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar
} from 'recharts';
import api from '@/lib/api';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

interface SalesAnalysisPageProps {
  portalType: 'admin' | 'superadmin';
}

export default function SalesAnalysisPage({ portalType }: SalesAnalysisPageProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const [staffList, setStaffList] = useState<any[]>([]);

  // Helper functions for date initialization
  const getFirstDayOfMonthStr = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
  };

  const getTodayStr = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Filters State
  const [dateRange, setDateRange] = useState<'today' | 'yesterday' | 'week' | 'month' | 'custom' | 'all'>('all');
  const [customFrom, setCustomFrom] = useState(getFirstDayOfMonthStr());
  const [customTo, setCustomTo] = useState(getTodayStr());
  const [staffId, setStaffId] = useState('');
  const [staffRole, setStaffRole] = useState('');

  // Table Search, Sort, Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'item_name' | 'category' | 'total_quantity_sold' | 'total_revenue'>('total_quantity_sold');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Row Expansion State (holds the item_id of the expanded row)
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  // Set mounted state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch staff list for the filter
  const fetchStaff = async () => {
    try {
      const response = await api.get('/api/admin/staff');
      setStaffList(response.data || []);
    } catch (error) {
      console.error('Error fetching staff list:', error);
    }
  };

  // Fetch sales analysis report
  const fetchReport = async () => {
    setLoading(true);
    try {
      const params: any = { dateRange };
      
      if (dateRange === 'custom') {
        if (customFrom) params.customFrom = customFrom;
        if (customTo) params.customTo = customTo;
      }
      if (staffId) params.staffId = staffId;
      if (staffRole) params.staffRole = staffRole;

      const response = await api.get('/api/admin/reports/sales-analysis', { params });
      setReportData(response.data);
    } catch (error: any) {
      console.error('Error fetching sales analysis:', error);
      toast.error(error.response?.data?.error || 'Failed to load sales analysis data');
    } finally {
      setLoading(false);
    }
  };

  // Load staff on mount
  useEffect(() => {
    if (mounted) {
      fetchStaff();
    }
  }, [mounted]);

  // Load report when filters change
  useEffect(() => {
    if (mounted) {
      // Don't fetch custom range unless both fields are set
      if (dateRange === 'custom' && (!customFrom || !customTo)) {
        return;
      }
      fetchReport();
    }
  }, [mounted, dateRange, customFrom, customTo, staffId, staffRole]);

  // Reset page index on search or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortField, sortOrder, reportData]);

  // Format Currency
  const formatCurrency = (amount: number) => {
    return '₦' + Number(amount || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (!reportData || !reportData.items) {
      toast.warning('No data available to export');
      return;
    }

    try {
      // 1. Overview Sheet Data
      const summaryData = [
        { Metric: 'Report Name', Value: 'Staff Sales Analysis Report' },
        { Metric: 'Date Range Category', Value: dateRange.toUpperCase() },
        { Metric: 'Resolved Range From', Value: reportData.filters?.resolvedFrom ? new Date(reportData.filters.resolvedFrom).toLocaleString() : 'N/A' },
        { Metric: 'Resolved Range To', Value: reportData.filters?.resolvedTo ? new Date(reportData.filters.resolvedTo).toLocaleString() : 'N/A' },
        { Metric: 'Staff Filter', Value: staffId ? (staffList.find(s => s.id === staffId)?.full_name || staffId) : 'All Staff' },
        { Metric: 'Staff Role Filter', Value: staffRole ? staffRole.toUpperCase() : 'All Roles' },
        { Metric: 'Total Amount Sold', Value: reportData.stats?.totalAmountSold || 0 },
        { Metric: 'Total Transactions', Value: reportData.stats?.totalTransactions || 0 },
        { Metric: 'Total Unique Items Sold', Value: reportData.stats?.totalItemsSold || 0 },
        { Metric: 'Total Quantity Sold', Value: reportData.stats?.totalQuantitySold || 0 },
      ];

      // 2. Items Breakdown Sheet Data
      const itemsSheetData = reportData.items.map((item: any) => ({
        'Item Name': item.item_name,
        'SKU': item.sku || 'N/A',
        'Category': item.category || 'General',
        'Brand': item.brand || 'N/A',
        'Package Type': item.package_type || 'N/A',
        'Base Price': item.unit_price || 0,
        'Total Quantity Sold': item.total_quantity_sold || 0,
        'Total Revenue Generated': item.total_revenue || 0,
        'Sales Count (Transactions)': item.total_transactions || 0,
      }));

      // 3. Staff Summary Sheet Data
      const staffSheetData = (reportData.staffPerformance || []).map((staff: any) => ({
        'Staff Name': staff.name,
        'Role': staff.role || 'N/A',
        'Unique Items Sold': staff.quantity || 0,
        'Total Revenue Generated': staff.revenue || 0,
        'Sales Count (Transactions)': staff.transactions || 0,
      }));

      // Create workbook and worksheets
      const wb = XLSX.utils.book_new();
      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      const wsItems = XLSX.utils.json_to_sheet(itemsSheetData);
      const wsStaff = XLSX.utils.json_to_sheet(staffSheetData);

      // Append worksheets
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Report Overview');
      XLSX.utils.book_append_sheet(wb, wsItems, 'Product Sales Summary');
      XLSX.utils.book_append_sheet(wb, wsStaff, 'Staff Sales Performance');

      // Write workbook file
      XLSX.writeFile(wb, `Sales_Analysis_${dateRange}_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Excel spreadsheet exported successfully');
    } catch (err) {
      console.error('Excel export error:', err);
      toast.error('Failed to export Excel report');
    }
  };

  // Client-side Filter, Search, and Sort
  const filteredAndSortedItems = useMemo(() => {
    if (!reportData || !reportData.items) return [];

    // Filter out items with quantity sold equal to 0
    let result = reportData.items.filter((item: any) => (item.total_quantity_sold || 0) > 0);

    // Filter by search query (Name or SKU)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (item: any) => 
          (item.item_name && item.item_name.toLowerCase().includes(q)) || 
          (item.sku && item.sku.toLowerCase().includes(q)) ||
          (item.category && item.category.toLowerCase().includes(q))
      );
    }

    // Sort items
    result.sort((a: any, b: any) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Handle null/undefined values safely to prevent TypeError: Cannot read properties of null (reading 'toLowerCase')
      if (aVal === null || aVal === undefined) aVal = typeof bVal === 'number' ? 0 : '';
      if (bVal === null || bVal === undefined) bVal = typeof aVal === 'number' ? 0 : '';

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [reportData, searchQuery, sortField, sortOrder]);

  // Client-side Paginated Items
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedItems.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedItems, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedItems.length / itemsPerPage));

  // Toggle sorting header
  const handleSort = (field: 'item_name' | 'category' | 'total_quantity_sold' | 'total_revenue') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Render sorting icon indicator
  const renderSortIcon = (field: 'item_name' | 'category' | 'total_quantity_sold' | 'total_revenue') => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition" />;
    }
    return sortOrder === 'asc' ? (
      <ChevronUp className="w-3.5 h-3.5 text-primary-500 font-bold" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-primary-500 font-bold" />
    );
  };

  // Trigger browser print
  const handlePrint = () => {
    window.print();
  };

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 print:p-0 print:space-y-4">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="text-primary-500 w-8 h-8" />
            Sales Analysis
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Perform granular analysis on quantities and revenues of all items sold by all staff in your store system.
          </p>
        </div>

        <div className="flex items-center gap-2 print:hidden">
          <button 
            onClick={fetchReport} 
            className="p-2.5 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
            title="Refresh Data"
            disabled={loading}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button 
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 font-semibold text-sm transition"
          >
            <FileSpreadsheet className="w-5 h-5" />
            <span>Export Excel</span>
          </button>

          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 font-semibold text-sm transition"
          >
            <FileText className="w-5 h-5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* FILTER CONTROL PANEL */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-800 p-5 shadow-sm print:hidden">
        <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 border-b border-gray-100 dark:border-slate-700 pb-3 mb-4">
          <Filter className="w-5 h-5 text-primary-500" />
          <span>Interactive Filters & Controls</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Date Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Date Range Filter</label>
            <div className="relative">
              <select 
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent cursor-pointer"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="week">This Week (Last 7 Days)</option>
                <option value="month">This Month</option>
                <option value="custom">Custom Date Range</option>
              </select>
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Staff Member Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Staff Member</label>
            <div className="relative">
              <select 
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent cursor-pointer"
              >
                <option value="">All Staff Members</option>
                {staffList.map((staff) => (
                  <option key={staff.id} value={staff.id}>{staff.full_name} ({staff.role})</option>
                ))}
              </select>
              <Users className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Staff Role Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Staff Role Category</label>
            <div className="relative">
              <select 
                value={staffRole}
                onChange={(e) => setStaffRole(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent cursor-pointer"
              >
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Super Admin</option>
                <option value="sales">Sales Portal Staff</option>
                <option value="commission">Commission Staff</option>
                <option value="non_commission">Non Commission Staff</option>
              </select>
              <Award className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Search Box */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Search Products</label>
            <div className="relative">
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search items name or SKU..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Custom Date Inputs */}
        {dateRange === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 p-4 border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 rounded-lg animate-fadeIn">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Date Range From</label>
              <input 
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Date Range To</label>
              <input 
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        )}
      </div>

      {/* RENDER BODY */}
      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-850 h-28 rounded-xl animate-pulse"></div>
            ))}
          </div>
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-850 h-[350px] rounded-xl animate-pulse"></div>
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-850 h-96 rounded-xl animate-pulse"></div>
        </div>
      ) : (
        <>
          {/* STATS CARD SECTION */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Total Revenue */}
            <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-slate-800 dark:to-slate-850 rounded-xl border border-indigo-100 dark:border-slate-800 p-5 shadow-sm transition hover:shadow-md hover:-translate-y-0.5 duration-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-500">Total Amount Sold</span>
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 break-all">
                  {formatCurrency(reportData?.stats?.totalAmountSold || 0)}
                </h3>
                <p className="text-xs text-slate-400 mt-1">Total revenue value</p>
              </div>
              <div className="bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 p-3.5 rounded-xl">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>

            {/* Total Transactions */}
            <div className="bg-gradient-to-br from-emerald-50 to-white dark:from-slate-800 dark:to-slate-850 rounded-xl border border-emerald-100 dark:border-slate-800 p-5 shadow-sm transition hover:shadow-md hover:-translate-y-0.5 duration-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-500">Total Transactions</span>
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {(reportData?.stats?.totalTransactions || 0).toLocaleString()}
                </h3>
                <p className="text-xs text-slate-400 mt-1">Distinct checkouts</p>
              </div>
              <div className="bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-3.5 rounded-xl">
                <ShoppingCart className="w-6 h-6" />
              </div>
            </div>

            {/* Total Unique Items Sold */}
            <div className="bg-gradient-to-br from-rose-50 to-white dark:from-slate-800 dark:to-slate-850 rounded-xl border border-rose-100 dark:border-slate-800 p-5 shadow-sm transition hover:shadow-md hover:-translate-y-0.5 duration-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-rose-500">Total Unique Items</span>
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {(reportData?.stats?.totalItemsSold || 0).toLocaleString()}
                </h3>
                <p className="text-xs text-slate-400 mt-1">Unique products sold</p>
              </div>
              <div className="bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 p-3.5 rounded-xl">
                <Package className="w-6 h-6" />
              </div>
            </div>

            {/* Total Quantities Sold */}
            <div className="bg-gradient-to-br from-amber-50 to-white dark:from-slate-800 dark:to-slate-850 rounded-xl border border-amber-100 dark:border-slate-800 p-5 shadow-sm transition hover:shadow-md hover:-translate-y-0.5 duration-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-500">Total Quantity Sold</span>
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {(reportData?.stats?.totalQuantitySold || 0).toLocaleString()}
                </h3>
                <p className="text-xs text-slate-400 mt-1">Total physical items volume</p>
              </div>
              <div className="bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 p-3.5 rounded-xl">
                <BarChart3 className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* MAIN PRODUCT TABLE & EXPANSION LIST */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-slate-750 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Quantities Sold by Products (Items)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Showing overall breakdown metrics for all items in the database. Click on a product row to view the detailed staff breakdown list.
                </p>
              </div>

              <div className="text-xs bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-400">
                Filtered Items: {filteredAndSortedItems.length} Products
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-gray-200 dark:border-slate-750">
                    <th className="py-4 px-5"></th>
                    <th 
                      onClick={() => handleSort('item_name')}
                      className="py-4 px-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 select-none group"
                    >
                      <div className="flex items-center gap-1">
                        <span>Product Item</span>
                        {renderSortIcon('item_name')}
                      </div>
                    </th>
                    <th className="py-4 px-3">SKU</th>
                    <th 
                      onClick={() => handleSort('category')}
                      className="py-4 px-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 select-none group"
                    >
                      <div className="flex items-center gap-1">
                        <span>Category</span>
                        {renderSortIcon('category')}
                      </div>
                    </th>
                    <th className="py-4 px-3 text-right">Selling Price</th>
                    <th 
                      onClick={() => handleSort('total_quantity_sold')}
                      className="py-4 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 select-none group text-right"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Qty Sold</span>
                        {renderSortIcon('total_quantity_sold')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('total_revenue')}
                      className="py-4 px-5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 select-none group text-right"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Total Revenue</span>
                        {renderSortIcon('total_revenue')}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 dark:divide-slate-750">
                  {paginatedItems.length > 0 ? (
                    paginatedItems.map((item: any) => {
                      const isExpanded = expandedItemId === item.item_id;
                      const hasSales = item.total_quantity_sold > 0;
                      
                      return (
                        <tr key={item.item_id} className={`group hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors ${isExpanded ? 'bg-slate-50/20 dark:bg-slate-800/20' : ''}`}>
                          <td className="py-3.5 pl-5 pr-2 w-10 text-center">
                            <button
                              onClick={() => setExpandedItemId(isExpanded ? null : item.item_id)}
                              className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-primary-500" />
                              ) : (
                                <ChevronDown className="w-4 h-4 group-hover:scale-110 transition" />
                              )}
                            </button>
                          </td>
                          <td className="py-3.5 px-3 font-semibold text-slate-850 dark:text-slate-200 max-w-xs truncate">
                            {item.item_name}
                          </td>
                          <td className="py-3.5 px-3 text-sm text-slate-500 dark:text-slate-400">
                            {item.sku || 'N/A'}
                          </td>
                          <td className="py-3.5 px-3 text-sm">
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                              {item.category || 'General'}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-sm text-slate-600 dark:text-slate-400 text-right">
                            {formatCurrency(item.unit_price)}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <span className={`font-extrabold text-sm ${hasSales ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-600'}`}>
                              {item.total_quantity_sold.toLocaleString()}
                            </span>
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            <span className={`font-bold text-sm ${hasSales ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-600'}`}>
                              {formatCurrency(item.total_revenue)}
                            </span>
                          </td>
                        </tr>
                      );
                    }).reduce((acc: any[], current: any, index: number, array: any[]) => {
                      acc.push(current);
                      
                      // Inject expanded breakdown row if active
                      const item = paginatedItems[index];
                      const isExpanded = expandedItemId === item.item_id;
                      
                      if (isExpanded) {
                        acc.push(
                          <tr key={`${item.item_id}-breakdown`} className="bg-slate-50/75 dark:bg-slate-900/60 print:bg-transparent">
                            <td colSpan={7} className="p-6">
                              <div className="border border-slate-200 dark:border-slate-750 rounded-xl overflow-hidden shadow-inner bg-white dark:bg-slate-800/90 animate-slideDown">
                                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-750 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-850">
                                  <div className="flex items-center gap-2">
                                    <Award className="w-5 h-5 text-indigo-500" />
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                      Staff Sales Breakdown for &quot;{item.item_name}&quot;
                                    </h4>
                                  </div>
                                  <span className="text-xs px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-100/50 dark:border-indigo-950/50">
                                    {item.staff_breakdown?.length || 0} Staff Sellers
                                  </span>
                                </div>
                                
                                {item.staff_breakdown && item.staff_breakdown.length > 0 ? (
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs border-collapse">
                                      <thead>
                                        <tr className="bg-slate-50/40 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-150 dark:border-slate-750">
                                          <th className="py-2.5 px-6">Staff Member</th>
                                          <th className="py-2.5 px-3">Role</th>
                                          <th className="py-2.5 px-3 text-right">Quantity Sold</th>
                                          <th className="py-2.5 px-3 text-right">Transactions Count</th>
                                          <th className="py-2.5 px-6 text-right">Total Revenue Generated</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 dark:divide-slate-750/70">
                                        {item.staff_breakdown.map((sb: any) => (
                                          <tr key={sb.staff_id} className="hover:bg-slate-50/20 dark:hover:bg-slate-750/20 transition-colors">
                                            <td className="py-3 px-6 font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                              <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold flex items-center justify-center uppercase">
                                                {sb.staff_name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                                              </div>
                                              <span>{sb.staff_name}</span>
                                            </td>
                                            <td className="py-3 px-3 text-slate-500 dark:text-slate-400">
                                              <span className="capitalize px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-150 dark:border-slate-750">
                                                {sb.staff_role ? sb.staff_role.replace('_', ' ') : 'Unknown'}
                                              </span>
                                            </td>
                                            <td className="py-3 px-3 font-bold text-slate-900 dark:text-white text-right">
                                              {sb.quantity_sold.toLocaleString()}
                                            </td>
                                            <td className="py-3 px-3 text-slate-500 dark:text-slate-400 text-right">
                                              {sb.transactions_count.toLocaleString()}
                                            </td>
                                            <td className="py-3 px-6 font-bold text-slate-900 dark:text-emerald-400 text-right">
                                              {formatCurrency(sb.total_revenue)}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <div className="p-8 text-center text-slate-400 text-sm">
                                    No staff sales breakdown recorded for this item in the selected range.
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      return acc;
                    }, [])
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-400 text-sm">
                        No product items matched your filter or search criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* TABLE PAGINATION ROW */}
            {totalPages > 1 && (
              <div className="p-5 border-t border-gray-100 dark:border-slate-750 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/10 print:hidden">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Showing Items <span className="font-extrabold text-slate-800 dark:text-slate-200">{Math.min(filteredAndSortedItems.length, (currentPage - 1) * itemsPerPage + 1)}</span> - <span className="font-extrabold text-slate-800 dark:text-slate-200">{Math.min(filteredAndSortedItems.length, currentPage * itemsPerPage)}</span> of <span className="font-extrabold text-slate-800 dark:text-slate-200">{filteredAndSortedItems.length}</span> Products
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-slate-700 text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 transition cursor-pointer"
                  >
                    Previous
                  </button>
                  
                  {Array.from({ length: totalPages }).map((_, idx) => {
                    const pageNo = idx + 1;
                    const isCurrent = currentPage === pageNo;
                    
                    return (
                      <button
                        key={pageNo}
                        onClick={() => setCurrentPage(pageNo)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
                          isCurrent 
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' 
                            : 'border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                        }`}
                      >
                        {pageNo}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-slate-700 text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 transition cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* CHARTS SECTIONS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:hidden">
            {/* Sales Trend Line Chart */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-1.5">
                <TrendingUp className="w-4.5 h-4.5 text-indigo-500" />
                Revenue Trend Over Range
              </h3>
              <div className="h-72">
                {reportData?.salesTrend?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={reportData.salesTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-700/60" />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(val) => `₦${val >= 1000 ? (val/1000).toFixed(0)+'k' : val}`} />
                      <Tooltip 
                        formatter={(value: any) => [formatCurrency(value), 'Revenue']}
                        labelFormatter={(label) => `Date: ${label}`}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', background: '#1e293b', color: '#fff' }}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                    No sales trend data available for selected filters.
                  </div>
                )}
              </div>
            </div>

            {/* Staff Performance Breakdown Chart */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-1.5">
                <Users className="w-4.5 h-4.5 text-emerald-500" />
                Staff Revenue Contributions
              </h3>
              <div className="h-72">
                {reportData?.staffPerformance?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData.staffPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-700/60" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(val) => `₦${val >= 1000 ? (val/1000).toFixed(0)+'k' : val}`} />
                      <Tooltip 
                        formatter={(value: any) => [formatCurrency(value), 'Revenue']}
                        labelFormatter={(label) => `Staff: ${label}`}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', background: '#1e293b', color: '#fff' }}
                      />
                      <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={45} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                    No staff sales contributions to show in this range.
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
