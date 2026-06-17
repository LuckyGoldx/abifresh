'use client';

import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { CreditCard, Plus, CheckCircle, XCircle, Clock, Upload, Camera, DollarSign, FileText, ChevronRight, Eye, X, Download } from 'lucide-react';
import { CreditTabs } from '@/components/credits';
import { toast } from 'sonner';
import { AbifreshLoading } from '@/components/AbifreshLoading';

export default function SalesCreditPaymentsPage() {
  const user = useAuthStore((state) => state.user);
  const receiptInputRef = useRef<HTMLInputElement>(null);
  
  const [remittances, setRemittances] = useState<any[]>([]);
  const [unremitted, setUnremitted] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    approvedAmount: 0,
    pendingAmount: 0,
    rejectedAmount: 0,
    outstandingAmount: 0,
  });
  
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  // Form fields
  const [staffName, setStaffName] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online' | 'bank_deposit' | 'pos' | string>('cash');
  const [notes, setNotes] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [showUploadPreview, setShowUploadPreview] = useState(false);

  useEffect(() => {
    if (user?.full_name) {
      setStaffName(user.full_name);
    }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const res = await api.get('/api/credits/payments/sales');
      setRemittances(res.data.remittances || []);
      setUnremitted(res.data.unremitted || []);
      setStats(res.data.stats || {});
    } catch (error) {
      toast.error('Failed to load remittance data');
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
    if (unremitted.length === 0) return;
    const allSelected = unremitted.every(item => selectedItems.includes(item.id));
    if (allSelected) {
      setSelectedItems([]);
    } else {
      setSelectedItems(unremitted.map(item => item.id));
    }
  };

  const calculateSelectedTotal = () => {
    return unremitted
      .filter(item => selectedItems.includes(item.id))
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp', 'application/pdf'].includes(file.type)) {
      toast.error('Only image or PDF files are allowed');
      return;
    }

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
    
    if (selectedItems.length === 0) {
      toast.error('Please select at least one collected payment to remit');
      return;
    }

    const calculatedAmount = calculateSelectedTotal();
    
    if (calculatedAmount <= 0) {
      toast.error('Please select items to pay for');
      return;
    }

    if (!staffName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    if (paymentMethod !== 'cash') {
      if (!receiptFile) {
        toast.error('Please upload a receipt for this payment method');
        return;
      }
      if (!referenceNumber.trim()) {
        toast.error('Please enter a reference number for this payment method');
        return;
      }
    }

    setPaymentAmount(calculatedAmount.toString());
    setShowPreview(true);
  };

  const handleSubmit = async (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();

    const freshAmount = calculateSelectedTotal();
    if (freshAmount <= 0) {
      toast.error('No items selected.');
      return;
    }

    const selectedSalesData = unremitted
      .filter(item => selectedItems.includes(item.id))
      .map(item => {
        const receipt_num = (Array.isArray(item.credit_sales) 
          ? item.credit_sales[0]?.receipt_number 
          : item.credit_sales?.receipt_number) || 'N/A';
        
        return {
          credit_payment_id: item.id,
          credit_sale_id: item.credit_sale_id,
          creditor_name: item.creditors?.full_name || 'Unknown',
          amount: item.amount,
          date_collected: item.created_at,
          receipt_number: receipt_num,
          receipt: receipt_num // Keeping for backward compatibility
        };
      });

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

      const authStorage = typeof window !== 'undefined' ? localStorage.getItem('auth-storage') : null;
      let authToken = '';
      if (authStorage) {
        try {
          const parsed = JSON.parse(authStorage);
          authToken = parsed.state?.token ?? parsed.token ?? '';
        } catch {}
      }

      const response = await fetch('/api/credits/payments/request', {
        method: 'POST',
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Server error' }));
        throw new Error(errData.error || 'Failed to submit payment request');
      }
      
      toast.success('Credit remittance submitted successfully! Awaiting admin approval.');
      
      setShowPaymentForm(false);
      setShowPreview(false);
      setSelectedItems([]);
      setReferenceNumber('');
      setNotes('');
      setReceiptFile(null);
      setReceiptPreview(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) return <AbifreshLoading />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <CreditTabs />
      
      <div>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <CreditCard className="w-8 h-8 text-pink-500" />
          Credit Payments & Remittance
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Remit funds collected from creditors to the administration
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card bg-green-50 dark:bg-green-900 border-l-4 border-green-500 overflow-hidden">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm text-green-700 dark:text-green-200">Total Approved</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100 break-words">
                ₦{stats.approvedAmount.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="card bg-yellow-50 dark:bg-yellow-900 border-l-4 border-yellow-500 overflow-hidden">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-yellow-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm text-yellow-700 dark:text-yellow-200">Total Pending</p>
              <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100 break-words">
                ₦{stats.pendingAmount.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="card bg-gray-50 dark:bg-gray-800 border-l-4 border-gray-500 overflow-hidden">
          <div className="flex items-center gap-3">
            <XCircle className="w-8 h-8 text-gray-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm text-gray-700 dark:text-gray-200">Total Rejected</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 break-words">
                ₦{stats.rejectedAmount.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="card bg-red-50 dark:bg-red-900 border-l-4 border-red-500 overflow-hidden">
          <div className="flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-red-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm text-red-700 dark:text-red-200">Outstanding</p>
              <p className="text-2xl font-bold text-red-900 dark:text-red-100 break-words">
                ₦{stats.outstandingAmount.toLocaleString()}
              </p>
              <p className="text-[10px] text-red-600 dark:text-red-300 mt-1 uppercase tracking-wider font-bold">Needs Remittance</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => setShowPaymentForm(!showPaymentForm)}
          className="px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl shadow-lg shadow-pink-100 transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Payment
        </button>
      </div>

      {/* Payment Form */}
      {showPaymentForm && (
        <div className="card bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 md:p-8 mt-6">
          <h2 className="text-2xl font-black mb-6 flex items-center gap-3 text-gray-900 dark:text-white">
            <Upload className="w-7 h-7 text-pink-500" />
            Submit Collected Funds
          </h2>
          
          <form onSubmit={handlePreview} className="space-y-6" noValidate>
            
            <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-xl border dark:border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold flex items-center gap-2 text-lg text-gray-900 dark:text-white">
                  <FileText className="w-5 h-5 text-gray-400" />
                  Collected Payments Awaiting Remittance
                </h3>
              </div>
              
              <div className="border dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
                {unremitted.length > 0 ? (
                  <div className="max-h-80 overflow-x-auto overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-900/80 sticky top-0 border-b dark:border-gray-700">
                        <tr>
                          <th className="py-3 px-4 w-12 text-center">
                            <input
                              type="checkbox"
                              checked={unremitted.length > 0 && unremitted.every(item => selectedItems.includes(item.id))}
                              onChange={toggleSelectAll}
                              className="w-4 h-4 accent-pink-500 rounded cursor-pointer"
                            />
                          </th>
                          <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-400">Creditor</th>
                          <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-400">Date Collected</th>
                          <th className="text-right py-3 px-4 font-bold text-gray-600 dark:text-gray-400">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {unremitted.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                            <td className="py-3 px-4 text-center">
                              <input
                                type="checkbox"
                                checked={selectedItems.includes(item.id)}
                                onChange={() => toggleItemSelection(item.id)}
                                className="w-4 h-4 accent-pink-500 rounded cursor-pointer"
                              />
                            </td>
                            <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">{item.creditors?.full_name || 'Unknown'}</td>
                            <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{new Date(item.created_at).toLocaleString()}</td>
                            <td className="py-3 px-4 text-right font-black text-gray-900 dark:text-white">₦{Number(item.amount).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-green-400" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">You have no outstanding collected funds to remit.</p>
                  </div>
                )}
              </div>
              {selectedItems.length > 0 && (
                <div className="mt-4 flex justify-between items-center bg-pink-50 dark:bg-pink-900/40 text-pink-900 dark:text-pink-100 p-4 rounded-xl border border-pink-100 dark:border-pink-900/50">
                  <span className="font-medium">Selected Total to Remit:</span>
                  <span className="text-2xl font-black">₦{calculateSelectedTotal().toLocaleString()}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Payment Method *</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'online' | 'bank_deposit' | 'pos')}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 dark:border-gray-700 focus:border-pink-500 focus:ring-0 transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-medium"
                  required
                >
                  <option value="cash">Cash</option>
                  <option value="online">Online Transfer</option>
                  <option value="bank_deposit">Bank Deposit</option>
                  <option value="pos">POS</option>
                </select>
              </div>

              {paymentMethod !== 'cash' && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Reference Number *</label>
                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 dark:border-gray-700 focus:border-pink-500 focus:ring-0 transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g., TRX123456789"
                    required={paymentMethod !== 'cash'}
                  />
                </div>
              )}
            </div>

            {paymentMethod !== 'cash' && (
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Upload Receipt *</label>
                <div className="border-2 border-dashed dark:border-gray-700 rounded-lg p-6 text-center">
                  <input
                    ref={receiptInputRef}
                    type="file"
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
                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      <span className="text-sm text-blue-800 dark:text-blue-200 truncate">{receiptFile.name}</span>
                      <button
                        type="button"
                        onClick={() => { setReceiptFile(null); setReceiptPreview(null); }}
                        className="ml-auto text-blue-600 dark:text-blue-400 hover:text-blue-800 flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {receiptPreview && (
                      <div
                        className="relative rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700 cursor-zoom-in bg-gray-100 dark:bg-gray-800 h-32 flex items-center justify-center group"
                        onClick={() => setShowUploadPreview(true)}
                      >
                        <img src={receiptPreview} alt="Receipt preview" className="object-contain h-full w-full group-hover:scale-105 transition-transform duration-300" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                          <Eye className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 dark:border-gray-700 focus:border-pink-500 focus:ring-0 transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                rows={3}
                placeholder="Any additional information for the admin..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowPaymentForm(false)}
                className="px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-8 py-3 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl shadow-lg shadow-pink-100 dark:shadow-none transition-all"
              >
                Review Payment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* History List */}
      <div className="mt-8">
        <h3 className="text-xl font-black text-gray-800 dark:text-white mb-6">Remittance History</h3>
        {remittances.length > 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/80 border-b dark:border-gray-700">
                <tr>
                  <th className="text-left py-4 px-5 font-bold text-gray-600 dark:text-gray-400">Amount</th>
                  <th className="text-left py-4 px-5 font-bold text-gray-600 dark:text-gray-400">Method</th>
                  <th className="text-left py-4 px-5 font-bold text-gray-600 dark:text-gray-400">Date</th>
                  <th className="text-left py-4 px-5 font-bold text-gray-600 dark:text-gray-400">Reference</th>
                  <th className="text-left py-4 px-5 font-bold text-gray-600 dark:text-gray-400">Status</th>
                  <th className="text-right py-4 px-5 font-bold text-gray-600 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {remittances.map((remit) => (
                  <tr key={remit.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="py-4 px-5 font-black text-gray-900 dark:text-white">₦{Number(remit.amount).toLocaleString()}</td>
                    <td className="py-4 px-5 font-bold text-gray-700 dark:text-gray-300 uppercase">{remit.payment_method}</td>
                    <td className="py-4 px-5 text-gray-500 dark:text-gray-400">{new Date(remit.created_at).toLocaleString()}</td>
                    <td className="py-4 px-5 font-mono text-gray-500 dark:text-gray-400">{remit.reference_number || 'N/A'}</td>
                    <td className="py-4 px-5">
                      <span className={`inline-block px-3 py-1 rounded-xl text-[11px] font-black uppercase tracking-wider ${
                        remit.status === 'approved' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' :
                        remit.status === 'rejected' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400' :
                        'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400'
                      }`}>
                        {remit.status}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <button
                        onClick={() => { setSelectedPayment(remit); setShowDetailsModal(true); }}
                        className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400 font-medium">No remittance history found.</p>
          </div>
        )}
      </div>

      {showDetailsModal && selectedPayment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
              <h3 className="text-2xl font-black flex items-center gap-3 text-gray-900 dark:text-white">
                <FileText className="w-6 h-6 text-pink-500" /> Remittance Details
              </h3>
              <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-4 bg-pink-50 dark:bg-pink-900/30 p-4 rounded-2xl border border-pink-100 dark:border-pink-900/50">
                <div>
                  <p className="text-sm font-bold text-pink-600 dark:text-pink-400">Staff Member</p>
                  <p className="text-lg font-black text-gray-900 dark:text-white">{selectedPayment.staff_name}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-pink-600 dark:text-pink-400">Remittance Amount</p>
                  <p className="text-xl font-black text-pink-600 dark:text-pink-400">₦{Number(selectedPayment.amount).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-pink-600 dark:text-pink-400">Status</p>
                  <span className={`inline-block px-3 py-1 rounded-xl text-xs font-black uppercase mt-1 ${
                    selectedPayment.status === 'approved' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' :
                    selectedPayment.status === 'rejected' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400' :
                    'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400'
                  }`}>
                    {selectedPayment.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-bold text-pink-600 dark:text-pink-400">Reference</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{selectedPayment.reference_number || 'N/A'}</p>
                </div>
                {selectedPayment.status === 'rejected' && selectedPayment.rejection_reason && (
                  <div className="col-span-2 mt-2 p-4 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-900/50 rounded-xl">
                    <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase mb-1 flex items-center gap-2">
                      <XCircle className="w-4 h-4" /> Rejection Feedback
                    </p>
                    <p className="text-sm font-bold text-red-700 dark:text-red-300">{selectedPayment.rejection_reason}</p>
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-3">Collected Items Covered</h4>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 dark:bg-gray-800">
                      <tr>
                        <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-400">Creditor</th>
                        <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-400">Receipt</th>
                        <th className="text-right py-3 px-4 font-bold text-gray-600 dark:text-gray-400">Collected Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {(selectedPayment.items_paid_for || []).map((item: any, idx: number) => (
                        <tr key={idx}>
                          <td className="py-3 px-4 font-bold text-gray-900 dark:text-white">{item.creditor_name}</td>
                          <td className="py-3 px-4 font-medium text-gray-500 dark:text-gray-400">{item.receipt}</td>
                          <td className="py-3 px-4 font-black text-right text-gray-900 dark:text-white">₦{Number(item.amount).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedPayment.receipt_url && (
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center justify-between">
                    Proof of Transfer
                    <button onClick={() => window.open(selectedPayment.receipt_url, '_blank')} className="text-sm text-pink-600 hover:text-pink-700 flex items-center gap-1">
                      <Download className="w-4 h-4" /> Download
                    </button>
                  </h4>
                  <div 
                    className="relative rounded-2xl overflow-hidden border-2 border-gray-100 dark:border-gray-700 cursor-zoom-in bg-gray-50 dark:bg-gray-900 flex items-center justify-center h-48"
                    onClick={() => setShowReceiptPreview(true)}
                  >
                    {selectedPayment.receipt_url.endsWith('.pdf') ? (
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="w-12 h-12 text-pink-500" />
                        <span className="font-bold text-gray-600 dark:text-gray-400">View PDF Receipt</span>
                      </div>
                    ) : (
                      <img src={selectedPayment.receipt_url} alt="Receipt" className="object-cover h-full w-full hover:scale-105 transition-transform duration-500" />
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-6 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-8 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-pink-500 text-gray-700 dark:text-gray-200 hover:text-pink-600 font-bold rounded-2xl transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showReceiptPreview && selectedPayment?.receipt_url && (
        <div className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setShowReceiptPreview(false)}>
          {selectedPayment.receipt_url.endsWith('.pdf') ? (
            <iframe src={selectedPayment.receipt_url} className="w-full h-full rounded-xl bg-white" />
          ) : (
            <img src={selectedPayment.receipt_url} alt="Receipt Full" className="max-w-full max-h-[95vh] object-contain rounded-xl shadow-2xl" />
          )}
        </div>
      )}

      {showUploadPreview && receiptPreview && (
        <div className="fixed inset-0 bg-black/95 z-[70] flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setShowUploadPreview(false)}>
          <div className="max-w-5xl max-h-[95vh] w-full relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowUploadPreview(false); }}
              className="absolute top-4 right-4 bg-white dark:bg-gray-800 rounded-full p-2 hover:bg-gray-200 dark:hover:bg-gray-700 z-10 shadow-lg"
            >
              <X className="w-6 h-6 text-black dark:text-white" />
            </button>
            <img src={receiptPreview} alt="Uploaded receipt" className="w-full h-full object-contain rounded-xl shadow-2xl" />
          </div>
        </div>
      )}

      {/* SUBMISSION PREVIEW MODAL */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
              <h3 className="text-2xl font-black flex items-center gap-3 text-gray-900 dark:text-white">
                <CheckCircle className="w-6 h-6 text-green-500" /> Confirm Remittance
              </h3>
              <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div className="bg-pink-50 dark:bg-pink-900/30 p-4 rounded-2xl border border-pink-100 dark:border-pink-900/50 text-center">
                <p className="text-sm font-bold text-pink-600 dark:text-pink-400 uppercase mb-1">Total Amount to Remit</p>
                <p className="text-4xl font-black text-pink-600 dark:text-pink-400">₦{Number(paymentAmount).toLocaleString()}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border dark:border-gray-700">
                  <p className="font-bold text-gray-500 dark:text-gray-400 uppercase text-[10px]">Method</p>
                  <p className="font-black text-gray-900 dark:text-white uppercase">{paymentMethod}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border dark:border-gray-700">
                  <p className="font-bold text-gray-500 dark:text-gray-400 uppercase text-[10px]">Reference</p>
                  <p className="font-black text-gray-900 dark:text-white">{referenceNumber || 'CASH'}</p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-3">Items Included in this Remittance</h4>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 dark:bg-gray-800">
                      <tr>
                        <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-400">Creditor</th>
                        <th className="text-right py-3 px-4 font-bold text-gray-600 dark:text-gray-400">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {unremitted
                        .filter(item => selectedItems.includes(item.id))
                        .map((item, idx) => (
                          <tr key={idx}>
                            <td className="py-3 px-4 font-bold text-gray-900 dark:text-white">{item.creditors?.full_name}</td>
                            <td className="py-3 px-4 font-black text-right text-gray-900 dark:text-white">₦{Number(item.amount).toLocaleString()}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

               {receiptFile && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-900/50 rounded-xl flex items-center gap-3">
                  <FileText className="w-6 h-6 text-blue-500 dark:text-blue-400" />
                  <div>
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">Receipt Attached</p>
                    <p className="text-sm font-bold text-blue-800 dark:text-blue-200">{receiptFile.name}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 flex gap-3">
              <button
                disabled={submitting}
                onClick={() => setShowPreview(false)}
                className="flex-1 py-4 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-2xl transition-all disabled:opacity-50"
              >
                Go Back
              </button>
              <button
                disabled={submitting}
                onClick={handleSubmit}
                className="flex-[2] py-4 bg-green-500 hover:bg-green-600 text-white font-black rounded-2xl shadow-lg shadow-green-100 dark:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : (
                  <>
                    <CheckCircle className="w-5 h-5" /> Confirm & Submit
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
