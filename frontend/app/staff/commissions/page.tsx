'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { TrendingUp, DollarSign, CheckCircle2, Clock, Package, BarChart3, Download, Filter, ChevronDown } from 'lucide-react';

interface CommissionData {
  summary: {
    total_commission_generated: number;
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
  <div className="card flex items-center space-x-4">
    <div className={`${color} p-3 rounded-lg`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div>
      <p className="text-gray-600 dark:text-gray-400 text-sm">{title}</p>
      <p className="text-2xl font-bold text-gray-800 dark:text-white">{value}</p>
      {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
    </div>
  </div>
);

export default function CommissionStaffPage() {
  const { token } = useAuthStore();
  const user = useAuthStore((state) => state.user);
  const [commissions, setCommissions] = useState<CommissionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'items' | 'history'>('overview');
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
                <td style="padding: 8px; text-align: right;">${item.quantity}</td>
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

  if (loading) {
    return <div className="text-center py-12">Loading commission data...</div>;
  }

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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={DollarSign}
          title="Total Commission"
          value={`₦${commissions.summary.total_commission_generated.toLocaleString()}`}
          color="bg-purple-500"
          subtitle="All time earned"
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
          value={commissions.summary.total_items_sold}
          color="bg-blue-500"
          subtitle="With commission"
        />
        <StatCard
          icon={TrendingUp}
          title="Units Commissioned"
          value={commissions.summary.total_units_commissioned}
          color="bg-indigo-500"
          subtitle="Total units"
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
                <span className="font-bold text-lg">{commissions.summary.total_items_sold}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Units</span>
                <span className="font-bold text-lg">{commissions.summary.total_units_commissioned}</span>
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
                    <td className="py-3 px-4 text-right text-gray-800 dark:text-white">{item.quantity}</td>
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
    </div>
  );
}
