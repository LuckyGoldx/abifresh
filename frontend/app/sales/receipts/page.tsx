'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { FileText, Download, Printer, Search, Filter, Eye } from 'lucide-react';

interface Receipt {
  id: string;
  receipt_number: string;
  total_amount: number;
  payment_method: 'cash' | 'pos' | 'transfer';
  items_count: number;
  created_at: string;
  sold_outside_jalingo?: boolean;
  receipt_items?: Array<{
    id: string;
    item_id: string | { name: string; price_jalingo?: number; price_outside?: number };
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
}

const formatReceiptDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-NG', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const formatReceiptTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-NG', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

export default function ReceiptsPage() {
  const { user, token } = useAuthStore();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<'all' | 'cash' | 'pos' | 'transfer'>('all');
  const [mounted, setMounted] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [itemNames, setItemNames] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && user && token) {
      fetchReceipts();
    }
  }, [mounted, user, token]);

  const fetchReceipts = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/api/receipts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReceipts(response.data || []);

      const itemsResponse = await api.get('/api/inventory/active-store', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const itemMap: { [key: string]: string } = {};
      itemsResponse.data?.forEach((item: any) => {
        itemMap[item.id] = item.name;
      });
      setItemNames(itemMap);
    } catch (error: any) {
      console.error('Failed to fetch receipts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    return receipts.filter((receipt) => {
      const matchesSearch = receipt.receipt_number.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPayment =
        filterPaymentMethod === 'all' || receipt.payment_method === filterPaymentMethod;
      return matchesSearch && matchesPayment;
    });
  };

  const downloadReceiptAsImage = (receipt: Receipt) => {
    const printWindow = window.open('', '_blank', 'width=600,height=800');
    if (!printWindow) {
      alert('Please allow pop-ups and try again.');
      return;
    }

    let itemsRow = '';
    receipt.receipt_items?.forEach((item) => {
      const itemName = typeof item.item_id === 'object' ? item.item_id.name : itemNames[item.item_id] || 'Item';
      const correctPrice = (receipt.sold_outside_jalingo && typeof item.item_id === 'object' && item.item_id?.price_outside
        ? item.item_id.price_outside
        : typeof item.item_id === 'object' && item.item_id?.price_jalingo
        ? item.item_id.price_jalingo
        : item.unit_price || 0);
      const lineTotal = correctPrice * item.quantity;
      itemsRow = itemsRow + '<tr><td>' + itemName + '</td><td>' + item.quantity + '</td><td>₦' + lineTotal.toLocaleString() + '</td></tr>';
    });

    const htmlContent =
      '<html><head><title>Receipt ' +
      receipt.receipt_number +
      '</title></head><body style="font-family:Arial;padding:20px;"><h3>ABIFRESH & KIDDIES VENTURES</h3><p>Receipt #' +
      receipt.receipt_number +
      '</p><table border="1" width="100%"><tr><th>Item</th><th>Qty</th><th>Total</th></tr>' +
      itemsRow +
      '</table><h4>Total: ₦' +
      receipt.total_amount.toLocaleString() +
      '</h4></body></html>';

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const printReceipt = (receipt: Receipt) => {
    const printWindow = window.open('', '_blank', 'width=600,height=800');
    if (!printWindow) {
      alert('Please allow pop-ups and try again.');
      return;
    }

    let itemsRow = '';
    receipt.receipt_items?.forEach((item) => {
      const itemName = typeof item.item_id === 'object' ? item.item_id.name : itemNames[item.item_id] || 'Item';
      const correctPrice = (receipt.sold_outside_jalingo && typeof item.item_id === 'object' && item.item_id?.price_outside
        ? item.item_id.price_outside
        : typeof item.item_id === 'object' && item.item_id?.price_jalingo
        ? item.item_id.price_jalingo
        : item.unit_price || 0);
      const lineTotal = correctPrice * item.quantity;
      itemsRow = itemsRow + '<tr><td>' + itemName + '</td><td>' + item.quantity + '</td><td>₦' + lineTotal.toLocaleString() + '</td></tr>';
    });

    const htmlContent =
      '<html><head><title>Receipt ' +
      receipt.receipt_number +
      '</title></head><body style="font-family:Arial;padding:20px;"><h3>ABIFRESH & KIDDIES VENTURES</h3><p>Receipt #' +
      receipt.receipt_number +
      '</p><table border="1" width="100%"><tr><th>Item</th><th>Qty</th><th>Total</th></tr>' +
      itemsRow +
      '</table><h4>Total: ₦' +
      receipt.total_amount.toLocaleString() +
      '</h4></body></html>';

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = () => {
      setTimeout(() => printWindow.print(), 250);
    };
  };

  if (!mounted) {
    return (
      <div className="text-center py-12 text-gray-600 dark:text-gray-400">
        Loading...
      </div>
    );
  }

  const filteredReceipts = handleSearch();

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <FileText className="w-8 h-8 text-pink-500" />
          Receipts History
        </h1>
        <button
          onClick={fetchReceipts}
          className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition"
        >
          Refresh
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-4">
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by receipt number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Filter size={20} className="text-gray-600 dark:text-gray-400" />
            <select
              value={filterPaymentMethod}
              onChange={(e) => setFilterPaymentMethod(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Payment Methods</option>
              <option value="cash">Cash</option>
              <option value="pos">POS</option>
              <option value="transfer">Transfer</option>
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-600 dark:text-gray-400">
          Loading receipts...
        </div>
      ) : filteredReceipts.length === 0 ? (
        <div className="text-center py-12 text-gray-600 dark:text-gray-400">
          No receipts found
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                  Receipt #
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                  Payment
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  Amount
                </th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredReceipts.map((receipt) => (
                <tr
                  key={receipt.id}
                  className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  <td className="px-6 py-4 text-sm font-mono text-gray-900 dark:text-white">
                    {receipt.receipt_number}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {formatReceiptDate(receipt.created_at)} {formatReceiptTime(receipt.created_at)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {receipt.items_count} item{receipt.items_count !== 1 ? 's' : ''}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={
                        receipt.payment_method === 'cash'
                          ? 'px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : receipt.payment_method === 'pos'
                          ? 'px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          : 'px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                      }
                    >
                      {receipt.payment_method.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white text-right">
                    ₦{receipt.total_amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-center">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => {
                          setSelectedReceipt(receipt);
                          setShowDetails(true);
                        }}
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                        title="View details"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => downloadReceiptAsImage(receipt)}
                        className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 flex items-center gap-1"
                        title="Save as image"
                      >
                        <Download size={18} />
                      </button>
                      <button
                        onClick={() => printReceipt(receipt)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 flex items-center gap-1"
                        title="Print"
                      >
                        <Printer size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showDetails && selectedReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="bg-gradient-to-r from-pink-500 to-pink-600 px-6 py-4 flex justify-between items-center sticky top-0">
              <h2 className="text-2xl font-bold text-white">Receipt Details</h2>
              <button
                onClick={() => setShowDetails(false)}
                className="text-white hover:text-pink-100 text-2xl"
              >
                Close
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3 border-l-4 border-pink-500">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 uppercase font-semibold">
                      Receipt Number
                    </p>
                    <p className="text-lg font-mono font-bold text-gray-900 dark:text-white">
                      {selectedReceipt.receipt_number}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 uppercase font-semibold">
                      Payment Method
                    </p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white capitalize">
                      {selectedReceipt.payment_method}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200 dark:border-gray-600">
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 uppercase font-semibold">
                      Date
                    </p>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {formatReceiptDate(selectedReceipt.created_at)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 uppercase font-semibold">
                      Time
                    </p>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {formatReceiptTime(selectedReceipt.created_at)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">Items</h3>
                <div className="space-y-2 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  {selectedReceipt.receipt_items && selectedReceipt.receipt_items.length > 0 ? (
                    selectedReceipt.receipt_items.map((item, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-600 last:border-b-0"
                      >
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {typeof item.item_id === 'object' && item.item_id?.name
                              ? item.item_id.name
                              : itemNames[typeof item.item_id === 'string' ? item.item_id : ''] || 'Item'}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Qty: {item.quantity} x ₦{(
                              selectedReceipt.sold_outside_jalingo && typeof item.item_id === 'object' && item.item_id?.price_outside
                                ? item.item_id.price_outside
                                : typeof item.item_id === 'object' && item.item_id?.price_jalingo
                                ? item.item_id.price_jalingo
                                : item.unit_price || 0
                            ).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white">
                            ₦{(
                              (selectedReceipt.sold_outside_jalingo && typeof item.item_id === 'object' && item.item_id?.price_outside
                                ? item.item_id.price_outside
                                : typeof item.item_id === 'object' && item.item_id?.price_jalingo
                                ? item.item_id.price_jalingo
                                : item.unit_price || 0) * item.quantity
                            ).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-600 dark:text-gray-400 py-4">No items found</p>
                  )}
                </div>
              </div>

              <div className="bg-gradient-to-r from-pink-50 to-pink-100 dark:from-pink-900 dark:to-pink-800 rounded-lg p-4 border-l-4 border-pink-500">
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-300 uppercase font-semibold mb-2">
                    Total Amount
                  </p>
                  <p className="text-3xl font-bold text-pink-600 dark:text-pink-300">
                    ₦{selectedReceipt.total_amount.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowDetails(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    downloadReceiptAsImage(selectedReceipt);
                    setShowDetails(false);
                  }}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 font-medium transition"
                >
                  <Download size={18} /> Save
                </button>
                <button
                  onClick={() => {
                    printReceipt(selectedReceipt);
                    setShowDetails(false);
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 font-medium transition"
                >
                  <Printer size={18} /> Print
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
