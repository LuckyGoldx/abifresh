'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuthStore } from '@/store/auth';
import LoadingLogo from '@/components/LoadingLogo';

interface StaffCommission {
  staff_id: string;
  staff_name: string;
  staff_email: string;
  staff_username: string;
  total_commission_generated: number;
  total_commission_paid: number;
  commission_pending: number;
  total_sales: number;
  items_sold: number;
}

interface CommissionOverview {
  total_commission_generated: number;
  total_commission_paid: number;
  total_commission_pending: number;
  commission_staff_count: number;
  staff_commissions: StaffCommission[];
}

interface CommissionPayment {
  id: string;
  staff_id: string;
  staff_name: string;
  staff_email: string;
  amount: number;
  status: string;
  notes: string;
  created_at: string;
  approved_date: string;
}

interface TopPerformer {
  staff_id: string;
  staff_name: string;
  total_commission: number;
  total_sales: number;
  items_sold: number;
}

interface CommissionTrend {
  date: string;
  commission: number;
}

interface TopCommissionItem {
  item_id: string;
  item_name: string;
  category: string;
  commission_per_unit: number;
  quantity_sold: number;
  total_commission: number;
}

interface CommissionAnalytics {
  top_performers: TopPerformer[];
  commission_trends: CommissionTrend[];
  items_with_highest_commission: TopCommissionItem[];
  period_days: number;
}

const getPeriodDays = (period: string): number => {
  switch (period) {
    case '1h':
      return 1 / 24;
    case '12h':
      return 12 / 24;
    case 'today':
      return 1;
    case 'week':
      return 7;
    case 'month':
      return 30;
    case 'year':
      return 365;
    case 'lastyear':
      return 365;
    default:
      return 30;
  }
};

const getAnalyticsPeriodRange = (period: string): { startDate: string; endDate: string } => {
  const now = new Date();
  let start = new Date();
  let end = new Date(now);

  switch (period) {
    case '1h':
      start.setHours(now.getHours() - 1);
      break;
    case '12h':
      start.setHours(now.getHours() - 12);
      break;
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case 'week':
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      break;
    case 'month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'year':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'lastyear':
      start.setFullYear(now.getFullYear() - 1);
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setFullYear(now.getFullYear() - 1);
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
      break;
    default:
      start.setDate(now.getDate() - 30);
      break;
  }

  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
};

