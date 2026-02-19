'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileDown, FileSpreadsheet, Search, Plus, Minus, Trash2,
  Package, AlertTriangle, ShoppingCart, CheckCircle, ClipboardList,
  Eye, ArrowLeft, History, Settings2
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
  showCurrentStock: boolean;
  showUnitPrice: boolean;
  showSubtotal: boolean;
}

interface DisplayOptions {
  showCurrentStock: boolean;
  showUnitPrice: boolean;
  showSubtotal: boolean;
}

type PageView = 'create' | 'history' | 'preview' | 'view-order';

const API_BASE = 'http://localhost:5000/api';

export default function RestockOrdersPage() {
  const token = useAuthStore((state) => state.token);
  const [mounted, setMounted] = useState(false);

  // Inventory data
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingOrder, setSavingOrder] = useState(false);

  // Order builder state
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'low-stock' | 'add-more'>('low-stock');
  const [orderNote, setOrderNote] = useState('');
  const [selectAll, setSelectAll] = useState(false);

  // Display options for PDF/Excel/Preview
  const [displayOptions, setDisplayOptions] = useState<DisplayOptions>({
    showCurrentStock: true,
    showUnitPrice: true,
    showSubtotal: true,
  });

  // Page navigation
  const [pageView, setPageView] = useState<PageView>('history');
  const [viewingOrder, setViewingOrder] = useState<SavedOrder | null>(null);

  // Order history
  const [orderHistory, setOrderHistory] = useState<SavedOrder[]>([]);
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'pending' | 'completed' | 'cancelled'>('all');
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Delete confirmation modal
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // Load inventory items
  useEffect(() => {
    if (!mounted || !token) return;
    const fetchItems = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/inventory/items`, {
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

  // Load order history from Supabase
  const fetchOrderHistory = useCallback(async () => {
    if (!token) return;
    try {
      setLoadingHistory(true);
      const res = await fetch(`${API_BASE}/admin/restock-orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOrderHistory(data);
      }
    } catch {
      toast.error('Failed to load order history');
    } finally {
      setLoadingHistory(false);
    }
  }, [token]);

  useEffect(() => {
    if (!mounted || !token) return;
    fetchOrderHistory();
  }, [mounted, token, fetchOrderHistory]);

  // Low stock items
  const lowStockItems = useMemo(() => {
    return items
      .filter(item => {
        const totalQty = item.main_store_quantity + item.active_store_quantity;
        return totalQty < 100 || !item.is_available;
      })
      .sort((a, b) => (a.main_store_quantity + a.active_store_quantity) - (b.main_store_quantity + b.active_store_quantity));
  }, [items]);

  const otherItems = useMemo(() => {
    return items
      .filter(item => {
        const totalQty = item.main_store_quantity + item.active_store_quantity;
        return totalQty >= 100 && item.is_available;
      })
      .sort((a, b) => (a.main_store_quantity + a.active_store_quantity) - (b.main_store_quantity + b.active_store_quantity));
  }, [items]);

  const filteredLowStock = useMemo(() => {
    if (!searchTerm) return lowStockItems;
    const term = searchTerm.toLowerCase();
    return lowStockItems.filter(item =>
      item.name.toLowerCase().includes(term) || item.sku.toLowerCase().includes(term) ||
      item.category?.toLowerCase().includes(term) || item.brand?.toLowerCase().includes(term)
    );
  }, [lowStockItems, searchTerm]);

  const filteredOther = useMemo(() => {
    if (!searchTerm) return otherItems;
    const term = searchTerm.toLowerCase();
    return otherItems.filter(item =>
      item.name.toLowerCase().includes(term) || item.sku.toLowerCase().includes(term) ||
      item.category?.toLowerCase().includes(term) || item.brand?.toLowerCase().includes(term)
    );
  }, [otherItems, searchTerm]);

  const filteredHistory = useMemo(() => {
    let filtered = orderHistory;
    if (historyFilter !== 'all') filtered = filtered.filter(o => o.status === historyFilter);
    if (historySearch) {
      const term = historySearch.toLowerCase();
      filtered = filtered.filter(o =>
        o.orderNumber.toLowerCase().includes(term) || o.note.toLowerCase().includes(term) ||
        o.items.some(i => i.name.toLowerCase().includes(term))
      );
    }
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [orderHistory, historyFilter, historySearch]);

  const isItemInOrder = (itemId: string) => orderItems.some(o => o.id === itemId);

  const addToOrder = (item: InventoryItem) => {
    if (isItemInOrder(item.id)) return;
    const totalQty = item.main_store_quantity + item.active_store_quantity;
    const suggestedQty = Math.max(100 - totalQty, 10);
    setOrderItems(prev => [...prev, {
      id: item.id, name: item.name, sku: item.sku, category: item.category,
      currentStock: totalQty, orderQuantity: suggestedQty > 0 ? suggestedQty : 10,
      unitPrice: item.unit_price, brand: item.brand, package_type: item.package_type,
    }]);
  };

  const removeFromOrder = (itemId: string) => setOrderItems(prev => prev.filter(o => o.id !== itemId));

  const updateOrderQuantity = (itemId: string, quantity: number) => {
    if (quantity < 1) return;
    setOrderItems(prev => prev.map(o => o.id === itemId ? { ...o, orderQuantity: quantity } : o));
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      const currentList = activeTab === 'low-stock' ? filteredLowStock : filteredOther;
      currentList.forEach(item => { if (!isItemInOrder(item.id)) addToOrder(item); });
    } else {
      const ids = (activeTab === 'low-stock' ? filteredLowStock : filteredOther).map(i => i.id);
      setOrderItems(prev => prev.filter(o => !ids.includes(o.id)));
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
    const d = dateStr ? new Date(dateStr) : new Date();
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) +
      ' at ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const generateOrderNumber = () => {
    const n = new Date();
    return `ORD-${n.getFullYear()}${String(n.getMonth() + 1).padStart(2, '0')}${String(n.getDate()).padStart(2, '0')}-${String(n.getHours()).padStart(2, '0')}${String(n.getMinutes()).padStart(2, '0')}${String(n.getSeconds()).padStart(2, '0')}`;
  };

  // ======== Save Order to Supabase ========
  const saveOrderToHistory = async (andThen?: 'pdf' | 'excel') => {
    if (orderItems.length === 0) return;
    setSavingOrder(true);
    try {
      const orderNumber = generateOrderNumber();
      const res = await fetch(`${API_BASE}/admin/restock-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          orderNumber,
          items: orderItems,
          totalItems: totalOrderItems,
          totalQuantity: totalOrderQuantity,
          totalCost: totalEstimatedCost,
          note: orderNote,
          showCurrentStock: displayOptions.showCurrentStock,
          showUnitPrice: displayOptions.showUnitPrice,
          showSubtotal: displayOptions.showSubtotal,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save order');
      }

      const saved = await res.json();
      toast.success(`Order ${saved.orderNumber} saved successfully!`);

      // Download if requested
      if (andThen === 'pdf') generatePDFForOrder({ ...saved, items: orderItems });
      if (andThen === 'excel') generateExcelForOrder({ ...saved, items: orderItems });

      // Reset form and go to history
      setOrderItems([]);
      setOrderNote('');
      setSearchTerm('');
      setSelectAll(false);
      setPageView('history');
      fetchOrderHistory();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save order');
    } finally {
      setSavingOrder(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: SavedOrder['status']) => {
    try {
      const res = await fetch(`${API_BASE}/admin/restock-orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update');
      setOrderHistory(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
      if (viewingOrder?.id === orderId) setViewingOrder({ ...viewingOrder, status });
      toast.success(`Order status updated to ${status}`);
    } catch {
      toast.error('Failed to update order status');
    }
  };

  const deleteOrder = async (orderId: string) => {
    try {
      const res = await fetch(`${API_BASE}/admin/restock-orders/${orderId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete');
      setOrderHistory(prev => prev.filter(o => o.id !== orderId));
      setDeleteOrderId(null);
      if (viewingOrder?.id === orderId) { setViewingOrder(null); setPageView('history'); }
      toast.success('Order deleted');
    } catch {
      toast.error('Failed to delete order');
    }
  };

  // ======== PDF Generation ========
  const generatePDFForOrder = (order: { items: OrderItem[]; orderNumber: string; date?: string; note: string; totalItems: number; totalQuantity: number; totalCost: number; showCurrentStock?: boolean; showUnitPrice?: boolean; showSubtotal?: boolean }) => {
    if (order.items.length === 0) return;

    const opts = {
      showCurrentStock: order.showCurrentStock !== false,
      showUnitPrice: order.showUnitPrice !== false,
      showSubtotal: order.showSubtotal !== false,
    };

    const doc = new jsPDF();
    const dateStr = formatDate(order.date);
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header - Pink theme
    doc.setFillColor(190, 24, 93); // pink-700
    doc.rect(0, 0, pageWidth, 52, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(COMPANY_NAME, pageWidth / 2, 18, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Email: ${COMPANY_EMAIL}  |  Phone: ${COMPANY_PHONE}`, pageWidth / 2, 28, { align: 'center' });

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(251, 207, 232); // pink-200
    doc.text('PURCHASE / RESTOCK ORDER', pageWidth / 2, 40, { align: 'center' });

    // Info bar
    doc.setFillColor(252, 231, 243); // pink-100
    doc.rect(0, 55, pageWidth, 18, 'F');
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Order #: ${order.orderNumber}`, 14, 64);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${dateStr}`, 14, 70);
    doc.text(`Total Items: ${order.totalItems}  |  Total Quantity: ${order.totalQuantity.toLocaleString()}`, pageWidth - 14, 64, { align: 'right' });
    if (opts.showSubtotal) {
      doc.text(`Estimated Cost: \u20A6${order.totalCost.toLocaleString()}`, pageWidth - 14, 70, { align: 'right' });
    }

    // Build dynamic columns
    const headCols: string[] = ['#', 'Item Name', 'SKU', 'Category'];
    if (opts.showCurrentStock) headCols.push('Current Stock');
    headCols.push('Order Qty');
    if (opts.showUnitPrice) headCols.push('Unit Price');
    if (opts.showSubtotal) headCols.push('Subtotal');

    const tableData = order.items.map((item, i) => {
      const row: (string | number)[] = [i + 1, item.name, item.sku || '-', item.category || '-'];
      if (opts.showCurrentStock) row.push(item.currentStock.toLocaleString());
      row.push(item.orderQuantity.toLocaleString());
      if (opts.showUnitPrice) row.push(`\u20A6${item.unitPrice.toLocaleString()}`);
      if (opts.showSubtotal) row.push(`\u20A6${(item.orderQuantity * item.unitPrice).toLocaleString()}`);
      return row;
    });

    // Dynamic column styles
    const colStyles: Record<number, any> = {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 42 },
      2: { halign: 'center', cellWidth: 22 },
      3: { halign: 'center', cellWidth: 24 },
    };
    let colIdx = 4;
    if (opts.showCurrentStock) { colStyles[colIdx] = { halign: 'center', cellWidth: 22 }; colIdx++; }
    colStyles[colIdx] = { halign: 'center', cellWidth: 20, fontStyle: 'bold' }; colIdx++;
    if (opts.showUnitPrice) { colStyles[colIdx] = { halign: 'right', cellWidth: 24 }; colIdx++; }
    if (opts.showSubtotal) { colStyles[colIdx] = { halign: 'right', cellWidth: 24, fontStyle: 'bold' }; colIdx++; }

    autoTable(doc, {
      startY: 78,
      head: [headCols],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [190, 24, 93], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9, halign: 'center' },
      bodyStyles: { fontSize: 8, cellPadding: 3 },
      columnStyles: colStyles,
      alternateRowStyles: { fillColor: [253, 242, 248] }, // pink-50
      didDrawPage: () => {
        const ph = doc.internal.pageSize.getHeight();
        doc.setFillColor(190, 24, 93);
        doc.rect(0, ph - 16, pageWidth, 16, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text(`${COMPANY_NAME} | ${COMPANY_EMAIL} | ${COMPANY_PHONE}`, pageWidth / 2, ph - 7, { align: 'center' });
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;

    if (opts.showSubtotal) {
      doc.setFillColor(190, 24, 93);
      doc.roundedRect(pageWidth - 80, finalY, 66, 24, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL', pageWidth - 74, finalY + 9);
      doc.setFontSize(12);
      doc.text(`\u20A6${order.totalCost.toLocaleString()}`, pageWidth - 74, finalY + 19);
    }

    if (order.note) {
      const noteY = opts.showSubtotal ? finalY : finalY - 5;
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Notes:', 14, noteY + 4);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(doc.splitTextToSize(order.note, pageWidth - 100), 14, noteY + 12);
    }

    doc.save(`Restock_Order_${order.orderNumber}.pdf`);
    toast.success('PDF downloaded');
  };

  // ======== Excel Generation ========
  const generateExcelForOrder = (order: { items: OrderItem[]; orderNumber: string; date?: string; note: string; totalItems: number; totalQuantity: number; totalCost: number; showCurrentStock?: boolean; showUnitPrice?: boolean; showSubtotal?: boolean }) => {
    if (order.items.length === 0) return;

    const opts = {
      showCurrentStock: order.showCurrentStock !== false,
      showUnitPrice: order.showUnitPrice !== false,
      showSubtotal: order.showSubtotal !== false,
    };

    const dateStr = formatDate(order.date);
    const summaryLine = `Total Items: ${order.totalItems}  |  Total Quantity: ${order.totalQuantity}` + (opts.showSubtotal ? `  |  Estimated Cost: \u20A6${order.totalCost.toLocaleString()}` : '');

    const headRow: string[] = ['#', 'Item Name', 'SKU', 'Category'];
    if (opts.showCurrentStock) headRow.push('Current Stock');
    headRow.push('Order Quantity');
    if (opts.showUnitPrice) headRow.push('Unit Price (\u20A6)');
    if (opts.showSubtotal) headRow.push('Subtotal (\u20A6)');

    const headerRows = [
      [COMPANY_NAME],
      [`Email: ${COMPANY_EMAIL}  |  Phone: ${COMPANY_PHONE}`],
      [''],
      ['PURCHASE / RESTOCK ORDER'],
      [`Order #: ${order.orderNumber}`],
      [`Date: ${dateStr}`],
      [summaryLine],
      [''],
      headRow,
    ];

    const dataRows = order.items.map((item, i) => {
      const row: any[] = [i + 1, item.name, item.sku || '-', item.category || '-'];
      if (opts.showCurrentStock) row.push(item.currentStock);
      row.push(item.orderQuantity);
      if (opts.showUnitPrice) row.push(item.unitPrice);
      if (opts.showSubtotal) row.push(item.orderQuantity * item.unitPrice);
      return row;
    });

    const summaryRows: any[][] = [['']];
    const qtyColIdx = 4 + (opts.showCurrentStock ? 1 : 0);
    const totalRow: any[] = Array(qtyColIdx).fill('');
    totalRow.push('TOTAL QUANTITY:');
    totalRow.push(order.totalQuantity);
    summaryRows.push(totalRow);

    if (opts.showSubtotal) {
      const costRow: any[] = Array(qtyColIdx).fill('');
      costRow.push('TOTAL COST:');
      costRow.push('');
      if (opts.showUnitPrice) costRow.push('');
      costRow.push(order.totalCost);
      summaryRows.push(costRow);
    }

    if (order.note) { summaryRows.push(['']); summaryRows.push(['Notes:', order.note]); }

    const ws = XLSX.utils.aoa_to_sheet([...headerRows, ...dataRows, ...summaryRows]);
    ws['!cols'] = [{ wch: 5 }, { wch: 35 }, { wch: 15 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 18 }];

    const totalCols = headRow.length;
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: totalCols - 1 } },
      { s: { r: 4, c: 0 }, e: { r: 4, c: totalCols - 1 } },
      { s: { r: 5, c: 0 }, e: { r: 5, c: totalCols - 1 } },
      { s: { r: 6, c: 0 }, e: { r: 6, c: totalCols - 1 } },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Restock Order');
    XLSX.writeFile(wb, `Restock_Order_${order.orderNumber}.xlsx`);
    toast.success('Excel downloaded');
  };

  // Quick download helpers (for current unsaved order)
  const generatePDF = () => generatePDFForOrder({
    items: orderItems, orderNumber: generateOrderNumber(), note: orderNote,
    totalItems: totalOrderItems, totalQuantity: totalOrderQuantity, totalCost: totalEstimatedCost,
    ...displayOptions,
  });

  const generateExcel = () => generateExcelForOrder({
    items: orderItems, orderNumber: generateOrderNumber(), note: orderNote,
    totalItems: totalOrderItems, totalQuantity: totalOrderQuantity, totalCost: totalEstimatedCost,
    ...displayOptions,
  });

  const startNewOrder = () => {
    setOrderItems([]); setOrderNote(''); setSearchTerm('');
    setSelectAll(false); setActiveTab('low-stock');
    setDisplayOptions({ showCurrentStock: true, showUnitPrice: true, showSubtotal: true });
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

  // =====================================
  // VIEW ORDER
  // =====================================
  if (pageView === 'view-order' && viewingOrder) {
    const vo = viewingOrder;
    const voOpts = { showCurrentStock: vo.showCurrentStock !== false, showUnitPrice: vo.showUnitPrice !== false, showSubtotal: vo.showSubtotal !== false };
    const voTotalColSpan = 4 + (voOpts.showCurrentStock ? 1 : 0);

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="bg-pink-700 text-white px-6 py-5">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <button onClick={() => { setViewingOrder(null); setPageView('history'); }} className="text-white/70 hover:text-white transition"><ArrowLeft size={20} /></button>
                <h1 className="text-xl font-bold">{COMPANY_NAME}</h1>
              </div>
              <p className="text-sm text-pink-200 ml-8">{COMPANY_EMAIL} | {COMPANY_PHONE}</p>
            </div>
            {getStatusBadge(vo.status)}
          </div>
        </div>

        <div className="bg-pink-50 dark:bg-pink-900/20 border-b dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">PURCHASE / RESTOCK ORDER</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Order #: {vo.orderNumber} | {formatDate(vo.date)}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <select value={vo.status} onChange={(e) => updateOrderStatus(vo.id, e.target.value as SavedOrder['status'])} className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-sm font-medium dark:text-white dark:border-gray-600">
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <button onClick={() => generatePDFForOrder(vo)} className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 font-semibold transition shadow"><FileDown size={16} /> PDF</button>
              <button onClick={() => generateExcelForOrder(vo)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition shadow"><FileSpreadsheet size={16} /> Excel</button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className={`grid grid-cols-1 gap-4 mb-6 ${voOpts.showSubtotal ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
            <div className="bg-pink-50 dark:bg-pink-900/20 rounded-xl p-4 text-center border border-pink-100 dark:border-pink-800">
              <p className="text-sm text-pink-600 dark:text-pink-300 font-medium">Total Items</p>
              <p className="text-3xl font-bold text-pink-700 dark:text-pink-200">{vo.totalItems}</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 text-center border border-purple-100 dark:border-purple-800">
              <p className="text-sm text-purple-600 dark:text-purple-300 font-medium">Total Quantity</p>
              <p className="text-3xl font-bold text-purple-700 dark:text-purple-200">{vo.totalQuantity.toLocaleString()}</p>
            </div>
            {voOpts.showSubtotal && (
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 text-center border border-amber-100 dark:border-amber-800">
                <p className="text-sm text-amber-600 dark:text-amber-300 font-medium">Estimated Cost</p>
                <p className="text-3xl font-bold text-amber-700 dark:text-amber-200">₦{vo.totalCost.toLocaleString()}</p>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border dark:border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-pink-700 text-white">
                    <th className="py-3 px-4 text-left text-xs font-semibold">#</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold">Item Name</th>
                    <th className="py-3 px-4 text-center text-xs font-semibold">SKU</th>
                    <th className="py-3 px-4 text-center text-xs font-semibold">Category</th>
                    {voOpts.showCurrentStock && <th className="py-3 px-4 text-center text-xs font-semibold">Stock at Order</th>}
                    <th className="py-3 px-4 text-center text-xs font-semibold">Order Qty</th>
                    {voOpts.showUnitPrice && <th className="py-3 px-4 text-right text-xs font-semibold">Unit Price</th>}
                    {voOpts.showSubtotal && <th className="py-3 px-4 text-right text-xs font-semibold">Subtotal</th>}
                  </tr>
                </thead>
                <tbody>
                  {vo.items.map((item, i) => (
                    <tr key={item.id + '-' + i} className={`border-b dark:border-gray-800 ${i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-pink-50/50 dark:bg-gray-800/50'}`}>
                      <td className="py-3 px-4 text-sm text-center text-gray-500">{i + 1}</td>
                      <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">{item.name}</td>
                      <td className="py-3 px-4 text-sm text-center text-gray-500">{item.sku || '-'}</td>
                      <td className="py-3 px-4 text-sm text-center text-gray-500">{item.category || '-'}</td>
                      {voOpts.showCurrentStock && <td className="py-3 px-4 text-sm text-center">{item.currentStock.toLocaleString()}</td>}
                      <td className="py-3 px-4 text-sm text-center font-bold text-pink-600">{item.orderQuantity.toLocaleString()}</td>
                      {voOpts.showUnitPrice && <td className="py-3 px-4 text-sm text-right">₦{item.unitPrice.toLocaleString()}</td>}
                      {voOpts.showSubtotal && <td className="py-3 px-4 text-sm text-right font-bold">₦{(item.orderQuantity * item.unitPrice).toLocaleString()}</td>}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-pink-700 text-white font-bold">
                    <td colSpan={voTotalColSpan} className="py-3 px-4 text-right">TOTAL</td>
                    <td className="py-3 px-4 text-center">{vo.totalQuantity.toLocaleString()}</td>
                    {voOpts.showUnitPrice && <td className="py-3 px-4"></td>}
                    {voOpts.showSubtotal && <td className="py-3 px-4 text-right">₦{vo.totalCost.toLocaleString()}</td>}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {vo.note && (
            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-700">
              <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-1">Notes:</p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 whitespace-pre-wrap">{vo.note}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // =====================================
  // PREVIEW
  // =====================================
  if (pageView === 'preview') {
    const pvColSpan = 4 + (displayOptions.showCurrentStock ? 1 : 0);

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="bg-pink-700 text-white px-6 py-5">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <button onClick={() => setPageView('create')} className="text-white/70 hover:text-white transition"><ArrowLeft size={20} /></button>
                <h1 className="text-xl font-bold">{COMPANY_NAME}</h1>
              </div>
              <p className="text-sm text-pink-200 ml-8">{COMPANY_EMAIL} | {COMPANY_PHONE}</p>
            </div>
          </div>
        </div>

        <div className="bg-pink-50 dark:bg-pink-900/20 border-b dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">PURCHASE / RESTOCK ORDER — Preview</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate()}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => saveOrderToHistory('pdf')} disabled={savingOrder} className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 font-semibold transition shadow disabled:opacity-50">
                <FileDown size={16} /> Save & PDF
              </button>
              <button onClick={() => saveOrderToHistory('excel')} disabled={savingOrder} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition shadow disabled:opacity-50">
                <FileSpreadsheet size={16} /> Save & Excel
              </button>
              <button onClick={() => saveOrderToHistory()} disabled={savingOrder} className="flex items-center gap-2 px-4 py-2 bg-pink-700 text-white rounded-lg hover:bg-pink-800 font-semibold transition shadow disabled:opacity-50">
                {savingOrder ? <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <CheckCircle size={16} />}
                {savingOrder ? 'Saving...' : 'Save Order'}
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className={`grid grid-cols-1 gap-4 mb-6 ${displayOptions.showSubtotal ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
            <div className="bg-pink-50 dark:bg-pink-900/20 rounded-xl p-4 text-center border border-pink-100 dark:border-pink-800">
              <p className="text-sm text-pink-600 dark:text-pink-300 font-medium">Total Items</p>
              <p className="text-3xl font-bold text-pink-700 dark:text-pink-200">{totalOrderItems}</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 text-center border border-purple-100 dark:border-purple-800">
              <p className="text-sm text-purple-600 dark:text-purple-300 font-medium">Total Quantity</p>
              <p className="text-3xl font-bold text-purple-700 dark:text-purple-200">{totalOrderQuantity.toLocaleString()}</p>
            </div>
            {displayOptions.showSubtotal && (
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 text-center border border-amber-100 dark:border-amber-800">
                <p className="text-sm text-amber-600 dark:text-amber-300 font-medium">Estimated Cost</p>
                <p className="text-3xl font-bold text-amber-700 dark:text-amber-200">₦{totalEstimatedCost.toLocaleString()}</p>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border dark:border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-pink-700 text-white">
                    <th className="py-3 px-4 text-left text-xs font-semibold">#</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold">Item Name</th>
                    <th className="py-3 px-4 text-center text-xs font-semibold">SKU</th>
                    <th className="py-3 px-4 text-center text-xs font-semibold">Category</th>
                    {displayOptions.showCurrentStock && <th className="py-3 px-4 text-center text-xs font-semibold">Current Stock</th>}
                    <th className="py-3 px-4 text-center text-xs font-semibold">Order Qty</th>
                    {displayOptions.showUnitPrice && <th className="py-3 px-4 text-right text-xs font-semibold">Unit Price</th>}
                    {displayOptions.showSubtotal && <th className="py-3 px-4 text-right text-xs font-semibold">Subtotal</th>}
                  </tr>
                </thead>
                <tbody>
                  {orderItems.map((item, i) => (
                    <tr key={item.id} className={`border-b dark:border-gray-800 ${i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-pink-50/50 dark:bg-gray-800/50'}`}>
                      <td className="py-3 px-4 text-sm text-center text-gray-500">{i + 1}</td>
                      <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">{item.name}</td>
                      <td className="py-3 px-4 text-sm text-center text-gray-500">{item.sku || '-'}</td>
                      <td className="py-3 px-4 text-sm text-center text-gray-500">{item.category || '-'}</td>
                      {displayOptions.showCurrentStock && <td className="py-3 px-4 text-sm text-center">{item.currentStock.toLocaleString()}</td>}
                      <td className="py-3 px-4 text-sm text-center font-bold text-pink-600">{item.orderQuantity.toLocaleString()}</td>
                      {displayOptions.showUnitPrice && <td className="py-3 px-4 text-sm text-right">₦{item.unitPrice.toLocaleString()}</td>}
                      {displayOptions.showSubtotal && <td className="py-3 px-4 text-sm text-right font-bold">₦{(item.orderQuantity * item.unitPrice).toLocaleString()}</td>}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-pink-700 text-white font-bold">
                    <td colSpan={pvColSpan} className="py-3 px-4 text-right">TOTAL</td>
                    <td className="py-3 px-4 text-center">{totalOrderQuantity.toLocaleString()}</td>
                    {displayOptions.showUnitPrice && <td className="py-3 px-4"></td>}
                    {displayOptions.showSubtotal && <td className="py-3 px-4 text-right">₦{totalEstimatedCost.toLocaleString()}</td>}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {orderNote && (
            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-700">
              <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-1">Notes:</p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 whitespace-pre-wrap">{orderNote}</p>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <button onClick={() => setPageView('create')} className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition font-medium">
              <ArrowLeft size={16} /> Back to Edit
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =====================================
  // CREATE ORDER
  // =====================================
  if (pageView === 'create') {
    const currentItems = activeTab === 'low-stock' ? filteredLowStock : filteredOther;

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="bg-gradient-to-r from-pink-600 to-pink-700 text-white px-6 py-5">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setPageView('history')} className="text-white/70 hover:text-white transition"><ArrowLeft size={20} /></button>
              <div className="bg-white/20 rounded-xl p-2.5"><ShoppingCart size={24} /></div>
              <div>
                <h1 className="text-xl font-bold">Create Restock Order</h1>
                <p className="text-sm text-pink-100">Select items and quantities to order for restocking</p>
              </div>
            </div>
            <button onClick={() => setPageView('history')} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition font-medium">
              <History size={16} /> Order History
            </button>
          </div>
        </div>

        {/* Summary Bar */}
        <div className="bg-white dark:bg-slate-800 border-b dark:border-gray-700 shadow-sm sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Package size={16} className="text-pink-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300"><strong className="text-pink-600">{totalOrderItems}</strong> items</span>
              </div>
              <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />
              <div className="flex items-center gap-2">
                <ClipboardList size={16} className="text-purple-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300"><strong className="text-purple-600">{totalOrderQuantity.toLocaleString()}</strong> qty</span>
              </div>
              <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />
              <span className="text-sm font-semibold text-amber-600">₦{totalEstimatedCost.toLocaleString()}</span>
            </div>
            <button onClick={() => { if (orderItems.length > 0) setPageView('preview'); }} disabled={orderItems.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition shadow">
              <CheckCircle size={16} /> Preview & Save
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-5">
          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4" />
              <p className="text-gray-500">Loading inventory items...</p>
            </div>
          ) : (
            <>
              {/* Display Options */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-800 p-4 mb-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Settings2 size={16} className="text-pink-600" />
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Display Options</h3>
                  <span className="text-xs text-gray-400">(columns to include in preview, PDF & Excel)</span>
                </div>
                <div className="flex items-center gap-6 flex-wrap">
                  <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
                    <input type="checkbox" checked={displayOptions.showCurrentStock} onChange={(e) => setDisplayOptions(p => ({ ...p, showCurrentStock: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" />
                    Current Stock
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
                    <input type="checkbox" checked={displayOptions.showUnitPrice} onChange={(e) => setDisplayOptions(p => ({ ...p, showUnitPrice: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" />
                    Unit Price
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
                    <input type="checkbox" checked={displayOptions.showSubtotal} onChange={(e) => setDisplayOptions(p => ({ ...p, showSubtotal: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" />
                    Subtotal
                  </label>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 mb-4">
                <button onClick={() => { setActiveTab('low-stock'); setSearchTerm(''); setSelectAll(false); }}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition ${activeTab === 'low-stock'
                    ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-200 ring-2 ring-orange-300 dark:ring-orange-600'
                    : 'bg-white dark:bg-gray-800 text-gray-500 hover:text-gray-700 dark:text-gray-400 border dark:border-gray-700'}`}>
                  <AlertTriangle size={16} /> Low Stock ({lowStockItems.length})
                </button>
                <button onClick={() => { setActiveTab('add-more'); setSearchTerm(''); setSelectAll(false); }}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition ${activeTab === 'add-more'
                    ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-200 ring-2 ring-green-300 dark:ring-green-600'
                    : 'bg-white dark:bg-gray-800 text-gray-500 hover:text-gray-700 dark:text-gray-400 border dark:border-gray-700'}`}>
                  <Plus size={16} /> Add More ({otherItems.length})
                </button>
              </div>

              {/* Search + Select All */}
              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                  <input type="text" placeholder="Search by name, SKU, category, brand..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white" />
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer whitespace-nowrap bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg px-4 py-2.5">
                  <input type="checkbox" checked={selectAll} onChange={(e) => handleSelectAll(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" />
                  Select All
                </label>
              </div>

              {/* Items */}
              <div className="space-y-2 mb-6">
                {currentItems.length === 0 ? (
                  <div className="text-center py-16 text-gray-400 bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-800">
                    <Package size={48} className="mx-auto mb-4 opacity-40" />
                    <p className="font-medium">{activeTab === 'low-stock' ? 'No low stock items found' : 'No additional items found'}</p>
                  </div>
                ) : (
                  currentItems.map(item => {
                    const totalQty = item.main_store_quantity + item.active_store_quantity;
                    const inOrder = isItemInOrder(item.id);
                    const orderItem = orderItems.find(o => o.id === item.id);

                    return (
                      <div key={item.id} className={`flex items-center gap-3 p-4 rounded-xl border transition ${
                        inOrder
                          ? 'bg-pink-50 dark:bg-pink-900/20 border-pink-300 dark:border-pink-700 shadow-sm'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-pink-300 dark:hover:border-pink-600'
                      }`}>
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
                          <p className={`text-lg font-bold ${totalQty < 50 ? 'text-red-600' : totalQty < 100 ? 'text-orange-500' : 'text-green-600'}`}>{totalQty}</p>
                          <p className="text-[10px] text-gray-400 uppercase">in stock</p>
                        </div>
                        {inOrder ? (
                          <div className="flex items-center gap-2">
                            <button onClick={() => updateOrderQuantity(item.id, (orderItem?.orderQuantity || 1) - 1)} className="p-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"><Minus size={14} /></button>
                            <input type="number" value={orderItem?.orderQuantity || 0} onChange={(e) => updateOrderQuantity(item.id, parseInt(e.target.value) || 1)}
                              className="w-20 text-center py-1.5 border border-pink-300 dark:border-pink-600 rounded-lg bg-white dark:bg-gray-800 text-sm font-bold" min="1" />
                            <button onClick={() => updateOrderQuantity(item.id, (orderItem?.orderQuantity || 0) + 1)} className="p-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"><Plus size={14} /></button>
                            <button onClick={() => removeFromOrder(item.id)} className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-600 hover:bg-red-200 dark:hover:bg-red-800 ml-1" title="Remove"><Trash2 size={14} /></button>
                          </div>
                        ) : (
                          <button onClick={() => addToOrder(item)} className="flex items-center gap-1 px-4 py-2 bg-pink-600 text-white text-sm rounded-lg hover:bg-pink-700 font-semibold transition">
                            <Plus size={14} /> Add
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Note + Footer */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-800 p-5 space-y-4 shadow-sm">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Order Note (optional)</label>
                  <textarea value={orderNote} onChange={(e) => setOrderNote(e.target.value)} placeholder="Add any special instructions or notes..."
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white text-sm resize-none focus:ring-2 focus:ring-pink-500" rows={3} />
                </div>
                <div className="flex items-center justify-between pt-2">
                  <button onClick={() => setPageView('history')} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition font-medium">Cancel</button>
                  <div className="flex items-center gap-2">
                    <button onClick={generateExcel} disabled={orderItems.length === 0} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition">
                      <FileSpreadsheet size={16} /> Excel
                    </button>
                    <button onClick={generatePDF} disabled={orderItems.length === 0} className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition">
                      <FileDown size={16} /> PDF
                    </button>
                    <button onClick={() => { if (orderItems.length > 0) setPageView('preview'); }} disabled={orderItems.length === 0}
                      className="flex items-center gap-2 px-4 py-2 bg-pink-700 text-white rounded-lg hover:bg-pink-800 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition shadow">
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

  // =====================================
  // ORDER HISTORY (Default)
  // =====================================
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="bg-gradient-to-r from-pink-600 to-pink-700 text-white px-6 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-xl p-2.5"><ShoppingCart size={28} /></div>
            <div>
              <h1 className="text-2xl font-bold">Restock Orders</h1>
              <p className="text-sm text-pink-100">Manage your purchase and restock orders</p>
            </div>
          </div>
          <button onClick={startNewOrder} className="flex items-center gap-2 px-5 py-2.5 bg-white text-pink-700 rounded-lg hover:bg-pink-50 font-bold transition shadow-lg">
            <Plus size={18} /> Create New Order
          </button>
        </div>
      </div>

      {/* Stats */}
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

      {/* History */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border dark:border-gray-800 overflow-hidden">
          <div className="p-4 border-b dark:border-gray-800 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <History size={18} className="text-pink-500" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Order History</h2>
            </div>
            <div className="flex-1" />
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search orders..." value={historySearch} onChange={(e) => setHistorySearch(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white text-sm focus:ring-2 focus:ring-pink-500 w-56" />
            </div>
            <select value={historyFilter} onChange={(e) => setHistoryFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-white">
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {loadingHistory ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-600 mx-auto mb-4" />
              <p className="text-gray-500">Loading order history...</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <ClipboardList size={56} className="mx-auto mb-4 opacity-30" />
              <p className="font-medium text-lg">No orders found</p>
              <p className="text-sm mt-1 mb-6">{orderHistory.length === 0 ? 'Create your first restock order to get started' : 'No orders match your filters'}</p>
              {orderHistory.length === 0 && (
                <button onClick={startNewOrder} className="inline-flex items-center gap-2 px-5 py-2.5 bg-pink-600 text-white rounded-lg hover:bg-pink-700 font-semibold transition shadow">
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
                    <tr key={order.id} className="border-b dark:border-gray-800 hover:bg-pink-50/50 dark:hover:bg-gray-800/50 transition">
                      <td className="py-3 px-4"><p className="text-sm font-semibold text-gray-900 dark:text-white">{order.orderNumber}</p></td>
                      <td className="py-3 px-4">
                        <p className="text-sm text-gray-900 dark:text-white">{new Date(order.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        <p className="text-xs text-gray-500">{new Date(order.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                      </td>
                      <td className="py-3 px-4 text-center"><span className="text-sm font-semibold text-gray-900 dark:text-white">{order.totalItems}</span></td>
                      <td className="py-3 px-4 text-center"><span className="text-sm font-semibold text-gray-900 dark:text-white">{order.totalQuantity.toLocaleString()}</span></td>
                      <td className="py-3 px-4 text-right"><span className="text-sm font-bold text-gray-900 dark:text-white">₦{order.totalCost.toLocaleString()}</span></td>
                      <td className="py-3 px-4 text-center">{getStatusBadge(order.status)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => { setViewingOrder(order); setPageView('view-order'); }} className="p-1.5 rounded-lg hover:bg-pink-100 dark:hover:bg-pink-900/30 text-pink-600 transition" title="View"><Eye size={16} /></button>
                          <button onClick={() => generatePDFForOrder(order)} className="p-1.5 rounded-lg hover:bg-pink-100 dark:hover:bg-pink-900/30 text-pink-600 transition" title="PDF"><FileDown size={16} /></button>
                          <button onClick={() => generateExcelForOrder(order)} className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 transition" title="Excel"><FileSpreadsheet size={16} /></button>
                          <button onClick={() => setDeleteOrderId(order.id)} className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition" title="Delete"><Trash2 size={16} /></button>
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

      {/* Delete Modal */}
      {deleteOrderId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center mx-auto mb-4"><Trash2 size={24} className="text-red-600" /></div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete Order?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">This action cannot be undone. The order will be permanently removed.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteOrderId(null)} className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition font-medium">Cancel</button>
                <button onClick={() => deleteOrder(deleteOrderId)} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold">Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
