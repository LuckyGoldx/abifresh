'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileDown, FileSpreadsheet, Search, Plus, Minus, Trash2,
  Package, AlertTriangle, ShoppingCart, CheckCircle, ClipboardList,
  Eye, Clock, ArrowLeft, History, RotateCcw, Download, X
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useAuthStore } from '@/store/auth';
import { toast } from 'sonner';

// Company details
const COMPANY_NAME = 'ABIFRESH & KIDDIES VENTURES';
const COMPANY_EMAIL = 'abifreshandkiddies@gmail.com';
const COMPANY_PHONE = '+2349034016120';

const ORDER_HISTORY_KEY = 'restock-order-history';

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit_price: number;
  is_available: boolean;
  main_store_quantity: number;
  active_store_quantity: number;
  brand?: string;
  package_type?: string;
}

interface OrderItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  currentStock: number;
  orderQuantity: number;
  unitPrice: number;
  brand?: string;
  package_type?: string;
}

interface SavedOrder {
  id: string;
  orderNumber: string;
  date: string;
  items: OrderItem[];
  totalItems: number;
  totalQuantity: number;
  totalCost: number;
  note: string;
  status: 'pending' | 'completed' | 'cancelled';
}

type PageView = 'create' | 'history' | 'preview' | 'view-order';