export default function AdminCommissionsPage() {
  const [overview, setOverview] = useState<CommissionOverview | null>(null);
  const [payments, setPayments] = useState<CommissionPayment[]>([]);
  const [analytics, setAnalytics] = useState<CommissionAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'payments' | 'analytics'>('overview');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffCommission | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [analyticsPeriod, setAnalyticsPeriod] = useState('30');
  const [analyticsPeriodCode, setAnalyticsPeriodCode] = useState('all');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [paymentPeriodCode, setPaymentPeriodCode] = useState('all');
  const [selectedDate, setSelectedDate] = useState('');
  const [paymentStartDate, setPaymentStartDate] = useState('');
  const [paymentEndDate, setPaymentEndDate] = useState('');
  const [analyticsStartDate, setAnalyticsStartDate] = useState('');
  const [analyticsEndDate, setAnalyticsEndDate] = useState('');
  const [paymentAmountError, setPaymentAmountError] = useState('');
  
  const token = useAuthStore((state) => state.token);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchAnalytics();
    }
  }, [activeTab, analyticsPeriodCode, analyticsStartDate, analyticsEndDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchOverview(),
        fetchPayments(),
      ]);
    } catch (error) {
      console.error('Error fetching commission data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOverview = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/admin/commissions/overview`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOverview(response.data);
    } catch (error) {
      console.error('Error fetching commission overview:', error);
    }
  };

  const fetchPayments = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/admin/commissions/payments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPayments(response.data);
    } catch (error) {
      console.error('Error fetching commission payments:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      // Use custom dates if both are provided, otherwise use period code
      let startDate: string;
      let endDate: string;
      let period: number;

      if (analyticsStartDate && analyticsEndDate) {
        // Custom date range
        startDate = new Date(analyticsStartDate).toISOString();
        endDate = new Date(analyticsEndDate).toISOString();
        // Calculate days between dates for period
        const msPerDay = 24 * 60 * 60 * 1000;
        period = Math.ceil((new Date(analyticsEndDate).getTime() - new Date(analyticsStartDate).getTime()) / msPerDay);
      } else if (analyticsStartDate) {
        // Single day
        startDate = new Date(analyticsStartDate).toISOString();
        endDate = new Date(analyticsStartDate).toISOString();
        period = 1;
      } else {
        // Use period code
        const periodRange = getAnalyticsPeriodRange(analyticsPeriodCode);
        startDate = periodRange.startDate;
        endDate = periodRange.endDate;
        period = getPeriodDays(analyticsPeriodCode);
      }
      
      const response = await axios.get(
        `${API_BASE_URL}/api/admin/commissions/analytics`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            startDate,
            endDate,
            period,
          },
        }
      );
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching commission analytics:', error);
    }
  };

  const handlePayCommission = async () => {
    if (!selectedStaff || !paymentAmount || parseFloat(paymentAmount) <= 0) {
      setPaymentAmountError('Please enter a valid amount');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (amount > selectedStaff.commission_pending) {
      setPaymentAmountError(
        `Amount cannot exceed pending commission of ₦${formatCurrency(selectedStaff.commission_pending).replace('₦', '')}`
      );
      return;
    }

    setPaymentAmountError('');
    setProcessingPayment(true);
    try {
      await axios.post(
        `${API_BASE_URL}/api/admin/commissions/pay`,
        {
          staff_id: selectedStaff.staff_id,
          amount: amount,
          notes: paymentNotes || `Commission payment for ${selectedStaff.staff_name}`,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      alert('Commission payment created successfully!');
      setShowPaymentModal(false);
      setSelectedStaff(null);
      setPaymentAmount('');
      setPaymentNotes('');
      setPaymentAmountError('');
      fetchData();
    } catch (error: any) {
      console.error('Error creating commission payment:', error);
      alert(error.response?.data?.error || 'Error creating commission payment');
    } finally {
      setProcessingPayment(false);
    }
  };

  const openPaymentModal = (staff: StaffCommission) => {
    setSelectedStaff(staff);
    setPaymentAmount(staff.commission_pending.toString());
    setPaymentNotes(`Commission payment for ${staff.staff_name}`);
    setShowPaymentModal(true);
  };

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return { date: formatDate(dateString), time: `${hours}:${minutes}:${seconds}` };
  };

  const exportToCSV = () => {
    if (!overview) return;

    const csvData = [
      ['Commission Report - ' + new Date().toLocaleDateString()],
      [],
      ['Staff Name', 'Email', 'Items Sold', 'Total Sales', 'Commission Generated', 'Commission Paid', 'Pending'],
      ...overview.staff_commissions.map(staff => [
        staff.staff_name,
        staff.staff_email,
        staff.items_sold,
        staff.total_sales,
        staff.total_commission_generated,
        staff.total_commission_paid,
        staff.commission_pending,
      ]),
      [],
      ['SUMMARY'],
      ['Total Generated', overview.total_commission_generated],
      ['Total Paid', overview.total_commission_paid],
      ['Total Pending', overview.total_commission_pending],
      ['Staff Count', overview.commission_staff_count],
    ];

    const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `commission_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToExcel = () => {
    if (!overview) return;

    // Create a formatted HTML table for Excel
    const html = `
<table>
  <tr><td colspan="7"><b>Commission Report - ${new Date().toLocaleDateString()}</b></td></tr>
  <tr></tr>
  <tr>
    <th>Staff Name</th>
    <th>Email</th>
    <th>Items Sold</th>
    <th>Total Sales</th>
    <th>Commission Generated</th>
    <th>Commission Paid</th>
    <th>Pending</th>
  </tr>
  ${overview.staff_commissions.map(staff => `
  <tr>
    <td>${staff.staff_name}</td>
    <td>${staff.staff_email}</td>
    <td>${staff.items_sold}</td>
    <td>${staff.total_sales}</td>
    <td>${staff.total_commission_generated}</td>
    <td>${staff.total_commission_paid}</td>
    <td>${staff.commission_pending}</td>
  </tr>
  `).join('')}
  <tr></tr>
  <tr><td colspan="7"><b>SUMMARY</b></td></tr>
  <tr><td>Total Generated</td><td colspan="6">${overview.total_commission_generated}</td></tr>
  <tr><td>Total Paid</td><td colspan="6">${overview.total_commission_paid}</td></tr>
  <tr><td>Total Pending</td><td colspan="6">${overview.total_commission_pending}</td></tr>
  <tr><td>Staff Count</td><td colspan="6">${overview.commission_staff_count}</td></tr>
</table>
    `;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `commission_report_${new Date().toISOString().split('T')[0]}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    if (!overview) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Commission Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { text-align: center; color: #333; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 12px; text-align: left; border: 1px solid #ddd; }
    th { background-color: #4CAF50; color: white; }
    tr:nth-child(even) { background-color: #f9f9f9; }
    .summary { margin-top: 30px; font-weight: bold; }
    .total-row { background-color: #e3f2fd; font-weight: bold; }
  </style>
</head>
<body>
  <h1>Commission Report</h1>
  <p>Generated on: ${new Date().toLocaleString()}</p>
  
  <h2>Staff Commission Details</h2>
  <table>
    <tr>
      <th>Staff Name</th>
      <th>Email</th>
      <th>Items Sold</th>
      <th>Total Sales</th>
      <th>Commission Generated</th>
      <th>Commission Paid</th>
      <th>Pending</th>
    </tr>
    ${overview.staff_commissions.map(staff => `
    <tr>
      <td>${staff.staff_name}</td>
      <td>${staff.staff_email}</td>
      <td>${staff.items_sold}</td>
      <td>₦${staff.total_sales.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</td>
      <td>₦${staff.total_commission_generated.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</td>
      <td>₦${staff.total_commission_paid.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</td>
      <td>₦${staff.commission_pending.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</td>
    </tr>
    `).join('')}
  </table>
  
  <h2 class="summary">Summary</h2>
  <table>
    <tr class="total-row">
      <td>Total Commission Generated</td>
      <td>₦${overview.total_commission_generated.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</td>
    </tr>
    <tr class="total-row">
      <td>Total Commission Paid</td>
      <td>₦${overview.total_commission_paid.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</td>
    </tr>
    <tr class="total-row">
      <td>Total Commission Pending</td>
      <td>₦${overview.total_commission_pending.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</td>
    </tr>
    <tr class="total-row">
      <td>Total Commission Staff</td>
      <td>${overview.commission_staff_count}</td>
    </tr>
  </table>
</body>
</html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  if (loading) {
    return <LoadingLogo fullScreen text="Loading commission data..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Commission Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track and manage commission payments for commission staff
          </p>
        </div>
        <div className="flex space-x-2 relative">
          <div className="relative group">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
            >
              📥 Export
              <span className="text-sm">▼</span>
            </button>
            {showExportMenu && (
              <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg z-50 border border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    exportToCSV();
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-t-lg transition"
                >
                  📄 Export as CSV
                </button>
                <button
                  onClick={() => {
                    exportToExcel();
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white transition"
                >
                  📊 Export as Excel
                </button>
                <button
                  onClick={() => {
                    exportToPDF();
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-b-lg transition"
                >
                  📋 Export as PDF
                </button>
              </div>
            )}
          </div>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Total Generated</p>
                <p className="text-3xl font-bold mt-2">
                  {formatCurrency(overview.total_commission_generated)}
                </p>
              </div>
              <div className="text-4xl opacity-80">💰</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Paid</p>
                <p className="text-3xl font-bold mt-2">
                  {formatCurrency(overview.total_commission_paid)}
                </p>
              </div>
              <div className="text-4xl opacity-80">✅</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Pending Payment</p>
                <p className="text-3xl font-bold mt-2">
                  {formatCurrency(overview.total_commission_pending)}
                </p>
              </div>
              <div className="text-4xl opacity-80">⏳</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Commission Staff</p>
                <p className="text-3xl font-bold mt-2">{overview.commission_staff_count}</p>
              </div>
              <div className="text-4xl opacity-80">👥</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📊 Overview
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'payments'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            💳 Payment History
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'analytics'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📈 Analytics
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && overview && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Commission Staff Overview
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Staff
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Items Sold
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Total Sales
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Commission Generated
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Commission Paid
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Pending
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {overview.staff_commissions
                    .sort((a, b) => b.commission_pending - a.commission_pending)
                    .map((staff) => (
                    <tr key={staff.staff_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {staff.staff_name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {staff.staff_email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                        {staff.items_sold.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                        {formatCurrency(staff.total_sales)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(staff.total_commission_generated)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-blue-600 dark:text-blue-400">
                        {formatCurrency(staff.total_commission_paid)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-orange-600 dark:text-orange-400">
                        {formatCurrency(staff.commission_pending)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => window.location.href = `/admin/commissions/${staff.staff_id}`}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            📊 Details
                          </button>
                          <button
                            onClick={() => openPaymentModal(staff)}
                            disabled={staff.commission_pending <= 0}
                            className={`px-3 py-1 rounded ${
                              staff.commission_pending > 0
                                ? 'bg-green-600 text-white hover:bg-green-700'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            💳 Pay
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="space-y-6">
          {/* Date Filter Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Filter by Period</h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: '1 Hour', value: '1h' },
                  { label: '12 Hours', value: '12h' },
                  { label: 'Today', value: 'today' },
                  { label: 'This Week', value: 'week' },
                  { label: 'This Month', value: 'month' },
                  { label: 'This Year', value: 'year' },
                  { label: 'Last Year', value: 'lastyear' },
                  { label: 'All Time', value: 'all' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setPaymentPeriodCode(option.value);
                      setSelectedDate('');
                    }}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                      paymentPeriodCode === option.value && !selectedDate
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Custom Date</h3>
              <div className="flex items-end gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Select a Day
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      if (e.target.value) {
                        setPaymentPeriodCode('');
                        setPaymentStartDate('');
                        setPaymentEndDate('');
                      }
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                {selectedDate && (
                  <button
                    onClick={() => setSelectedDate('')}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  >
                    Clear Date
                  </button>
                )}
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Custom Date Range</h3>
              <div className="flex items-end gap-4 flex-wrap">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={paymentStartDate}
                    onChange={(e) => {
                      setPaymentStartDate(e.target.value);
                      if (e.target.value) {
                        setPaymentPeriodCode('');
                        setSelectedDate('');
                      }
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={paymentEndDate}
                    onChange={(e) => {
                      setPaymentEndDate(e.target.value);
                      if (e.target.value) {
                        setPaymentPeriodCode('');
                        setSelectedDate('');
                      }
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                {(paymentStartDate || paymentEndDate) && (
                  <button
                    onClick={() => {
                      setPaymentStartDate('');
                      setPaymentEndDate('');
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  >
                    Clear Range
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Commission Payment History
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Staff
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {payments
                    .filter(payment => {
                      const paymentDate = new Date(payment.created_at);
                      
                      // Filter by custom date range if both dates are set
                      if (paymentStartDate && paymentEndDate) {
                        const startDate = new Date(paymentStartDate);
                        const endDate = new Date(paymentEndDate);
                        startDate.setHours(0, 0, 0, 0);
                        endDate.setHours(23, 59, 59, 999);
                        return paymentDate >= startDate && paymentDate <= endDate;
                      }
                      
                      // Filter by specific date if set
                      if (selectedDate) {
                        const selectedDateObj = new Date(selectedDate);
                        const paymentDateObj = new Date(payment.created_at);
                        selectedDateObj.setHours(0, 0, 0, 0);
                        paymentDateObj.setHours(0, 0, 0, 0);
                        return selectedDateObj.getTime() === paymentDateObj.getTime();
                      }
                      
                      // Filter by period
                      const now = new Date();
                      if (paymentPeriodCode === 'all') return true;
                      if (paymentPeriodCode === '1h') return now.getTime() - paymentDate.getTime() <= 3600000;
                      if (paymentPeriodCode === '12h') return now.getTime() - paymentDate.getTime() <= 43200000;
                      if (paymentPeriodCode === 'today') {
                        const todayStart = new Date(now);
                        todayStart.setHours(0, 0, 0, 0);
                        return paymentDate >= todayStart;
                      }
                      if (paymentPeriodCode === 'week') {
                        const weekAgo = new Date(now);
                        weekAgo.setDate(now.getDate() - 7);
                        return paymentDate >= weekAgo;
                      }
                      if (paymentPeriodCode === 'month') {
                        const monthAgo = new Date(now);
                        monthAgo.setDate(now.getDate() - 30);
                        return paymentDate >= monthAgo;
                      }
                      if (paymentPeriodCode === 'year') {
                        const yearAgo = new Date(now);
                        yearAgo.setMonth(now.getMonth() - 12);
                        return paymentDate >= yearAgo;
                      }
                      if (paymentPeriodCode === 'lastyear') {
                        const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
                        const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
                        return paymentDate >= lastYearStart && paymentDate <= lastYearEnd;
                      }
                      return true;
                    })
                    .map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        <div className="flex flex-col">
                          <div>{formatDateTime(payment.created_at).date}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">{formatDateTime(payment.created_at).time}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {payment.staff_name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {payment.staff_email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            payment.status === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : payment.status === 'approved'
                              ? 'bg-blue-100 text-blue-800'
                              : payment.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {payment.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {payments.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No commission payments found
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Period Selector */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Filter by Period</h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: '1 Hour', value: '1h' },
                  { label: '12 Hours', value: '12h' },
                  { label: 'Today', value: 'today' },
                  { label: 'This Week', value: 'week' },
                  { label: 'This Month', value: 'month' },
                  { label: 'This Year', value: 'year' },
                  { label: 'Last Year', value: 'lastyear' },
                  { label: 'All Time', value: 'all' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setAnalyticsPeriodCode(option.value);
                      setAnalyticsStartDate('');
                      setAnalyticsEndDate('');
                    }}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                      analyticsPeriodCode === option.value && !analyticsStartDate && !analyticsEndDate
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Custom Date</h3>
              <div className="flex items-end gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Select a Day
                  </label>
                  <input
                    type="date"
                    value={analyticsStartDate}
                    onChange={(e) => {
                      setAnalyticsStartDate(e.target.value);
                      setAnalyticsEndDate('');
                      if (e.target.value) {
                        setAnalyticsPeriodCode('');
                      }
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                {analyticsStartDate && (
                  <button
                    onClick={() => {
                      setAnalyticsStartDate('');
                      setAnalyticsPeriodCode('all');
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  >
                    Clear Date
                  </button>
                )}
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Custom Date Range</h3>
              <div className="flex items-end gap-4 flex-wrap">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={analyticsStartDate}
                    onChange={(e) => {
                      setAnalyticsStartDate(e.target.value);
                      if (e.target.value) {
                        setAnalyticsPeriodCode('');
                      }
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={analyticsEndDate}
                    onChange={(e) => {
                      setAnalyticsEndDate(e.target.value);
                      if (e.target.value) {
                        setAnalyticsPeriodCode('');
                      }
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                {(analyticsStartDate || analyticsEndDate) && (
                  <button
                    onClick={() => {
                      setAnalyticsStartDate('');
                      setAnalyticsEndDate('');
                      setAnalyticsPeriodCode('all');
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  >
                    Clear Range
                  </button>
                )}
              </div>
            </div>
          </div>

          {analytics && (
            <>
              {/* Top Performers */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    🏆 Top Performers
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Rank
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Staff
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Commission
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Sales
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Items Sold
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {analytics.top_performers.map((performer, index) => (
                        <tr key={performer.staff_id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">
                            #{index + 1}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {performer.staff_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-green-600 dark:text-green-400">
                            {formatCurrency(performer.total_commission)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                            {formatCurrency(performer.total_sales)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                            {performer.items_sold.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {analytics.top_performers.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      No data available for the selected period
                    </div>
                  )}
                </div>
              </div>

              {/* Top Commission Items */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    💎 Items with Highest Commission
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Item
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Commission/Unit
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Qty Sold
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Total Commission
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {analytics.items_with_highest_commission.map((item) => (
                        <tr key={item.item_id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {item.item_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                            {item.category}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                            {formatCurrency(item.commission_per_unit)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                            {item.quantity_sold.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-green-600 dark:text-green-400">
                            {formatCurrency(item.total_commission)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {analytics.items_with_highest_commission.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      No data available for the selected period
                    </div>
                  )}
                </div>
              </div>

              {/* Commission Trends */}
              {analytics.commission_trends.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    📊 Commission Trends
                  </h3>
                  <div className="space-y-2">
                    {analytics.commission_trends.map((trend) => (
                      <div key={trend.date} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {formatDate(trend.date)}
                        </span>
                        <div className="flex items-center space-x-3">
                          <div
                            className="h-4 bg-blue-500 rounded"
                            style={{
                              width: `${Math.min(
                                (trend.commission / Math.max(...analytics.commission_trends.map(t => t.commission))) * 200,
                                200
                              )}px`,
                            }}
                          ></div>
                          <span className="text-sm font-semibold text-gray-900 dark:text-white w-24 text-right">
                            {formatCurrency(trend.commission)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Pay Commission
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Staff
                </label>
                <p className="text-gray-900 dark:text-white font-semibold">
                  {selectedStaff.staff_name}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Pending Commission
                </label>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {formatCurrency(selectedStaff.commission_pending)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payment Amount *
                </label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => {
                    setPaymentAmount(e.target.value);
                    setPaymentAmountError('');
                  }}
                  max={selectedStaff?.commission_pending}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Enter amount"
                  step="0.01"
                  min="0"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Max: ₦{formatCurrency(selectedStaff?.commission_pending || 0).replace('₦', '')}
                </p>
                {paymentAmountError && (
                  <p className="text-red-600 dark:text-red-400 text-sm mt-2 font-semibold">
                    ⚠️ {paymentAmountError}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Enter notes (optional)"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={handlePayCommission}
                disabled={processingPayment}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
              >
                {processingPayment ? 'Processing...' : '💳 Pay Commission'}
              </button>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedStaff(null);
                  setPaymentAmount('');
                  setPaymentNotes('');
                }}
                disabled={processingPayment}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
