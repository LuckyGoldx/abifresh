'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { formatQty } from '@/lib/format-quantity';
import { TrendingUp, DollarSign, CheckCircle2, Clock, Package, BarChart3, Download, Filter, ChevronDown, X } from 'lucide-react';
import Pagination from '@/components/Pagination';
import { AbifreshLoading } from '@/components/AbifreshLoading';

interface CommissionData {
  summary: {
    total_commission_generated: number;
    estimated_total_commission: number;
    total_commission_paid: number;
    pending_commission: number;
    total_items_sold: number;
    total_units_commissioned: number;
  };
  commissions: Array<{ amount: string | number; approved_date: string }>;
  sales: Array<any>;
  top_items: Array<any>;
  monthly_commission: Record<string, number>;
}

interface StatCardProps {
  icon: any;
  title: string;
  value: string | number;
  subtitle?: string;
  color: string;
}

const StatCard = ({ icon: Icon, title, value, subtitle, color }: StatCardProps) => (
  <div className="card flex items-center space-x-4 overflow-hidden">
    <div className={`${color} p-3 rounded-lg flex-shrink-0`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div className="min-w-0">
      <p className="text-gray-600 dark:text-gray-400 text-sm truncate">{title}</p>
      <p className="text-2xl font-bold text-gray-800 dark:text-white break-words">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
    </div>
  </div>
);

export default function CommissionStaffPage() {
  const { token } = useAuthStore();
  const user = useAuthStore((state) => state.user);
  const [commissions, setCommissions] = useState<CommissionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'items' | 'history' | 'breakdown'>('breakdown');
  const [breakdownFilter, setBreakdownFilter] = useState<'all' | 'paid'>('paid');
  const [breakdownPage, setBreakdownPage] = useState(1);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [filterPeriod, setFilterPeriod] = useState<'all' | '30d' | '90d' | '1y'>('all');

  useEffect(() => {
    fetchCommissionData();
  }, []);

  const fetchCommissionData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/staff/commissions/details');
      setCommissions(response.data);
    } catch (error) {
      console.error('Error fetching commission data:', error);
    } finally {
      setLoading(false);
    }
  };

  const [showExportMenu, setShowExportMenu] = useState(false);

  const generateCSV = () => {
    if (!commissions) return '';

    let csv = 'Commission Report Export\n';
    csv += `Generated: ${new Date().toLocaleString()}\n\n`;
    csv += 'SUMMARY\n';
    csv += `Estimated Total Commission,₦${commissions.summary.estimated_total_commission.toLocaleString()}\n`;
    csv += `Total Commission Generated,₦${commissions.summary.total_commission_generated.toLocaleString()}\n`;
    csv += `Total Commission Paid,₦${commissions.summary.total_commission_paid.toLocaleString()}\n`;
    csv += `Pending Commission,₦${commissions.summary.pending_commission.toLocaleString()}\n`;
    csv += `Total Items Sold,${commissions.summary.total_items_sold}\n`;
    csv += `Total Units,${commissions.summary.total_units_commissioned}\n\n`;

    csv += 'COMMISSION PAYMENTS\n';
    csv += 'Date,Amount\n';
    commissions.commissions.forEach((c) => {
      const amount = typeof c.amount === 'string' ? parseFloat(c.amount) : c.amount;
      csv += `"${new Date(c.approved_date).toLocaleString()}","₦${amount.toLocaleString()}"\n`;
    });

    csv += '\n\nTOP ITEMS\n';
    csv += 'Item,SKU,Units,Commission,Sales\n';
    commissions.top_items.forEach((item) => {
      csv += `"${item.name}","${item.sku}",${item.quantity},"₦${item.commission.toLocaleString()}",${item.sales}\n`;
    });

    return csv;
  };

  const handleExportCSV = () => {
    const csv = generateCSV();
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
    element.setAttribute('download', `commission-report-${new Date().toISOString().split('T')[0]}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    setShowExportMenu(false);
  };

  const handleExportExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const { utils } = XLSX;
      
      const ws = utils.aoa_to_sheet([
        ['Commission Report Export'],
        [`Generated: ${new Date().toLocaleString()}`],
        [],
        ['SUMMARY'],
        ['Estimated Total Commission', `₦${commissions?.summary.estimated_total_commission.toLocaleString()}`],
        ['Total Commission Generated', `₦${commissions?.summary.total_commission_generated.toLocaleString()}`],
        ['Total Commission Paid', `₦${commissions?.summary.total_commission_paid.toLocaleString()}`],
        ['Pending Commission', `₦${commissions?.summary.pending_commission.toLocaleString()}`],
        ['Total Items Sold', commissions?.summary.total_items_sold],
        ['Total Units', commissions?.summary.total_units_commissioned],
        [],
        ['COMMISSION PAYMENTS'],
        ['Date', 'Amount'],
      ]);

      commissions?.commissions.forEach((c) => {
        const amount = typeof c.amount === 'string' ? parseFloat(c.amount) : c.amount;
        utils.sheet_add_aoa(ws, [[new Date(c.approved_date).toLocaleString(), `₦${amount.toLocaleString()}`]], { origin: -1 });
      });

      utils.sheet_add_aoa(ws, [[], ['TOP ITEMS'], ['Item', 'SKU', 'Units Sold', 'Commission', 'Sales Count']], { origin: -1 });
      
      commissions?.top_items.forEach((item) => {
        utils.sheet_add_aoa(ws, [[item.name, item.sku, item.quantity, `₦${item.commission.toLocaleString()}`, item.sales]], { origin: -1 });
      });

      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, 'Commission Report');
      XLSX.writeFile(wb, `commission-report-${new Date().toISOString().split('T')[0]}.xlsx`);
      setShowExportMenu(false);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
    }
  };

  const handleExportPDF = async () => {
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      
      // Create a temporary div with the data to convert to PDF
      const element = document.createElement('div');
      element.style.padding = '20px';
      element.style.fontFamily = 'Arial, sans-serif';
      element.style.backgroundColor = 'white';
      element.innerHTML = `
        <h1 style="font-size: 24px; margin-bottom: 10px;">Commission Report</h1>
        <p style="margin-bottom: 20px; color: #666;">Generated: ${new Date().toLocaleString()}</p>
        
        <h2 style="font-size: 18px; margin-top: 20px; margin-bottom: 10px;">Summary</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr style="border-bottom: 1px solid #ddd;">
            <td style="padding: 8px;">Estimated Total Commission</td>
            <td style="padding: 8px; text-align: right; font-weight: bold;">₦${commissions?.summary.estimated_total_commission.toLocaleString()}</td>
          </tr>
          <tr style="border-bottom: 1px solid #ddd;">
            <td style="padding: 8px;">Total Commission Generated</td>
            <td style="padding: 8px; text-align: right; font-weight: bold;">₦${commissions?.summary.total_commission_generated.toLocaleString()}</td>
          </tr>
          <tr style="border-bottom: 1px solid #ddd;">
            <td style="padding: 8px;">Total Commission Paid</td>
            <td style="padding: 8px; text-align: right; font-weight: bold;">₦${commissions?.summary.total_commission_paid.toLocaleString()}</td>
          </tr>
          <tr style="border-bottom: 1px solid #ddd;">
            <td style="padding: 8px;">Pending Commission</td>
            <td style="padding: 8px; text-align: right; font-weight: bold;">₦${commissions?.summary.pending_commission.toLocaleString()}</td>
          </tr>
          <tr style="border-bottom: 1px solid #ddd;">
            <td style="padding: 8px;">Total Items Sold</td>
            <td style="padding: 8px; text-align: right; font-weight: bold;">${commissions?.summary.total_items_sold}</td>
          </tr>
          <tr>
            <td style="padding: 8px;">Total Units</td>
            <td style="padding: 8px; text-align: right; font-weight: bold;">${commissions?.summary.total_units_commissioned}</td>
          </tr>
        </table>
        
        <h2 style="font-size: 18px; margin-top: 20px; margin-bottom: 10px;">Top Items</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f5f5f5; border-bottom: 2px solid #333;">
              <th style="padding: 8px; text-align: left;">Item</th>
              <th style="padding: 8px; text-align: left;">SKU</th>
              <th style="padding: 8px; text-align: right;">Units</th>
              <th style="padding: 8px; text-align: right;">Commission</th>
              <th style="padding: 8px; text-align: right;">Sales</th>
            </tr>
          </thead>
          <tbody>
            ${commissions?.top_items.map((item) => `
              <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 8px;">${item.name}</td>
                <td style="padding: 8px;">${item.sku || '-'}</td>
                <td style="padding: 8px; text-align: right;">${formatQty(item.quantity)}</td>
                <td style="padding: 8px; text-align: right;">₦${item.commission.toLocaleString()}</td>
                <td style="padding: 8px; text-align: right;">${item.sales}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      
      document.body.appendChild(element);
      const canvas = await html2canvas(element);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF();
      const imgWidth = 190;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();
      }
      
      pdf.save(`commission-report-${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.removeChild(element);
      setShowExportMenu(false);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
    }
  };

  if (loading) return <AbifreshLoading />;

  if (!commissions) {
    return <div className="text-center py-12 text-red-600">Failed to load commission data</div>;
  }

  const commissionPaymentsSorted = [...(commissions.commissions || [])].sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(b.approved_date).getTime() - new Date(a.approved_date).getTime();
    }
    const aAmount = typeof a.amount === 'string' ? parseFloat(a.amount) : a.amount;
    const bAmount = typeof b.amount === 'string' ? parseFloat(b.amount) : b.amount;
    return bAmount - aAmount;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Commission Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Track all your commissions and earnings</p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
          >
            <Download className="w-4 h-4" />
            <span>Export Report</span>
            <ChevronDown className="w-4 h-4" />
          </button>
          {showExportMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
              <button
                onClick={handleExportExcel}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-white flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Export as Excel</span>
              </button>
              <button
                onClick={handleExportPDF}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-white flex items-center space-x-2 border-t border-gray-200 dark:border-gray-700"
              >
                <Download className="w-4 h-4" />
                <span>Export as PDF</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          icon={DollarSign}
          title="Total Commission"
          value={`₦${commissions.summary.total_commission_generated.toLocaleString()}`}
          color="bg-purple-500"
          subtitle="Earned from paid sales"
        />
        <StatCard
          icon={BarChart3}
          title="Estimated Total"
          value={`₦${commissions.summary.estimated_total_commission.toLocaleString()}`}
          color="bg-cyan-500"
          subtitle="If all items were paid"
        />
        <StatCard
          icon={CheckCircle2}
          title="Commission Paid"
          value={`₦${commissions.summary.total_commission_paid.toLocaleString()}`}
          color="bg-green-500"
          subtitle="Received"
        />
        <StatCard
          icon={Clock}
          title="Pending Commission"
          value={`₦${commissions.summary.pending_commission.toLocaleString()}`}
          color="bg-orange-500"
          subtitle="Awaiting payment"
        />
        <StatCard
          icon={Package}
          title="Items Sold"
          value={formatQty(commissions.summary.total_items_sold)}
          color="bg-blue-500"
          subtitle="Approved & paid"
        />
        <StatCard
          icon={TrendingUp}
          title="Units Commissioned"
          value={formatQty(commissions.summary.total_units_commissioned)}
          color="bg-indigo-500"
          subtitle="Approved & paid"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:border-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('items')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'items'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:border-gray-300'
            }`}
          >
            Top Items
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:border-gray-300'
            }`}
          >
            Payment History
          </button>
          <button
            onClick={() => { setActiveTab('breakdown'); setBreakdownPage(1); }}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'breakdown'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:border-gray-300'
            }`}
          >
            📋 Commission Breakdown
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Commission Breakdown */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Commission Breakdown</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Generated</span>
                <span className="font-bold text-lg">₦{commissions.summary.total_commission_generated.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Paid</span>
                <span className="font-bold text-lg text-green-600">₦{commissions.summary.total_commission_paid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Pending</span>
                <span className="font-bold text-lg text-orange-600">₦{commissions.summary.pending_commission.toLocaleString()}</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Payment Progress</p>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{
                    width: `${commissions.summary.total_commission_generated > 0 
                      ? (commissions.summary.total_commission_paid / commissions.summary.total_commission_generated) * 100 
                      : 0}%`
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {commissions.summary.total_commission_generated > 0
                  ? `${((commissions.summary.total_commission_paid / commissions.summary.total_commission_generated) * 100).toFixed(1)}% paid`
                  : 'No commissions yet'}
              </p>
            </div>
          </div>

          {/* Sales Summary */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Sales Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Items Sold</span>
                <span className="font-bold text-lg">{formatQty(commissions.summary.total_items_sold)}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Units</span>
                <span className="font-bold text-lg">{formatQty(commissions.summary.total_units_commissioned)}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Avg Commission per Item</span>
                <span className="font-bold text-lg">
                  ₦{commissions.summary.total_items_sold > 0 
                    ? Math.round(commissions.summary.total_commission_generated / commissions.summary.total_items_sold).toLocaleString()
                    : 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Avg Commission per Unit</span>
                <span className="font-bold text-lg">
                  ₦{commissions.summary.total_units_commissioned > 0
                    ? Math.round(commissions.summary.total_commission_generated / commissions.summary.total_units_commissioned).toLocaleString()
                    : 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'items' && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Top Performing Items</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-400 font-semibold">Item Name</th>
                  <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-400 font-semibold">SKU</th>
                  <th className="text-right py-3 px-4 text-gray-600 dark:text-gray-400 font-semibold">Units Sold</th>
                  <th className="text-right py-3 px-4 text-gray-600 dark:text-gray-400 font-semibold">Commission</th>
                  <th className="text-right py-3 px-4 text-gray-600 dark:text-gray-400 font-semibold">Sales Count</th>
                </tr>
              </thead>
              <tbody>
                {commissions.top_items.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="py-3 px-4 text-gray-800 dark:text-white">{item.name}</td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{item.sku || '-'}</td>
                    <td className="py-3 px-4 text-right text-gray-800 dark:text-white">{formatQty(item.quantity)}</td>
                    <td className="py-3 px-4 text-right font-semibold text-green-600">₦{item.commission.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">{item.sales}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Commission Payments</h3>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'amount')}
              className="px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="date">Sort by Date</option>
              <option value="amount">Sort by Amount</option>
            </select>
          </div>

          <div className="space-y-2">
            {commissionPaymentsSorted.length > 0 ? (
              commissionPaymentsSorted.map((payment, idx) => (
                <div
                  key={idx}
                  className="card flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-750"
                >
                  <div className="flex items-center space-x-4">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-white">Commission Paid</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(payment.approved_date).toLocaleDateString()} at{' '}
                        {new Date(payment.approved_date).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <span className="font-bold text-lg text-green-600">₦{(typeof payment.amount === 'string' ? parseFloat(payment.amount) : payment.amount).toLocaleString()}</span>
                </div>
              ))
            ) : (
              <div className="card p-8 text-center text-gray-500">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No commission payments yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'breakdown' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Commission Breakdown</h3>
            <div className="flex gap-2">
              <button
                onClick={() => { setBreakdownFilter('paid'); setBreakdownPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  breakdownFilter === 'paid'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                Paid ({commissions.sales.filter((s: any) => (s.approved_commission || 0) > 0).length})
              </button>
              <button
                onClick={() => { setBreakdownFilter('all'); setBreakdownPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  breakdownFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                All ({commissions.sales.length})
              </button>
            </div>
          </div>

          {(() => {
            const filtered = breakdownFilter === 'paid'
              ? commissions.sales.filter((s: any) => (s.approved_commission || 0) > 0)
              : commissions.sales;
            const itemsPerPage = 20;
            const totalPages = Math.ceil(filtered.length / itemsPerPage);
            const paginated = filtered.slice(
              (breakdownPage - 1) * itemsPerPage,
              breakdownPage * itemsPerPage
            );

            return (
              <>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Receipt</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Comm/Unit</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Commission</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {paginated.length > 0 ? (
                          paginated.map((sale: any, idx: number) => (
                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">{sale.item_name || 'Unknown'}</td>
                              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{new Date(sale.sale_date || sale.created_at).toLocaleDateString()}</td>
                              <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!sale.receipt_number) return;
                                    if (receiptData?.receipt_number === sale.receipt_number) { setShowReceiptModal(true); return; }
                                    setSelectedReceipt(sale);
                                    setShowReceiptModal(true);
                                    setLoadingReceipt(true);
                                    try {
                                      const res = await api.get(`/api/receipts/by-number?receipt_number=${encodeURIComponent(sale.receipt_number)}`);
                                      setReceiptData(res.data);
                                    } catch { setReceiptData(null); }
                                    finally { setLoadingReceipt(false); }
                                  }}
                                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline font-medium"
                                >
                                  {sale.receipt_number || '—'}
                                </button>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 dark:text-white text-right whitespace-nowrap">{formatQty(sale.quantity)}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 dark:text-white text-right whitespace-nowrap">₦{(sale.unit_price || 0).toLocaleString()}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 dark:text-white text-right whitespace-nowrap">₦{(sale.total_amount || 0).toLocaleString()}</td>
                              <td className="px-4 py-3 text-sm text-blue-600 dark:text-blue-400 text-right whitespace-nowrap">
                                ₦{((sale.approved_commission || 0) / Math.max(sale.quantity, 1)).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold text-green-600 dark:text-green-400 text-right whitespace-nowrap">
                                ₦{(sale.approved_commission || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={8} className="px-4 py-8 text-center text-gray-500">No commission sales found</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                <Pagination
                  currentPage={breakdownPage}
                  totalPages={totalPages}
                  onPageChange={setBreakdownPage}
                />
              </>
            );
          })()}
        </div>
      )}

      {/* Receipt Modal */}
      {showReceiptModal && selectedReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowReceiptModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full p-5 max-h-screen overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Receipt</h2>
              <button onClick={() => setShowReceiptModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <X size={18} />
              </button>
            </div>

            {loadingReceipt ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <div className="animate-pulse">
                  <img src="/favicon.svg" alt="" className="w-14 h-14" />
                </div>
                <div className="flex items-center gap-2 text-pink-600 dark:text-pink-400">
                  <div className="w-4 h-4 border-2 border-pink-600 dark:border-pink-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm font-bold">Loading receipt...</span>
                </div>
              </div>
            ) : receiptData ? (
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-inner overflow-hidden border border-gray-200 dark:border-gray-700">
                <div className="bg-gradient-to-r from-pink-500 to-pink-600 p-5 text-center">
                  <h2 className="text-xl font-bold text-white mb-0.5">ABIFRESH & KIDDIES VENTURES</h2>
                  <p className="text-pink-100 text-sm">Receipt #{receiptData.receipt_number}</p>
                </div>

                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-xs bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 uppercase font-semibold">Date</p>
                      <p className="font-semibold text-gray-900 dark:text-white mt-0.5">{new Date(selectedReceipt.sale_date || selectedReceipt.created_at).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 uppercase font-semibold">Items</p>
                      <p className="font-semibold text-gray-900 dark:text-white mt-0.5">{receiptData.item_count} item(s)</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 uppercase font-semibold">Location</p>
                      <p className={`font-semibold mt-0.5 ${selectedReceipt.sold_outside_jalingo ? 'text-orange-500' : 'text-green-500'}`}>
                        {selectedReceipt.sold_outside_jalingo ? 'Outside Jalingo' : 'Inside Jalingo'}
                      </p>
                    </div>
                  </div>

                  <div className="border-t-2 border-b-2 border-pink-300 dark:border-pink-600">
                    <div className="bg-gray-50 dark:bg-gray-800 px-3 py-2">
                      <div className="flex justify-between text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wide">
                        <span className="flex-1">Item</span>
                        <span className="w-14 text-right">Qty</span>
                        <span className="w-20 text-right">Price</span>
                        <span className="w-20 text-right">Total</span>
                      </div>
                    </div>
                    <div className="px-3 py-2 space-y-1.5">
                      {receiptData.items.map((item: any, idx: number) => {
                        const isHighlighted = item.item_id === selectedReceipt.item_id;
                        return (
                          <div key={idx} className={`flex justify-between text-sm items-center rounded px-2 py-1 ${
                            isHighlighted ? 'bg-yellow-100 dark:bg-yellow-900/40 ring-2 ring-yellow-400 dark:ring-yellow-500 font-bold' : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            <span className="flex-1 truncate">{item.item_name}</span>
                            <span className="w-14 text-right">{formatQty(item.quantity)}</span>
                            <span className="w-20 text-right">₦{(item.unit_price || 0).toLocaleString()}</span>
                            <span className="w-20 text-right font-semibold">₦{(item.total_amount || 0).toLocaleString()}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/20 rounded-lg p-4 border border-pink-200 dark:border-pink-700">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400 text-sm font-semibold">Total</span>
                      <span className="text-xl font-bold text-pink-600 dark:text-pink-400">₦{receiptData.total_amount.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-700">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400 text-sm">Commission (highlighted item)</span>
                      <span className="text-lg font-bold text-green-600 dark:text-green-400">₦{(selectedReceipt.approved_commission || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">Failed to load receipt</div>
            )}

            <button
              onClick={() => setShowReceiptModal(false)}
              className="mt-3 w-full py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
