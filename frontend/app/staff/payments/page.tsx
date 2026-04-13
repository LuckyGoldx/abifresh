'use client';

import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { formatQty } from '@/lib/format-quantity';
import { CreditCard, Plus, CheckCircle, XCircle, Clock, Upload, DollarSign, FileText, User, Phone, X, Eye, Maximize2, Download, Camera } from 'lucide-react';

interface Payment {
  id: string;
  staff_name: string;
  staff_phone: string;
  amount: number;
  items_paid_for: any[];
  reference_number: string;
  payment_method: string;
  payment_type: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_amount?: number;
  notes: string;
  receipt_url?: string;
  created_at: string;
  approved_date?: string;
}

interface Sale {
  id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  price_jalingo: number;
  unit_price?: number;
  total_amount: number;
  sale_date: string;
  sale_ids?: string[]; // All staff_sales UUIDs when multiple transactions are grouped
  sold_outside_jalingo?: boolean;
}

export default function PaymentsPage() {
  const user = useAuthStore((state) => state.user);
  const receiptInputRef = useRef<HTMLInputElement>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  // Form fields
  const [staffName, setStaffName] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online' | 'bank_deposit' | 'pos'>('cash');
  const [notes, setNotes] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [showFullscreenPreview, setShowFullscreenPreview] = useState(false);
  const [selectedPaymentDetails, setSelectedPaymentDetails] = useState<Payment | null>(null);
  const [showPaymentDetailsModal, setShowPaymentDetailsModal] = useState(false);
  
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState<any>({
    todaysTotalQuantity: 0,
    todaysTotalAmount: 0,
    allTimeQuantity: 0,
    allTimeTotalAmount: 0,
    paidQuantity: 0,
    totalQuantity: 0,
    totalItems: 0,
    totalSalesAmount: 0,
    outstandingAmount: 0,
  });

  useEffect(() => {
    // Set staff name from auth user
    if (user?.full_name) {
      setStaffName(user.full_name);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [paymentsRes, salesRes] = await Promise.all([
        api.get('/api/staff/payments'),
        api.get('/api/staff/store/sales-history'), // Use sales history from staff_sales table
      ]);
      setPayments(paymentsRes.data);
      
      // Handle new response format with stats
      let salesData = [];
      let stats = { totalQuantity: 0, outstandingQuantity: 0, totalSales: 0, outstandingAmount: 0 };
      
      if (salesRes.data.allItems) {
        // New format with stats
        salesData = (salesRes.data.allItems || []).map((sale: any) => ({
          id: sale.id,
          item_id: sale.item_id,
          item_name: sale.item_name || sale.items?.name || 'Unknown',
          quantity: parseFloat(sale.quantity) || 0,
          price_jalingo: parseFloat(sale.price_jalingo || sale.unit_price) || 0,
          total_amount: parseFloat(sale.total_amount) || 0,
          sale_date: sale.sale_date,
          sale_ids: Array.isArray(sale.sale_ids) ? sale.sale_ids : undefined,
          sold_outside_jalingo: sale.sold_outside_jalingo || false,
        }));
        stats = salesRes.data.stats || {};
      } else if (Array.isArray(salesRes.data)) {
        // Old format (array)
        salesData = (salesRes.data || []).map((sale: any) => ({
          id: sale.id,
          item_id: sale.item_id,
          item_name: sale.item_name || sale.items?.name || 'Unknown',
          quantity: parseFloat(sale.quantity) || 0,
          price_jalingo: parseFloat(sale.price_jalingo || sale.unit_price) || 0,
          total_amount: parseFloat(sale.total_amount) || 0,
          sale_date: sale.sale_date,
          sale_ids: Array.isArray(sale.sale_ids) ? sale.sale_ids : undefined,
          sold_outside_jalingo: sale.sold_outside_jalingo || false,
        }));
      }
      
      console.log('📦 Sales data mapped:', salesData);
      console.log('📊 Stats:', stats);
      setSales(salesData);
      setStats(stats);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const toggleSelectAll = () => {
    const available = getAvailableSales();
    const allSelected = available.length > 0 && available.every(s => selectedItems.includes(s.id));
    if (allSelected) {
      setSelectedItems([]);
    } else {
      setSelectedItems(available.map(s => s.id));
    }
  };

  const calculateSelectedTotal = () => {
    return getAvailableSales()
      .filter(s => selectedItems.includes(s.id))
      .reduce((sum, s) => sum + s.total_amount, 0);
  };

  // Normalize item ID for consistent comparison
  const normalizeId = (id: any): string => {
    if (!id) return '';
    return String(id).toLowerCase().trim();
  };

  // Backend already returns only unpaid items in allItems. Trust that list directly.
  const getAvailableSales = () => sales;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    // Check file type - support more image formats
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      alert('Only JPG, PNG, GIF, WebP, or PDF files are allowed');
      return;
    }

    // Compress images client-side before storing
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onerror = () => { setReceiptFile(file); };
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const img = new Image();
        img.onerror = () => { setReceiptFile(file); setReceiptPreview(dataUrl); };
        img.onload = () => {
          const MAX = 1920;
          let { width, height } = img;
          if (width > MAX || height > MAX) {
            if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
            else { width = Math.round(width * MAX / height); height = MAX; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) {
              const compressed = new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' });
              setReceiptFile(compressed);
              setReceiptPreview(dataUrl);
            } else {
              // canvas.toBlob failed — fall back to original file
              setReceiptFile(file);
              setReceiptPreview(dataUrl);
            }
          }, 'image/webp', 0.75);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    } else {
      setReceiptFile(file);
    }
  };

  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Make item selection mandatory
    if (selectedItems.length === 0) {
      alert('Please select at least one item you are paying for');
      return;
    }

    // Get calculated amount from selected items
    const calculatedAmount = calculateSelectedTotal();
    
    if (calculatedAmount <= 0) {
      alert('Please select items to pay for');
      return;
    }

    // Use outstanding amount from backend stats (already calculated correctly)
    const outstandingAmt = stats.outstandingAmount || 0;

    // Validate payment doesn't exceed outstanding balance (allow tiny float tolerance)
    if (calculatedAmount > outstandingAmt + 0.01) {
      alert(`❌ Payment amount (₦${calculatedAmount.toLocaleString()}) exceeds your outstanding balance (₦${outstandingAmt.toLocaleString()})\n\nPlease select fewer items or reduce the payment amount.`);
      return;
    }

    if (!staffName.trim()) {
      alert('Please enter your name');
      return;
    }

    // Validate based on payment method
    if (paymentMethod !== 'cash') {
      if (!receiptFile) {
        alert('Please upload a receipt for this payment method');
        return;
      }
      if (!referenceNumber.trim()) {
        alert('Please enter a reference number for this payment method');
        return;
      }
    }

    // Update paymentAmount to the calculated value
    setPaymentAmount(calculatedAmount.toString());
    setShowPreview(true);
  };

  const handleSubmit = async (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();
    
    // Compute amount fresh from selected items (don't rely solely on state)
    const freshAmount = calculateSelectedTotal();
    if (freshAmount <= 0) {
      alert('No items selected. Please select items to pay for.');
      return;
    }

    const selectedSalesData = sales
      .filter(s => selectedItems.includes(s.id))
      .map(s => ({
        sale_ids: s.sale_ids && s.sale_ids.length > 0 ? s.sale_ids : [s.id],
        item_id: s.item_id,
        item_name: s.item_name,
        quantity: s.quantity,
        amount: s.total_amount
      }));

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('amount', freshAmount.toString());
      formData.append('staff_name', staffName);
      formData.append('items_paid_for', JSON.stringify(selectedSalesData));
      formData.append('reference_number', referenceNumber || '');
      formData.append('payment_method', paymentMethod);
      formData.append('notes', notes || '');
      if (receiptFile) {
        formData.append('receipt', receiptFile);
      }

      // Use fetch directly so the browser auto-sets Content-Type with boundary for FormData
      const authStorage = typeof window !== 'undefined' ? localStorage.getItem('auth-storage') : null;
      let authToken = '';
      if (authStorage) {
        try {
          const parsed = JSON.parse(authStorage);
          authToken = parsed.state?.token ?? parsed.token ?? '';
        } catch {}
      }

      const response = await fetch('/api/staff/payments/request', {
        method: 'POST',
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Server error. Please try again.' }));
        throw new Error(errData.error || 'Failed to submit payment request');
      }
      
      alert('Payment request submitted successfully! Awaiting admin approval.');
      
      // Reset form
      setShowPaymentForm(false);
      setShowPreview(false);
      setStaffName('');
      setSelectedItems([]);
      setPaymentAmount('');
      setReferenceNumber('');
      setNotes('');
      setReceiptFile(null);
      setReceiptPreview(null);
      fetchData();
    } catch (error: any) {
      alert(error.message || 'Failed to submit payment request');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      approved: 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100',
    };
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors[status as keyof typeof colors]}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  const outstandingAmount = stats.outstandingAmount || 0; // Outstanding = Total sales - Approved - Pending
  const approvedPayments = payments.filter(p => p.status === 'approved').reduce((sum, p) => sum + (parseFloat(p.approved_amount as any) || parseFloat(p.amount as any) || 0), 0);
  const pendingPayments = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + (parseFloat(p.amount as any) || 0), 0);

  if (isLoading) {
    return <div className="text-center py-12">Loading payments...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <CreditCard className="w-8 h-8 text-pink-500" />
          Payment Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Submit payment for items sold
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card bg-purple-50 dark:bg-purple-900 border-l-4 border-purple-500">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-sm text-purple-700 dark:text-purple-200">Total Items Sold</p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                {formatQty(stats.allTimeQuantity || 0)} units
              </p>
              <p className="text-xs text-purple-600 dark:text-purple-300 mt-1">
                Unpaid items
              </p>
            </div>
          </div>
        </div>

        <div className="card bg-blue-50 dark:bg-blue-900 border-l-4 border-blue-500 overflow-hidden">
          <div className="flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-blue-600 flex-shrink-0" />
            <div className="w-full min-w-0">
              <p className="text-sm text-blue-700 dark:text-blue-200">Total Sales (All Time)</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 break-all">
                ₦{(stats.allTimeTotalAmount || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="card bg-yellow-50 dark:bg-yellow-900 border-l-4 border-yellow-500 overflow-hidden">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-yellow-600 flex-shrink-0" />
            <div className="w-full min-w-0">
              <p className="text-sm text-yellow-700 dark:text-yellow-200">Pending Payments</p>
              <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100 break-all">
                ₦{pendingPayments.toLocaleString()}
              </p>
              <p className="text-xs text-yellow-600 dark:text-yellow-300 mt-1">
                Awaiting approval
              </p>
            </div>
          </div>
        </div>

        <div className="card bg-green-50 dark:bg-green-900 border-l-4 border-green-500 overflow-hidden">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
            <div className="w-full min-w-0">
              <p className="text-sm text-green-700 dark:text-green-200">Approved Payments</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100 break-all">
                ₦{approvedPayments.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="card bg-red-50 dark:bg-red-900 border-l-4 border-red-500 overflow-hidden">
          <div className="flex items-center gap-3">
            <XCircle className="w-8 h-8 text-red-600 flex-shrink-0" />
            <div className="w-full min-w-0">
              <p className="text-sm text-red-700 dark:text-red-200">Outstanding Amount</p>
              <p className="text-2xl font-bold text-red-900 dark:text-red-100 break-all">
                ₦{outstandingAmount.toLocaleString()}
              </p>
              <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                Sales - Approved - Pending
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => setShowPaymentForm(!showPaymentForm)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Payment
        </button>
      </div>

      {/* Payment Form */}
      {showPaymentForm && (
        <div className="card">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Upload className="w-6 h-6 text-pink-500" />
            Submit New Payment
          </h2>
          
          <form onSubmit={showPreview ? handleSubmit : handlePreview} className="space-y-6" noValidate>
            {/* Staff Name */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Your Name *
              </label>
              <input
                type="text"
                value={staffName}
                readOnly
                className="input bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 cursor-not-allowed opacity-75"
                placeholder="Your name will be auto-populated"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Your name is auto-populated from your profile
              </p>
            </div>

            {/* Total Sales & Amount Summary */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Your Sales Summary
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                {/* All-Time Sales Card */}
                <div className="bg-white dark:bg-gray-700 p-3 rounded border dark:border-gray-600 overflow-hidden md:col-span-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-2">ALL-TIME SALES</p>
                  <div className="flex justify-between items-start gap-2 w-full min-w-0">
                    <div className="min-w-0">
                      <p className="text-sm text-gray-600 dark:text-gray-300">Total Items</p>
                      <p className="text-lg font-bold text-gray-800 dark:text-white break-all">
                        {formatQty(stats.allTimeQuantity || 0)} units
                      </p>
                    </div>
                    <div className="text-right min-w-0">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Total Value</p>
                      <p className="text-sm font-bold text-blue-600 dark:text-blue-400 break-all">
                        ₦{(stats.allTimeTotalAmount || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Outstanding Amount Card */}
                <div className="bg-white dark:bg-gray-700 p-3 rounded border dark:border-gray-600 overflow-hidden md:col-span-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-2">OUTSTANDING</p>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-600 dark:text-gray-300">Amount Due</p>
                    <p className="text-lg font-bold text-red-600 dark:text-red-400 break-all">
                      ₦{outstandingAmount.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Select Items for Payment */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Select Items You're Paying For <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                You must select at least one item to track payment accountability
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded p-2 mb-3">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  ℹ️ <strong>Note:</strong> Once submitted, items will disappear from this list while pending. They'll reappear only if the payment is rejected.
                </p>
              </div>
              <div className="border dark:border-gray-700 rounded-lg max-h-60 overflow-y-auto">
                {getAvailableSales().length > 0 ? (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                      <tr>
                        <th className="py-2 px-3">
                          <input
                            type="checkbox"
                            checked={getAvailableSales().length > 0 && getAvailableSales().every(s => selectedItems.includes(s.id))}
                            ref={(el) => { if (el) el.indeterminate = getAvailableSales().some(s => selectedItems.includes(s.id)) && !getAvailableSales().every(s => selectedItems.includes(s.id)); }}
                            onChange={toggleSelectAll}
                            className="w-4 h-4"
                            title="Select / deselect all"
                          />
                        </th>
                        <th className="text-left py-2 px-3">Item</th>
                        <th className="text-left py-2 px-3">Qty</th>
                        <th className="text-left py-2 px-3">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getAvailableSales().map((sale) => (
                        <tr key={sale.id} className="border-t dark:border-gray-700">
                          <td className="py-2 px-3">
                            <input
                              type="checkbox"
                              checked={selectedItems.includes(sale.id)}
                              onChange={() => toggleItemSelection(sale.id)}
                              className="w-4 h-4"
                            />
                          </td>
                          <td className="py-2 px-3">
                            {sale.item_name}
                            {sale.sold_outside_jalingo && (
                              <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                                Outside Jalingo
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3">{formatQty(sale.quantity)}</td>
                          <td className="py-2 px-3 font-semibold">₦{sale.total_amount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-center py-4 text-gray-500">No sales to pay for yet (or all pending)</p>
                )}
              </div>
              {selectedItems.length > 0 && (
                <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                  Selected items total: <strong>₦{calculateSelectedTotal().toLocaleString()}</strong>
                </p>
              )}
              {selectedItems.length === 0 && getAvailableSales().length > 0 && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                  Please select at least one item
                </p>
              )}
            </div>

            {/* Payment Amount */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Amount You're Remitting (₦) *
                </label>
                <div className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-4 py-2 text-gray-700 dark:text-gray-200 font-semibold">
                  ₦{calculateSelectedTotal().toLocaleString()}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Auto-calculated from selected items
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Payment Method *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'online' | 'bank_deposit' | 'pos')}
                  className="input"
                  required
                >
                  <option value="cash">Cash</option>
                  <option value="online">Online Transfer</option>
                  <option value="bank_deposit">Bank Deposit</option>
                  <option value="pos">POS</option>
                </select>
              </div>
            </div>

            {/* Reference Number - Only show for non-cash payments */}
            {paymentMethod !== 'cash' && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Reference Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="input"
                  placeholder="e.g., TRX123456789"
                  required={paymentMethod as string !== 'cash'}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Enter transaction ID, bank slip number, or POS reference
                </p>
              </div>
            )}

            {/* Receipt Upload - Only show for non-cash payments */}
            {paymentMethod !== 'cash' && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Upload Receipt / Proof of Payment <span className="text-red-500">*</span>
              </label>
              <div className="border-2 border-dashed dark:border-gray-700 rounded-lg p-6 text-center">
                <input
                  ref={receiptInputRef}
                  type="file"
                  id="receipt"
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/jpeg,image/png,image/jpg,image/gif,image/webp,application/pdf"
                />
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      if (receiptInputRef.current) {
                        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                        if (isMobile) {
                          receiptInputRef.current.setAttribute('capture', 'environment');
                        } else {
                          receiptInputRef.current.removeAttribute('capture');
                        }
                        receiptInputRef.current.click();
                      }
                    }}
                    className="flex flex-col items-center gap-2 px-6 py-4 bg-blue-50 dark:bg-blue-900 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800 transition flex-1"
                  >
                    <Camera className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">📱 Camera</span>
                  </button>
                  <span className="hidden sm:inline text-gray-300">•</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      if (receiptInputRef.current) {
                        receiptInputRef.current.removeAttribute('capture');
                        receiptInputRef.current.click();
                      }
                    }}
                    className="flex flex-col items-center gap-2 px-6 py-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition flex-1"
                  >
                    <Upload className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">📁 Upload</span>
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 break-words">JPG, PNG, GIF, WebP, or PDF • Max 5MB</p>
              </div>
              {receiptFile && (
                <div className="mt-3 space-y-2">
                  <div className="p-3 bg-green-50 dark:bg-green-900 rounded flex items-center justify-between">
                    <span className="text-sm text-green-800 dark:text-green-100">
                      ✓ {receiptFile.name} ({(receiptFile.size / 1024).toFixed(1)}KB)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setReceiptFile(null);
                        setReceiptPreview(null);
                      }}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Remove
                    </button>
                  </div>
                  {receiptPreview && (
                    <div className="relative bg-gray-100 dark:bg-gray-800 rounded p-2 flex items-center justify-between">
                      <div className="text-sm text-gray-600 dark:text-gray-300">Preview:</div>
                      <button
                        type="button"
                        onClick={() => setShowFullscreenPreview(true)}
                        className="flex items-center gap-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>            )}
            {/* Additional Notes */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input"
                rows={3}
                placeholder="Add any additional information..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : showPreview ? 'Confirm & Submit' : 'Review Payment'}
              </button>
              {showPreview && (
                <button
                  type="button"
                  onClick={() => setShowPreview(false)}
                  className="px-6 py-2 bg-gray-300 dark:bg-gray-600 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
                >
                  Edit
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setShowPaymentForm(false);
                  setShowPreview(false);
                  setStaffName('');
                  setSelectedItems([]);
                  setPaymentAmount('');
                  setReferenceNumber('');
                  setNotes('');
                  setReceiptFile(null);
                  setReceiptPreview(null);
                }}
                className="px-6 py-2 bg-gray-300 dark:bg-gray-600 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto p-6 space-y-4">
            <h3 className="text-2xl font-bold mb-4">Payment Preview</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Staff Name</p>
                <p className="font-semibold">{staffName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Payment Method</p>
                <p className="font-semibold">{paymentMethod.toUpperCase()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Amount</p>
                <p className="text-xl font-bold text-green-600">₦{parseFloat(paymentAmount).toLocaleString()}</p>
              </div>
              {referenceNumber && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Reference Number</p>
                  <p className="font-semibold">{referenceNumber}</p>
                </div>
              )}
            </div>

            {selectedItems.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Items Being Paid For</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {sales.filter(s => selectedItems.includes(s.id)).map(s => (
                    <li key={s.id}>
                      • {s.item_name} (x{formatQty(s.quantity)}) - ₦{s.total_amount.toLocaleString()}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {notes && (
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Notes</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{notes}</p>
              </div>
            )}

            {receiptPreview && (
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Receipt Preview</p>
                <img src={receiptPreview} alt="Receipt" className="mt-2 max-h-48 rounded border" />
              </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-900 p-3 rounded text-sm text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> This payment will be sent to admin for approval. It will remain as "Pending" until admin approves it. Once approved, it will move to "Cleared Payments" and you'll receive a notification.
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t dark:border-gray-700">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Confirm & Submit'}
              </button>
              <button
                onClick={() => setShowPreview(false)}
                className="flex-1 px-6 py-2 bg-gray-300 dark:bg-gray-600 rounded hover:bg-gray-400 dark:hover:bg-gray-500 font-medium"
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment History */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Payment History ({payments.length})</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="text-left py-3 px-4">Date</th>
                <th className="text-left py-3 px-4">Amount</th>
                <th className="text-left py-3 px-4">Method</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Details</th>
                <th className="text-left py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="py-3 px-4">
                    {new Date(payment.created_at).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 font-bold">
                    ₦{payment.amount.toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                      {payment.payment_method && payment.payment_method !== 'unknown' ? payment.payment_method.toUpperCase() : 'N/A'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {getStatusBadge(payment.status)}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {payment.notes && (
                      <p className="text-gray-600 dark:text-gray-400 truncate max-w-xs" title={payment.notes}>
                        {payment.notes}
                      </p>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => {
                        setSelectedPaymentDetails(payment);
                        setShowPaymentDetailsModal(true);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                      <span className="text-sm">View</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {payments.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <CreditCard className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>No payment requests yet</p>
          </div>
        )}
      </div>

      {/* Fullscreen Receipt Preview Modal */}
      {showFullscreenPreview && receiptPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="max-w-4xl max-h-[90vh] w-full relative">
            <button
              onClick={() => setShowFullscreenPreview(false)}
              className="absolute top-4 right-4 bg-white dark:bg-gray-800 rounded-full p-2 hover:bg-gray-200 dark:hover:bg-gray-700 z-10"
            >
              <X className="w-6 h-6 text-black dark:text-white" />
            </button>
            <img
              src={receiptPreview}
              alt="Receipt preview"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}

      {/* Payment Details Modal */}
      {showPaymentDetailsModal && selectedPaymentDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Payment Details</h3>
              <button
                onClick={() => {
                  setShowPaymentDetailsModal(false);
                  setSelectedPaymentDetails(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Staff Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Staff Name</label>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {selectedPaymentDetails.staff_name && selectedPaymentDetails.staff_name !== 'N/A' 
                      ? selectedPaymentDetails.staff_name 
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Phone Number</label>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {selectedPaymentDetails.staff_phone && selectedPaymentDetails.staff_phone !== 'N/A'
                      ? selectedPaymentDetails.staff_phone
                      : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Payment Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Amount</label>
                  <p className="font-bold text-xl text-orange-600">₦{selectedPaymentDetails.amount.toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Payment Method</label>
                  <p className="font-semibold text-gray-900 dark:text-white capitalize">
                    {selectedPaymentDetails.payment_method && selectedPaymentDetails.payment_method !== 'unknown' 
                      ? selectedPaymentDetails.payment_method 
                      : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Status and Reference */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedPaymentDetails.status)}</div>
                </div>
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Reference Number</label>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedPaymentDetails.reference_number || 'N/A'}</p>
                </div>
              </div>

              {/* Items Paid For */}
              {selectedPaymentDetails.items_paid_for && selectedPaymentDetails.items_paid_for.length > 0 && (
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400 mb-2 block">Items Paid For</label>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b dark:border-gray-700">
                          <th className="text-left py-2 text-sm font-semibold">Item</th>
                          <th className="text-right py-2 text-sm font-semibold">Quantity</th>
                          <th className="text-right py-2 text-sm font-semibold">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedPaymentDetails.items_paid_for.map((item, index) => (
                          <tr key={index} className="border-b dark:border-gray-800 last:border-0">
                            <td className="py-2 text-sm">{item.item_name}</td>
                            <td className="text-right py-2 text-sm">{formatQty(item.quantity)}</td>
                            <td className="text-right py-2 text-sm font-semibold">₦{item.amount.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Receipt */}
              {selectedPaymentDetails.receipt_url && (
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400 mb-2 block">Receipt</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => window.open(selectedPaymentDetails.receipt_url, '_blank')}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                    >
                      <Eye className="w-4 h-4" />
                      View Receipt
                    </button>
                    <button
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = selectedPaymentDetails.receipt_url!;
                        link.download = `receipt_${selectedPaymentDetails.id}.jpg`;
                        link.click();
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedPaymentDetails.notes && (
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400 mb-2 block">Notes</label>
                  <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                    {selectedPaymentDetails.notes}
                  </p>
                </div>
              )}

              {/* Created Date */}
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400">Created Date</label>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {new Date(selectedPaymentDetails.created_at).toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
