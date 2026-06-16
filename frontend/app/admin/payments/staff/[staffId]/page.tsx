// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { formatQty } from '@/lib/format-quantity';
import {
  ArrowLeft, CreditCard, CheckCircle, Clock, XCircle, Eye, Download,
  X, FileText, Phone, DollarSign, AlertTriangle, User, Package,
} from 'lucide-react';
import LoadingLogo from '@/components/LoadingLogo';
import type { StaffInfo, Payment } from '@/types';
import { AbifreshLoading } from '@/components/AbifreshLoading';
import { useAlert } from '@/context/AlertContext';

interface DetailData {
  id: string;
  full_name: string;
  email: string;
  role: string;
  staff?: { [key: string]: any };
  total_sales_amount: number;
  pending_amount: number;
  approved_amount: number;
  outstanding_amount: number;
  recent_payments: any[];
  [key: string]: any;
}

function formatRole(role: string): string {
  if (!role) return 'Staff';
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

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

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
    case 'approved': return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
    case 'rejected': return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
    case 'paid': return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
    default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending': return <Clock className="w-4 h-4" />;
    case 'approved': return <CheckCircle className="w-4 h-4" />;
    case 'rejected': return <XCircle className="w-4 h-4" />;
    default: return <Clock className="w-4 h-4" />;
  }
};