export default function RestockOrdersPage() {
  const token = useAuthStore((state) => state.token);
  const [mounted, setMounted] = useState(false);

  // Inventory data
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Order builder state
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'low-stock' | 'add-more'>('low-stock');
  const [orderNote, setOrderNote] = useState('');
  const [selectAll, setSelectAll] = useState(false);

  // Page navigation
  const [pageView, setPageView] = useState<PageView>('history');
  const [viewingOrder, setViewingOrder] = useState<SavedOrder | null>(null);

  // Order history
  const [orderHistory, setOrderHistory] = useState<SavedOrder[]>([]);
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'pending' | 'completed' | 'cancelled'>('all');

  // Delete confirmation modal
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // Load items from API
  useEffect(() => {
    if (!mounted || !token) return;
    const fetchItems = async () => {
      try {
        setLoading(true);
        const res = await fetch('http://localhost:5000/api/inventory/items', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setItems(data.items || data);
        }
      } catch {
        toast.error('Failed to load inventory items');
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, [mounted, token]);

  // Load order history from localStorage
  useEffect(() => {
    if (!mounted) return;
    try {
      const saved = localStorage.getItem(ORDER_HISTORY_KEY);
      if (saved) {
        setOrderHistory(JSON.parse(saved));
      }
    } catch {
      console.error('Failed to load order history');
    }
  }, [mounted]);

  const saveOrderHistory = useCallback((orders: SavedOrder[]) => {
    setOrderHistory(orders);
    localStorage.setItem(ORDER_HISTORY_KEY, JSON.stringify(orders));
  }, []);

  // Low stock items
  const lowStockItems = useMemo(() => {
    return items
      .filter(item => {
        const totalQty = item.main_store_quantity + item.active_store_quantity;
        return totalQty < 100 || !item.is_available;
      })
      .sort((a, b) => {
        const aQty = a.main_store_quantity + a.active_store_quantity;
        const bQty = b.main_store_quantity + b.active_store_quantity;
        return aQty - bQty;
      });
  }, [items]);

  const otherItems = useMemo(() => {
    return items
      .filter(item => {
        const totalQty = item.main_store_quantity + item.active_store_quantity;
        return totalQty >= 100 && item.is_available;
      })
      .sort((a, b) => {
        const aQty = a.main_store_quantity + a.active_store_quantity;
        const bQty = b.main_store_quantity + b.active_store_quantity;
        return aQty - bQty;
      });
  }, [items]);

  const filteredLowStock = useMemo(() => {
    if (!searchTerm) return lowStockItems;
    const term = searchTerm.toLowerCase();
    return lowStockItems.filter(item =>
      item.name.toLowerCase().includes(term) ||
      item.sku.toLowerCase().includes(term) ||
      item.category?.toLowerCase().includes(term) ||
      item.brand?.toLowerCase().includes(term)
    );
  }, [lowStockItems, searchTerm]);

  const filteredOther = useMemo(() => {
    if (!searchTerm) return otherItems;
    const term = searchTerm.toLowerCase();
    return otherItems.filter(item =>
      item.name.toLowerCase().includes(term) ||
      item.sku.toLowerCase().includes(term) ||
      item.category?.toLowerCase().includes(term) ||
      item.brand?.toLowerCase().includes(term)
    );
  }, [otherItems, searchTerm]);

  // Filtered order history
  const filteredHistory = useMemo(() => {
    let filtered = orderHistory;
    if (historyFilter !== 'all') {
      filtered = filtered.filter(o => o.status === historyFilter);
    }
    if (historySearch) {
      const term = historySearch.toLowerCase();
      filtered = filtered.filter(o =>
        o.orderNumber.toLowerCase().includes(term) ||
        o.note.toLowerCase().includes(term) ||
        o.items.some(i => i.name.toLowerCase().includes(term))
      );
    }
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [orderHistory, historyFilter, historySearch]);

  const isItemInOrder = (itemId: string) => orderItems.some(o => o.id === itemId);

  const addToOrder = (item: InventoryItem, quantity?: number) => {
    if (isItemInOrder(item.id)) return;
    const totalQty = item.main_store_quantity + item.active_store_quantity;
    const suggestedQty = quantity || Math.max(100 - totalQty, 10);
    setOrderItems(prev => [...prev, {
      id: item.id,
      name: item.name,
      sku: item.sku,
      category: item.category,
      currentStock: totalQty,
      orderQuantity: suggestedQty > 0 ? suggestedQty : 10,
      unitPrice: item.unit_price,
      brand: item.brand,
      package_type: item.package_type,
    }]);
  };

  const removeFromOrder = (itemId: string) => {
    setOrderItems(prev => prev.filter(o => o.id !== itemId));
  };

  const updateOrderQuantity = (itemId: string, quantity: number) => {
    if (quantity < 1) return;
    setOrderItems(prev => prev.map(o =>
      o.id === itemId ? { ...o, orderQuantity: quantity } : o
    ));
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      const currentList = activeTab === 'low-stock' ? filteredLowStock : filteredOther;
      currentList.forEach(item => {
        if (!isItemInOrder(item.id)) {
          addToOrder(item);
        }
      });
    } else {
      const currentListIds = (activeTab === 'low-stock' ? filteredLowStock : filteredOther).map(i => i.id);
      setOrderItems(prev => prev.filter(o => !currentListIds.includes(o.id)));
    }
  };

  const totalOrderItems = orderItems.length;
  const totalOrderQuantity = orderItems.reduce((sum, o) => sum + o.orderQuantity, 0);
  const totalEstimatedCost = orderItems.reduce((sum, o) => sum + (o.orderQuantity * o.unitPrice), 0);

  const getStockStatusBadge = (totalQty: number, isAvailable: boolean) => {
    if (totalQty === 0) return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200">Out of Stock</span>;
    if (!isAvailable) return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">Unavailable</span>;
    if (totalQty < 50) return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200">Critical</span>;
    if (totalQty < 100) return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-200">Low</span>;
    return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200">In Stock</span>;
  };

  const formatDate = (dateStr?: string) => {
    const now = dateStr ? new Date(dateStr) : new Date();
    return now.toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    }) + ' at ' + now.toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit',
    });
  };

  const generateOrderNumber = () => {
    const now = new Date();
    return `ORD-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  };

  // ======== Save Order to History ========
  const saveOrderToHistory = () => {
    if (orderItems.length === 0) return;
    const order: SavedOrder = {
      id: crypto.randomUUID(),
      orderNumber: generateOrderNumber(),
      date: new Date().toISOString(),
      items: [...orderItems],
      totalItems: totalOrderItems,
      totalQuantity: totalOrderQuantity,
      totalCost: totalEstimatedCost,
      note: orderNote,
      status: 'pending',
    };
    const updated = [order, ...orderHistory];
    saveOrderHistory(updated);
    toast.success(`Order ${order.orderNumber} saved successfully!`);

    // Reset form
    setOrderItems([]);
    setOrderNote('');
    setSearchTerm('');
    setSelectAll(false);
    setPageView('history');
  };

  const updateOrderStatus = (orderId: string, status: SavedOrder['status']) => {
    const updated = orderHistory.map(o => o.id === orderId ? { ...o, status } : o);
    saveOrderHistory(updated);
    if (viewingOrder?.id === orderId) {
      setViewingOrder({ ...viewingOrder, status });
    }
    toast.success(`Order status updated to ${status}`);
  };

  const deleteOrder = (orderId: string) => {
    const updated = orderHistory.filter(o => o.id !== orderId);
    saveOrderHistory(updated);
    setDeleteOrderId(null);
    if (viewingOrder?.id === orderId) {
      setViewingOrder(null);
      setPageView('history');
    }
    toast.success('Order deleted');
  };

  // ======== PDF Generation ========
  const generatePDFForOrder = (order: { items: OrderItem[]; orderNumber: string; date?: string; note: string; totalItems: number; totalQuantity: number; totalCost: number }) => {
    if (order.items.length === 0) return;

    const doc = new jsPDF();
    const dateStr = formatDate(order.date);
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header background
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 52, 'F');

    // Company name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(COMPANY_NAME, pageWidth / 2, 18, { align: 'center' });

    // Contact info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Email: ${COMPANY_EMAIL}  |  Phone: ${COMPANY_PHONE}`, pageWidth / 2, 28, { align: 'center' });

    // Order title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(253, 186, 116);
    doc.text('PURCHASE / RESTOCK ORDER', pageWidth / 2, 40, { align: 'center' });

    // Order info bar
    doc.setFillColor(241, 245, 249);
    doc.rect(0, 55, pageWidth, 18, 'F');
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Order #: ${order.orderNumber}`, 14, 64);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${dateStr}`, 14, 70);
    doc.text(`Total Items: ${order.totalItems}  |  Total Quantity: ${order.totalQuantity.toLocaleString()}`, pageWidth - 14, 64, { align: 'right' });
    doc.text(`Estimated Cost: \u20A6${order.totalCost.toLocaleString()}`, pageWidth - 14, 70, { align: 'right' });

    const tableData = order.items.map((item, index) => [
      index + 1,
      item.name,
      item.sku || '-',
      item.category || '-',
      item.currentStock.toLocaleString(),
      item.orderQuantity.toLocaleString(),
      `\u20A6${item.unitPrice.toLocaleString()}`,
      `\u20A6${(item.orderQuantity * item.unitPrice).toLocaleString()}`,
    ]);

    autoTable(doc, {
      startY: 78,
      head: [['#', 'Item Name', 'SKU', 'Category', 'Current Stock', 'Order Qty', 'Unit Price', 'Subtotal']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'center',
      },
      bodyStyles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { cellWidth: 40 },
        2: { halign: 'center', cellWidth: 22 },
        3: { halign: 'center', cellWidth: 24 },
        4: { halign: 'center', cellWidth: 22 },
        5: { halign: 'center', cellWidth: 20, fontStyle: 'bold' },
        6: { halign: 'right', cellWidth: 24 },
        7: { halign: 'right', cellWidth: 24, fontStyle: 'bold' },
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didDrawPage: () => {
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFillColor(15, 23, 42);
        doc.rect(0, pageHeight - 16, pageWidth, 16, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text(`${COMPANY_NAME} | ${COMPANY_EMAIL} | ${COMPANY_PHONE}`, pageWidth / 2, pageHeight - 7, { align: 'center' });
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFillColor(15, 23, 42);
    doc.roundedRect(pageWidth - 80, finalY, 66, 24, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL', pageWidth - 74, finalY + 9);
    doc.setFontSize(12);
    doc.text(`\u20A6${order.totalCost.toLocaleString()}`, pageWidth - 74, finalY + 19);

    if (order.note) {
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Notes:', 14, finalY + 4);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const noteLines = doc.splitTextToSize(order.note, pageWidth - 100);
      doc.text(noteLines, 14, finalY + 12);
    }

    doc.save(`Restock_Order_${order.orderNumber}.pdf`);
    toast.success('PDF downloaded successfully');
  };

  // ======== Excel Generation ========
  const generateExcelForOrder = (order: { items: OrderItem[]; orderNumber: string; date?: string; note: string; totalItems: number; totalQuantity: number; totalCost: number }) => {
    if (order.items.length === 0) return;

    const dateStr = formatDate(order.date);

    const headerRows = [
      [COMPANY_NAME],
      [`Email: ${COMPANY_EMAIL}  |  Phone: ${COMPANY_PHONE}`],
      [''],
      ['PURCHASE / RESTOCK ORDER'],
      [`Order #: ${order.orderNumber}`],
      [`Date: ${dateStr}`],
      [`Total Items: ${order.totalItems}  |  Total Quantity: ${order.totalQuantity}  |  Estimated Cost: \u20A6${order.totalCost.toLocaleString()}`],
      [''],
      ['#', 'Item Name', 'SKU', 'Category', 'Current Stock', 'Order Quantity', 'Unit Price (\u20A6)', 'Subtotal (\u20A6)'],
    ];

    const dataRows = order.items.map((item, index) => [
      index + 1,
      item.name,
      item.sku || '-',
      item.category || '-',
      item.currentStock,
      item.orderQuantity,
      item.unitPrice,
      item.orderQuantity * item.unitPrice,
    ]);

    const summaryRows: any[][] = [
      [''],
      ['', '', '', '', '', 'TOTAL QUANTITY:', order.totalQuantity, ''],
      ['', '', '', '', '', 'TOTAL COST:', '', order.totalCost],
    ];

    if (order.note) {
      summaryRows.push(['']);
      summaryRows.push(['Notes:', order.note]);
    }

    const allRows = [...headerRows, ...dataRows, ...summaryRows];
    const ws = XLSX.utils.aoa_to_sheet(allRows);

    ws['!cols'] = [
      { wch: 5 }, { wch: 35 }, { wch: 15 }, { wch: 18 },
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 18 },
    ];

    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: 7 } },
      { s: { r: 4, c: 0 }, e: { r: 4, c: 7 } },
      { s: { r: 5, c: 0 }, e: { r: 5, c: 7 } },
      { s: { r: 6, c: 0 }, e: { r: 6, c: 7 } },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Restock Order');
    XLSX.writeFile(wb, `Restock_Order_${order.orderNumber}.xlsx`);
    toast.success('Excel downloaded successfully');
  };

  // Current order download helpers
  const generatePDF = () => {
    generatePDFForOrder({
      items: orderItems,
      orderNumber: generateOrderNumber(),
      note: orderNote,
      totalItems: totalOrderItems,
      totalQuantity: totalOrderQuantity,
      totalCost: totalEstimatedCost,
    });
  };

  const generateExcel = () => {
    generateExcelForOrder({
      items: orderItems,
      orderNumber: generateOrderNumber(),
      note: orderNote,
      totalItems: totalOrderItems,
      totalQuantity: totalOrderQuantity,
      totalCost: totalEstimatedCost,
    });
  };

  // Navigate to create order and reset form
  const startNewOrder = () => {
    setOrderItems([]);
    setOrderNote('');
    setSearchTerm('');
    setSelectAll(false);
    setActiveTab('low-stock');
    setPageView('create');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300">Pending</span>;
      case 'completed': return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">Completed</span>;
      case 'cancelled': return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">Cancelled</span>;
      default: return null;
    }
  };

  if (!mounted) return null;

  // ======== VIEW ORDER ========
  if (pageView === 'view-order' && viewingOrder) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-5">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <button
                  onClick={() => { setViewingOrder(null); setPageView('history'); }}
                  className="text-white/70 hover:text-white transition"
                >
                  <ArrowLeft size={20} />
                </button>
                <h1 className="text-xl font-bold">{COMPANY_NAME}</h1>
              </div>
              <p className="text-sm text-slate-300 ml-8">{COMPANY_EMAIL} | {COMPANY_PHONE}</p>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(viewingOrder.status)}
            </div>
          </div>
        </div>

        {/* Order Info Bar */}
        <div className="bg-slate-100 dark:bg-slate-800 border-b dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">PURCHASE / RESTOCK ORDER</h2>
              <p className="text-sm text-slate-500 dark:text-gray-400">
                Order #: {viewingOrder.orderNumber} | {formatDate(viewingOrder.date)}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <select
                value={viewingOrder.status}
                onChange={(e) => updateOrderStatus(viewingOrder.id, e.target.value as SavedOrder['status'])}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm font-medium dark:text-white"
              >
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <button
                onClick={() => generatePDFForOrder(viewingOrder)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition shadow"
              >
                <FileDown size={16} /> PDF
              </button>
              <button
                onClick={() => generateExcelForOrder(viewingOrder)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition shadow"
              >
                <FileSpreadsheet size={16} /> Excel
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4 text-center border border-blue-100 dark:border-blue-800">
              <p className="text-sm text-blue-600 dark:text-blue-300 font-medium">Total Items</p>
              <p className="text-3xl font-bold text-blue-700 dark:text-blue-200">{viewingOrder.totalItems}</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/30 rounded-xl p-4 text-center border border-purple-100 dark:border-purple-800">
              <p className="text-sm text-purple-600 dark:text-purple-300 font-medium">Total Quantity</p>
              <p className="text-3xl font-bold text-purple-700 dark:text-purple-200">{viewingOrder.totalQuantity.toLocaleString()}</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/30 rounded-xl p-4 text-center border border-amber-100 dark:border-amber-800">
              <p className="text-sm text-amber-600 dark:text-amber-300 font-medium">Estimated Cost</p>
              <p className="text-3xl font-bold text-amber-700 dark:text-amber-200">₦{viewingOrder.totalCost.toLocaleString()}</p>
            </div>
          </div>

          {/* Items Table */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border dark:border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="py-3 px-4 text-left text-xs font-semibold">#</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold">Item Name</th>
                    <th className="py-3 px-4 text-center text-xs font-semibold">SKU</th>
                    <th className="py-3 px-4 text-center text-xs font-semibold">Category</th>
                    <th className="py-3 px-4 text-center text-xs font-semibold">Stock at Order</th>
                    <th className="py-3 px-4 text-center text-xs font-semibold">Order Qty</th>
                    <th className="py-3 px-4 text-right text-xs font-semibold">Unit Price</th>
                    <th className="py-3 px-4 text-right text-xs font-semibold">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingOrder.items.map((item, index) => (
                    <tr key={item.id} className={`border-b dark:border-gray-800 ${index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-slate-50 dark:bg-gray-800/50'}`}>
                      <td className="py-3 px-4 text-sm text-center text-gray-500">{index + 1}</td>
                      <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">{item.name}</td>
                      <td className="py-3 px-4 text-sm text-center text-gray-500">{item.sku || '-'}</td>
                      <td className="py-3 px-4 text-sm text-center text-gray-500">{item.category || '-'}</td>
                      <td className="py-3 px-4 text-sm text-center">{item.currentStock.toLocaleString()}</td>
                      <td className="py-3 px-4 text-sm text-center font-bold text-blue-600">{item.orderQuantity.toLocaleString()}</td>
                      <td className="py-3 px-4 text-sm text-right">₦{item.unitPrice.toLocaleString()}</td>
                      <td className="py-3 px-4 text-sm text-right font-bold">₦{(item.orderQuantity * item.unitPrice).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 text-white font-bold">
                    <td colSpan={5} className="py-3 px-4 text-right">TOTAL</td>
                    <td className="py-3 px-4 text-center">{viewingOrder.totalQuantity.toLocaleString()}</td>
                    <td className="py-3 px-4"></td>
                    <td className="py-3 px-4 text-right">₦{viewingOrder.totalCost.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Notes */}
          {viewingOrder.note && (
            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-700">
              <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-1">Notes:</p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 whitespace-pre-wrap">{viewingOrder.note}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ======== PREVIEW MODE ========
  if (pageView === 'preview') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        {/* Preview Header */}
        <div className="bg-slate-900 text-white px-6 py-5">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <button
                  onClick={() => setPageView('create')}
                  className="text-white/70 hover:text-white transition"
                >
                  <ArrowLeft size={20} />
                </button>
                <h1 className="text-xl font-bold">{COMPANY_NAME}</h1>
              </div>
              <p className="text-sm text-slate-300 ml-8">{COMPANY_EMAIL} | {COMPANY_PHONE}</p>
            </div>
          </div>
        </div>

        {/* Preview Title Bar */}
        <div className="bg-slate-100 dark:bg-slate-800 border-b dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">PURCHASE / RESTOCK ORDER — Preview</h2>
              <p className="text-sm text-slate-500 dark:text-gray-400">{formatDate()}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => { saveOrderToHistory(); generatePDF(); }}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition shadow"
              >
                <FileDown size={16} /> Save & Download PDF
              </button>
              <button
                onClick={() => { saveOrderToHistory(); generateExcel(); }}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition shadow"
              >
                <FileSpreadsheet size={16} /> Save & Download Excel
              </button>
              <button
                onClick={saveOrderToHistory}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold transition shadow"
              >
                <CheckCircle size={16} /> Save Order
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4 text-center border border-blue-100 dark:border-blue-800">
              <p className="text-sm text-blue-600 dark:text-blue-300 font-medium">Total Items</p>
              <p className="text-3xl font-bold text-blue-700 dark:text-blue-200">{totalOrderItems}</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/30 rounded-xl p-4 text-center border border-purple-100 dark:border-purple-800">
              <p className="text-sm text-purple-600 dark:text-purple-300 font-medium">Total Quantity</p>
              <p className="text-3xl font-bold text-purple-700 dark:text-purple-200">{totalOrderQuantity.toLocaleString()}</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/30 rounded-xl p-4 text-center border border-amber-100 dark:border-amber-800">
              <p className="text-sm text-amber-600 dark:text-amber-300 font-medium">Estimated Cost</p>
              <p className="text-3xl font-bold text-amber-700 dark:text-amber-200">₦{totalEstimatedCost.toLocaleString()}</p>
            </div>
          </div>

          {/* Preview Table */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border dark:border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="py-3 px-4 text-left text-xs font-semibold">#</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold">Item Name</th>
                    <th className="py-3 px-4 text-center text-xs font-semibold">SKU</th>
                    <th className="py-3 px-4 text-center text-xs font-semibold">Category</th>
                    <th className="py-3 px-4 text-center text-xs font-semibold">Current Stock</th>
                    <th className="py-3 px-4 text-center text-xs font-semibold">Order Qty</th>
                    <th className="py-3 px-4 text-right text-xs font-semibold">Unit Price</th>
                    <th className="py-3 px-4 text-right text-xs font-semibold">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {orderItems.map((item, index) => (
                    <tr key={item.id} className={`border-b dark:border-gray-800 ${index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-slate-50 dark:bg-gray-800/50'}`}>
                      <td className="py-3 px-4 text-sm text-center text-gray-500">{index + 1}</td>
                      <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">{item.name}</td>
                      <td className="py-3 px-4 text-sm text-center text-gray-500">{item.sku || '-'}</td>
                      <td className="py-3 px-4 text-sm text-center text-gray-500">{item.category || '-'}</td>
                      <td className="py-3 px-4 text-sm text-center">{item.currentStock.toLocaleString()}</td>
                      <td className="py-3 px-4 text-sm text-center font-bold text-blue-600">{item.orderQuantity.toLocaleString()}</td>
                      <td className="py-3 px-4 text-sm text-right">₦{item.unitPrice.toLocaleString()}</td>
                      <td className="py-3 px-4 text-sm text-right font-bold">₦{(item.orderQuantity * item.unitPrice).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 text-white font-bold">
                    <td colSpan={5} className="py-3 px-4 text-right">TOTAL</td>
                    <td className="py-3 px-4 text-center">{totalOrderQuantity.toLocaleString()}</td>
                    <td className="py-3 px-4"></td>
                    <td className="py-3 px-4 text-right">₦{totalEstimatedCost.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Notes */}
          {orderNote && (
            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-700">
              <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-1">Notes:</p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 whitespace-pre-wrap">{orderNote}</p>
            </div>
          )}

          {/* Footer Actions */}
          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => setPageView('create')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition font-medium"
            >
              <ArrowLeft size={16} /> Back to Edit
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ======== CREATE ORDER ========
  if (pageView === 'create') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        {/* Page Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-5">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPageView('history')}
                className="text-white/70 hover:text-white transition"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="bg-white/20 rounded-xl p-2.5">
                <ShoppingCart size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold">Create Restock Order</h1>
                <p className="text-sm text-blue-100">Select items and quantities to order for restocking</p>
              </div>
            </div>
            <button
              onClick={() => setPageView('history')}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition font-medium"
            >
              <History size={16} /> Order History
            </button>
          </div>
        </div>

        {/* Order Summary Bar */}
        <div className="bg-white dark:bg-slate-800 border-b dark:border-gray-700 shadow-sm sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Package size={16} className="text-blue-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  <strong className="text-blue-600">{totalOrderItems}</strong> items selected
                </span>
              </div>
              <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />
              <div className="flex items-center gap-2">
                <ClipboardList size={16} className="text-purple-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  <strong className="text-purple-600">{totalOrderQuantity.toLocaleString()}</strong> total qty
                </span>
              </div>
              <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />
              <span className="text-sm font-semibold text-amber-600">
                Est. ₦{totalEstimatedCost.toLocaleString()}
              </span>
            </div>
            <button
              onClick={() => { if (orderItems.length > 0) setPageView('preview'); }}
              disabled={orderItems.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition shadow"
            >
              <CheckCircle size={16} /> Preview & Save
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-5">
          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
              <p className="text-gray-500">Loading inventory items...</p>
            </div>
          ) : (
            <>
              {/* Tab Navigation */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => { setActiveTab('low-stock'); setSearchTerm(''); setSelectAll(false); }}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition ${
                    activeTab === 'low-stock'
                      ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-200 ring-2 ring-orange-300 dark:ring-orange-600'
                      : 'bg-white dark:bg-gray-800 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 border dark:border-gray-700'
                  }`}
                >
                  <AlertTriangle size={16} />
                  Low Stock / Unavailable ({lowStockItems.length})
                </button>
                <button
                  onClick={() => { setActiveTab('add-more'); setSearchTerm(''); setSelectAll(false); }}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition ${
                    activeTab === 'add-more'
                      ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-200 ring-2 ring-green-300 dark:ring-green-600'
                      : 'bg-white dark:bg-gray-800 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 border dark:border-gray-700'
                  }`}
                >
                  <Plus size={16} />
                  Add More Items ({otherItems.length})
                </button>
              </div>

              {/* Search & Select All */}
              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search items by name, SKU, category, brand..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer whitespace-nowrap bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg px-4 py-2.5">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Select All
                </label>
              </div>

              {/* Items List */}
              <div className="space-y-2 mb-6">
                {activeTab === 'low-stock' ? (
                  filteredLowStock.length === 0 ? (
                    <div className="text-center py-16 text-gray-400 bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-800">
                      <Package size={48} className="mx-auto mb-4 opacity-40" />
                      <p className="font-medium">No low stock items found</p>
                      <p className="text-sm mt-1">All items have sufficient stock</p>
                    </div>
                  ) : (
                    filteredLowStock.map(item => {
                      const totalQty = item.main_store_quantity + item.active_store_quantity;
                      const inOrder = isItemInOrder(item.id);
                      const orderItem = orderItems.find(o => o.id === item.id);

                      return (
                        <div
                          key={item.id}
                          className={`flex items-center gap-3 p-4 rounded-xl border transition ${
                            inOrder
                              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 shadow-sm'
                              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-gray-900 dark:text-white truncate">{item.name}</p>
                              {getStockStatusBadge(totalQty, item.is_available)}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                              <span>SKU: {item.sku}</span>
                              {item.category && <span>• {item.category}</span>}
                              {item.brand && <span>• {item.brand}</span>}
                              <span>• ₦{item.unit_price?.toLocaleString()}/unit</span>
                            </div>
                          </div>
                          <div className="text-center px-3">
                            <p className={`text-lg font-bold ${totalQty < 50 ? 'text-red-600' : 'text-orange-500'}`}>{totalQty}</p>
                            <p className="text-[10px] text-gray-400 uppercase">in stock</p>
                          </div>
                          {inOrder ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateOrderQuantity(item.id, (orderItem?.orderQuantity || 1) - 1)}
                                className="p-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                              >
                                <Minus size={14} />
                              </button>
                              <input
                                type="number"
                                value={orderItem?.orderQuantity || 0}
                                onChange={(e) => updateOrderQuantity(item.id, parseInt(e.target.value) || 1)}
                                className="w-20 text-center py-1.5 border border-blue-300 dark:border-blue-600 rounded-lg bg-white dark:bg-gray-800 text-sm font-bold"
                                min="1"
                              />
                              <button
                                onClick={() => updateOrderQuantity(item.id, (orderItem?.orderQuantity || 0) + 1)}
                                className="p-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                              >
                                <Plus size={14} />
                              </button>
                              <button
                                onClick={() => removeFromOrder(item.id)}
                                className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-600 hover:bg-red-200 dark:hover:bg-red-800 ml-1"
                                title="Remove from order"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => addToOrder(item)}
                              className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-semibold transition"
                            >
                              <Plus size={14} /> Add
                            </button>
                          )}
                        </div>
                      );
                    })
                  )
                ) : (
                  filteredOther.length === 0 ? (
                    <div className="text-center py-16 text-gray-400 bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-800">
                      <Package size={48} className="mx-auto mb-4 opacity-40" />
                      <p className="font-medium">No additional items found</p>
                    </div>
                  ) : (
                    filteredOther.map(item => {
                      const totalQty = item.main_store_quantity + item.active_store_quantity;
                      const inOrder = isItemInOrder(item.id);
                      const orderItem = orderItems.find(o => o.id === item.id);

                      return (
                        <div
                          key={item.id}
                          className={`flex items-center gap-3 p-4 rounded-xl border transition ${
                            inOrder
                              ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 shadow-sm'
                              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-gray-900 dark:text-white truncate">{item.name}</p>
                              {getStockStatusBadge(totalQty, item.is_available)}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                              <span>SKU: {item.sku}</span>
                              {item.category && <span>• {item.category}</span>}
                              {item.brand && <span>• {item.brand}</span>}
                              <span>• ₦{item.unit_price?.toLocaleString()}/unit</span>
                            </div>
                          </div>
                          <div className="text-center px-3">
                            <p className="text-lg font-bold text-green-600">{totalQty}</p>
                            <p className="text-[10px] text-gray-400 uppercase">in stock</p>
                          </div>
                          {inOrder ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateOrderQuantity(item.id, (orderItem?.orderQuantity || 1) - 1)}
                                className="p-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                              >
                                <Minus size={14} />
                              </button>
                              <input
                                type="number"
                                value={orderItem?.orderQuantity || 0}
                                onChange={(e) => updateOrderQuantity(item.id, parseInt(e.target.value) || 1)}
                                className="w-20 text-center py-1.5 border border-green-300 dark:border-green-600 rounded-lg bg-white dark:bg-gray-800 text-sm font-bold"
                                min="1"
                              />
                              <button
                                onClick={() => updateOrderQuantity(item.id, (orderItem?.orderQuantity || 0) + 1)}
                                className="p-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                              >
                                <Plus size={14} />
                              </button>
                              <button
                                onClick={() => removeFromOrder(item.id)}
                                className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-600 hover:bg-red-200 dark:hover:bg-red-800 ml-1"
                                title="Remove from order"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => addToOrder(item)}
                              className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 font-semibold transition"
                            >
                              <Plus size={14} /> Add
                            </button>
                          )}
                        </div>
                      );
                    })
                  )
                )}
              </div>

              {/* Order Note + Footer Actions */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-800 p-5 space-y-4 shadow-sm">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                    Order Note (optional)
                  </label>
                  <textarea
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                    placeholder="Add any special instructions or notes for this order..."
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white text-sm resize-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => setPageView('history')}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition font-medium"
                  >
                    Cancel
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={generateExcel}
                      disabled={orderItems.length === 0}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      <FileSpreadsheet size={16} /> Excel
                    </button>
                    <button
                      onClick={generatePDF}
                      disabled={orderItems.length === 0}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      <FileDown size={16} /> PDF
                    </button>
                    <button
                      onClick={() => { if (orderItems.length > 0) setPageView('preview'); }}
                      disabled={orderItems.length === 0}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition shadow"
                    >
                      <CheckCircle size={16} /> Preview & Save
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ======== ORDER HISTORY (Default View) ========
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-xl p-2.5">
              <ShoppingCart size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Restock Orders</h1>
              <p className="text-sm text-blue-100">Manage your purchase and restock orders</p>
            </div>
          </div>
          <button
            onClick={startNewOrder}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-700 rounded-lg hover:bg-blue-50 font-bold transition shadow-lg"
          >
            <Plus size={18} /> Create New Order
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="max-w-7xl mx-auto px-6 -mt-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border dark:border-gray-800 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase">Total Orders</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{orderHistory.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border dark:border-gray-800 text-center">
            <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium uppercase">Pending</p>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{orderHistory.filter(o => o.status === 'pending').length}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border dark:border-gray-800 text-center">
            <p className="text-xs text-green-600 dark:text-green-400 font-medium uppercase">Completed</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{orderHistory.filter(o => o.status === 'completed').length}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border dark:border-gray-800 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase">Low Stock Items</p>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{lowStockItems.length}</p>
          </div>
        </div>
      </div>

      {/* History Section */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border dark:border-gray-800 overflow-hidden">
          {/* Filter Bar */}
          <div className="p-4 border-b dark:border-gray-800 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <History size={18} className="text-gray-500" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Order History</h2>
            </div>
            <div className="flex-1" />
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search orders..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 w-56"
              />
            </div>
            <select
              value={historyFilter}
              onChange={(e) => setHistoryFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Table */}
          {filteredHistory.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <ClipboardList size={56} className="mx-auto mb-4 opacity-30" />
              <p className="font-medium text-lg">No orders found</p>
              <p className="text-sm mt-1 mb-6">
                {orderHistory.length === 0 ? 'Create your first restock order to get started' : 'No orders match your filters'}
              </p>
              {orderHistory.length === 0 && (
                <button
                  onClick={startNewOrder}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold transition shadow"
                >
                  <Plus size={16} /> Create First Order
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 border-b dark:border-gray-800">
                    <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Order #</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Date & Time</th>
                    <th className="py-3 px-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Items</th>
                    <th className="py-3 px-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Total Qty</th>
                    <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Est. Cost</th>
                    <th className="py-3 px-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                    <th className="py-3 px-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((order) => (
                    <tr key={order.id} className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                      <td className="py-3 px-4">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{order.orderNumber}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm text-gray-900 dark:text-white">
                          {new Date(order.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(order.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{order.totalItems}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{order.totalQuantity.toLocaleString()}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">₦{order.totalCost.toLocaleString()}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => { setViewingOrder(order); setPageView('view-order'); }}
                            className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 transition"
                            title="View order"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => generatePDFForOrder(order)}
                            className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 transition"
                            title="Download PDF"
                          >
                            <FileDown size={16} />
                          </button>
                          <button
                            onClick={() => generateExcelForOrder(order)}
                            className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 transition"
                            title="Download Excel"
                          >
                            <FileSpreadsheet size={16} />
                          </button>
                          <button
                            onClick={() => setDeleteOrderId(order.id)}
                            className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition"
                            title="Delete order"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteOrderId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} className="text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete Order?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                This action cannot be undone. The order will be permanently removed from history.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteOrderId(null)}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteOrder(deleteOrderId)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