export default function StaffPaymentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const staffId = params.staffId as string;

  const [data, setData] = useState<DetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Payment details modal state
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionInProgress, setActionInProgress] = useState(false);
  const { alert: showAlert, confirm: showConfirm } = useAlert();

  useEffect(() => {
    fetchData();
  }, [staffId]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError('');
      const res = await api.get(`/api/admin/payments/staff-detail/${staffId}`);
      setData(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load staff data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (paymentId: string) => {
    if (!(await showConfirm('Approve this payment?'))) return;
    setActionInProgress(true);
    try {
      await api.post(`/api/admin/payments/${paymentId}/approve`);
      showAlert('✅ Payment approved successfully!');
      setShowPaymentModal(false);
      setSelectedPayment(null);
      fetchData();
    } catch (err: any) {
      showAlert('❌ ' + (err?.response?.data?.error || 'Failed to approve payment'));
    } finally {
      setActionInProgress(false);
    }
  };

  const handleReject = async (paymentId: string) => {
    if (!rejectReason.trim()) {
      showAlert('Please enter a reason for rejection');
      return;
    }
    setActionInProgress(true);
    try {
      await api.post(`/api/admin/payments/${paymentId}/reject`, { reason: rejectReason });
      showAlert('✅ Payment rejected successfully!');
      setShowRejectModal(false);
      setShowPaymentModal(false);
      setRejectReason('');
      setSelectedPayment(null);
      fetchData();
    } catch (err: any) {
      showAlert('❌ ' + (err?.response?.data?.error || 'Failed to reject payment'));
    } finally {
      setActionInProgress(false);
    }
  };

  const handleDownloadReceipt = async (url: string, filename?: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename || `receipt_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch {
      window.open(url, '_blank');
    }
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setShowRejectModal(false);
    setShowReceiptPreview(false);
    setSelectedPayment(null);
    setRejectReason('');
  };

  if (isLoading) return <AbifreshLoading />;

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-red-500">{error || 'Staff not found'}</p>
        <button onClick={() => router.back()} className="px-4 py-2 bg-pink-500 text-white rounded-lg">
          Go Back
        </button>
      </div>
    );
  }

  const { staff, stats, payments, unpaidItems } = data;
  const totalUnpaid = unpaidItems.reduce((sum, item) => sum + item.total_amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/admin/payments')}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          title="Back to Payments"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <User className="w-7 h-7 text-pink-500" />
            {staff.full_name}
          </h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-sm px-2 py-0.5 bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300 rounded-full font-medium capitalize">
              {formatRole(staff.role)}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">{staff.email}</span>
            {staff.phone_number && (
              <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" /> {staff.phone_number}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={fetchData}
          className="px-3 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition text-sm"
        >
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="card bg-purple-50 dark:bg-purple-950 border-l-4 border-l-purple-500">
          <div className="flex items-start gap-2">
            <Package className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 text-purple-600 mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-purple-700 dark:text-purple-300 font-medium">Total Items Sold</p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-purple-900 dark:text-purple-100 break-words">
                {formatQty(stats.allTimeQty)}
              </p>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-0.5">units (all time)</p>
            </div>
          </div>
        </div>

        <div className="card bg-blue-50 dark:bg-blue-950 border-l-4 border-l-blue-500">
          <div className="flex items-start gap-2">
            <DollarSign className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Total Sales</p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-blue-900 dark:text-blue-100 break-words">
                ₦{stats.allTimeTotalSales.toLocaleString()}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">all time</p>
            </div>
          </div>
        </div>

        <div className="card bg-yellow-50 dark:bg-yellow-950 border-l-4 border-l-yellow-500">
          <div className="flex items-start gap-2">
            <Clock className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-yellow-700 dark:text-yellow-300 font-medium">Pending Payments</p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-900 dark:text-yellow-100 break-words">
                ₦{stats.pendingAmount.toLocaleString()}
              </p>
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-0.5">awaiting approval</p>
            </div>
          </div>
        </div>

        <div className="card bg-green-50 dark:bg-green-950 border-l-4 border-l-green-500">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-green-700 dark:text-green-300 font-medium">Approved Payments</p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-900 dark:text-green-100 break-words">
                ₦{stats.approvedAmount.toLocaleString()}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">settled</p>
            </div>
          </div>
        </div>

        <div className="card bg-red-50 dark:bg-red-950 border-l-4 border-l-red-500">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-red-700 dark:text-red-300 font-medium">Outstanding</p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-red-900 dark:text-red-100 break-words">
                ₦{stats.outstandingAmount.toLocaleString()}
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">not yet submitted</p>
            </div>
          </div>
        </div>
      </div>

      {/* Outstanding Unpaid Items */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
          <Package className="w-5 h-5 text-pink-500" />
          Outstanding Unpaid Items
          <span className="ml-auto text-sm font-normal text-gray-500 dark:text-gray-400">
            {unpaidItems.length} item{unpaidItems.length !== 1 ? 's' : ''}
          </span>
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          All sales not yet included in any submitted or pending payment. These form the outstanding balance.
        </p>

        {unpaidItems.length === 0 ? (
          <div className="text-center py-10 text-gray-500 dark:text-gray-400">
            <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-400 opacity-70" />
            <p className="font-medium text-green-600 dark:text-green-400">All sales have been paid for</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border dark:border-gray-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-semibold">#</th>
                    <th className="text-left py-3 px-4 font-semibold">Item</th>
                    <th className="text-right py-3 px-4 font-semibold">Qty</th>
                    <th className="text-right py-3 px-4 font-semibold">Unit Price</th>
                    <th className="text-right py-3 px-4 font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {unpaidItems.map((item, idx) => (
                    <tr key={item.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                      <td className="py-3 px-4 text-gray-400 dark:text-gray-500">{idx + 1}</td>
                      <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">
                        {item.item_name}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">
                        {formatQty(item.quantity)}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">
                        ₦{(item.unit_price || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-orange-600 dark:text-orange-400">
                        ₦{(item.total_amount || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-orange-50 dark:bg-orange-950 border-t-2 border-orange-300 dark:border-orange-700">
                    <td colSpan={4} className="py-3 px-4 font-bold text-orange-700 dark:text-orange-300">
                      Total Outstanding
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-xl text-orange-600 dark:text-orange-400">
                      ₦{totalUnpaid.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Payment History */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-pink-500" />
          Payment History
          <span className="ml-auto text-sm font-normal text-gray-500 dark:text-gray-400">
            {payments.length} record{payments.length !== 1 ? 's' : ''}
          </span>
        </h2>

        {payments.length === 0 ? (
          <div className="text-center py-10 text-gray-500 dark:text-gray-400">
            <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>No payment records yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <th className="text-left py-3 px-4 font-semibold">Date</th>
                  <th className="text-left py-3 px-4 font-semibold">Amount</th>
                  <th className="text-left py-3 px-4 font-semibold">Method</th>
                  <th className="text-left py-3 px-4 font-semibold">Ref #</th>
                  <th className="text-left py-3 px-4 font-semibold">Status</th>
                  <th className="text-left py-3 px-4 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(payment => (
                  <tr key={payment.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-gray-900 dark:text-white font-medium">
                          {new Date(payment.created_at).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(payment.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-bold text-orange-600 dark:text-orange-400">
                      ₦{(payment.amount || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                      {formatPaymentMethod(payment.payment_method || payment.payment_type)}
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400 font-mono text-xs">
                      {payment.reference_number || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getStatusColor(payment.status)}`}>
                        {getStatusIcon(payment.status)}
                        {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setSelectedPayment(payment); setShowPaymentModal(true); }}
                          className="flex items-center gap-1 px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs transition"
                          title="View details"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                        {payment.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(payment.id)}
                              disabled={actionInProgress}
                              className="flex items-center gap-1 px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-xs transition disabled:opacity-50"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              onClick={() => { setSelectedPayment(payment); setShowRejectModal(true); }}
                              disabled={actionInProgress}
                              className="flex items-center gap-1 px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs transition disabled:opacity-50"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Details Modal */}
      {showPaymentModal && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-6 border-b dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Payment Details</h2>
              <button onClick={closePaymentModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Staff Info */}
              <div className="border-b dark:border-gray-700 pb-4">
                <h3 className="font-semibold text-gray-800 dark:text-white mb-3">Staff Information</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Name</p>
                    <p className="font-semibold text-gray-800 dark:text-white">{staff.full_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Role</p>
                    <p className="font-semibold text-gray-800 dark:text-white capitalize">{formatRole(staff.role)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Email</p>
                    <p className="font-semibold text-gray-800 dark:text-white">{staff.email}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Phone</p>
                    <p className="font-semibold text-gray-800 dark:text-white">
                      {selectedPayment.staff_phone || staff.phone_number || 'Not provided'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div className="border-b dark:border-gray-700 pb-4">
                <h3 className="font-semibold text-gray-800 dark:text-white mb-3">Payment Information</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Amount</p>
                    <p className="text-2xl font-bold text-orange-600">₦{(selectedPayment.amount || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Status</p>
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded text-xs font-medium ${getStatusColor(selectedPayment.status)}`}>
                      {getStatusIcon(selectedPayment.status)}
                      {selectedPayment.status.charAt(0).toUpperCase() + selectedPayment.status.slice(1)}
                    </span>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Payment Method</p>
                    <p className="font-semibold text-gray-800 dark:text-white">
                      {formatPaymentMethod(selectedPayment.payment_method || selectedPayment.payment_type)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Reference #</p>
                    <p className="font-semibold text-gray-800 dark:text-white font-mono">
                      {selectedPayment.reference_number || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Items Paid For */}
              {selectedPayment.items_paid_for && selectedPayment.items_paid_for.length > 0 && (
                <div className="border-b dark:border-gray-700 pb-4">
                  <h3 className="font-semibold text-gray-800 dark:text-white mb-3">Items Paid For</h3>
                  <div className="space-y-2">
                    {selectedPayment.items_paid_for.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700 p-3 rounded">
                        <div>
                          <p className="font-medium text-gray-800 dark:text-white">{item.item_name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Qty: {formatQty(item.quantity)}</p>
                        </div>
                        <p className="font-bold text-orange-600">₦{(item.amount || 0).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Receipt */}
              {selectedPayment.receipt_url && selectedPayment.receipt_url.trim() !== '' && (
                <div className="border-b dark:border-gray-700 pb-4">
                  <h3 className="font-semibold text-gray-800 dark:text-white mb-3">Receipt</h3>
                  <div
                    className="cursor-pointer mb-3 border border-gray-200 dark:border-gray-600 rounded overflow-hidden"
                    onClick={() => setShowReceiptPreview(true)}
                    title="Click to view fullscreen"
                  >
                    <img
                      src={selectedPayment.receipt_url}
                      alt="Receipt"
                      className="max-w-full h-auto max-h-48 object-contain"
                      onError={e => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowReceiptPreview(true)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-sm hover:bg-blue-200 dark:hover:bg-blue-800 transition"
                    >
                      <Eye className="w-4 h-4" /> Fullscreen
                    </button>
                    <button
                      onClick={() => handleDownloadReceipt(selectedPayment.receipt_url!, `receipt_${selectedPayment.reference_number || selectedPayment.id}.jpg`)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded text-sm hover:bg-green-200 dark:hover:bg-green-800 transition"
                    >
                      <Download className="w-4 h-4" /> Download
                    </button>
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedPayment.notes && (
                <div className="border-b dark:border-gray-700 pb-4">
                  <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Notes</h3>
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                    {selectedPayment.notes}
                  </div>
                </div>
              )}

              {/* Rejection Reason */}
              {selectedPayment.status === 'rejected' && selectedPayment.rejection_reason && (
                <div className="border-b dark:border-gray-700 pb-4">
                  <h3 className="font-semibold text-red-600 dark:text-red-400 mb-2">Rejection Reason</h3>
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded text-sm text-red-800 dark:text-red-200 whitespace-pre-wrap">
                    {selectedPayment.rejection_reason}
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-white mb-3">Timeline</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Submitted</p>
                    <p className="font-medium text-gray-800 dark:text-white">
                      {new Date(selectedPayment.requested_date || selectedPayment.created_at).toLocaleString()}
                    </p>
                  </div>
                  {selectedPayment.approved_date && selectedPayment.status === 'approved' && (
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Approved</p>
                      <p className="font-medium text-green-600">{new Date(selectedPayment.approved_date).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer — Approve/Reject for pending */}
            {selectedPayment.status === 'pending' && !showRejectModal && (
              <div className="p-6 border-t dark:border-gray-700 flex gap-3 bg-gray-50 dark:bg-gray-700">
                <button
                  onClick={() => handleApprove(selectedPayment.id)}
                  disabled={actionInProgress}
                  className="flex-1 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition"
                >
                  <CheckCircle className="w-5 h-5" /> Approve Payment
                </button>
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={actionInProgress}
                  className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition"
                >
                  <XCircle className="w-5 h-5" /> Reject Payment
                </button>
              </div>
            )}

            {/* Inline Reject Form */}
            {showRejectModal && selectedPayment && (
              <div className="p-6 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-700 space-y-3">
                <h3 className="font-semibold text-gray-800 dark:text-white">Reason for Rejection</h3>
                <textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Enter reason for rejecting this payment (staff will see this)..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white resize-none text-sm"
                  rows={4}
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowRejectModal(false); setRejectReason(''); }}
                    disabled={actionInProgress}
                    className="flex-1 px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 font-medium disabled:opacity-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleReject(selectedPayment.id)}
                    disabled={actionInProgress}
                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition"
                  >
                    <XCircle className="w-4 h-4" /> Confirm Rejection
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fullscreen Receipt Preview */}
      {showReceiptPreview && selectedPayment?.receipt_url && (
        <div className="fixed inset-0 bg-black bg-opacity-95 z-[60] overflow-auto">
          <div className="fixed top-0 left-0 right-0 flex justify-between items-center p-4 z-20 bg-gradient-to-b from-black/80 to-transparent">
            <span className="text-white text-sm bg-black/50 px-3 py-1 rounded">
              {selectedPayment.reference_number ? `Ref: ${selectedPayment.reference_number}` : 'Receipt'}
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleDownloadReceipt(selectedPayment.receipt_url!, `receipt_${selectedPayment.reference_number || selectedPayment.id}.jpg`)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center gap-2 text-sm transition"
              >
                <Download className="w-4 h-4" /> Download
              </button>
              <button
                onClick={() => setShowReceiptPreview(false)}
                className="bg-white rounded-full p-2 hover:bg-gray-200 transition"
              >
                <X className="w-5 h-5 text-black" />
              </button>
            </div>
          </div>
          <div className="min-h-full flex items-start justify-center p-4 pt-20 pb-8">
            <img src={selectedPayment.receipt_url} alt="Receipt" className="max-w-full h-auto" />
          </div>
        </div>
      )}
    </div>
  );
}
