'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X, FileDown, FileSpreadsheet, Search, Plus, Minus, Trash2,
  Package, AlertTriangle, ShoppingCart, CheckCircle, ClipboardList
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

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

interface GenerateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: InventoryItem[];
}

export default function GenerateOrderModal({ isOpen, onClose, items }: GenerateOrderModalProps) {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'low-stock' | 'add-more'>('low-stock');
  const [showPreview, setShowPreview] = useState(false);
  const [orderNote, setOrderNote] = useState('');
  const [selectAll, setSelectAll] = useState(false);

  // Low stock items: quantity < 100 or unavailable
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

  // Non-low stock items sorted by quantity (lowest first)
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

  // Filter items by search
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

  // Initialize low stock items when modal opens
  useEffect(() => {
    if (isOpen) {
      setOrderItems([]);
      setSearchTerm('');
      setActiveTab('low-stock');
      setShowPreview(false);
      setOrderNote('');
      setSelectAll(false);
    }
  }, [isOpen]);

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

  const handleSelectAllLowStock = (checked: boolean) => {
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

  const formatDate = () => {
    const now = new Date();
    return now.toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    }) + ' at ' + now.toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit',
    });
  };

  const generateOrderNumber = () => {
    const now = new Date();
    return `ORD-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  };

  // ======== PDF Generation ========
  const generatePDF = () => {
    if (orderItems.length === 0) return;

    const doc = new jsPDF();
    const orderNumber = generateOrderNumber();
    const dateStr = formatDate();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header background
    doc.setFillColor(15, 23, 42); // slate-900
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
    doc.setTextColor(253, 186, 116); // amber-300
    doc.text('PURCHASE / RESTOCK ORDER', pageWidth / 2, 40, { align: 'center' });

    // Order info bar
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(0, 55, pageWidth, 18, 'F');
    doc.setTextColor(30, 41, 59); // slate-800
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Order #: ${orderNumber}`, 14, 64);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${dateStr}`, 14, 70);
    doc.text(`Total Items: ${totalOrderItems}  |  Total Quantity: ${totalOrderQuantity.toLocaleString()}`, pageWidth - 14, 64, { align: 'right' });
    doc.text(`Estimated Cost: \u20A6${totalEstimatedCost.toLocaleString()}`, pageWidth - 14, 70, { align: 'right' });

    // Table
    const tableData = orderItems.map((item, index) => [
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
      bodyStyles: {
        fontSize: 8,
        cellPadding: 3,
      },
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
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      didDrawPage: (data: any) => {
        // Footer on each page
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFillColor(15, 23, 42);
        doc.rect(0, pageHeight - 16, pageWidth, 16, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text(`${COMPANY_NAME} | ${COMPANY_EMAIL} | ${COMPANY_PHONE}`, pageWidth / 2, pageHeight - 7, { align: 'center' });
      }
    });

    // Summary after table
    const finalY = (doc as any).lastAutoTable.finalY + 10;

    // Total box
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(pageWidth - 80, finalY, 66, 24, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL', pageWidth - 74, finalY + 9);
    doc.setFontSize(12);
    doc.text(`\u20A6${totalEstimatedCost.toLocaleString()}`, pageWidth - 74, finalY + 19);

    // Notes section
    if (orderNote) {
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Notes:', 14, finalY + 4);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const noteLines = doc.splitTextToSize(orderNote, pageWidth - 100);
      doc.text(noteLines, 14, finalY + 12);
    }

    doc.save(`Restock_Order_${orderNumber}.pdf`);
  };

  // ======== Excel Generation ========
  const generateExcel = () => {
    if (orderItems.length === 0) return;

    const orderNumber = generateOrderNumber();
    const dateStr = formatDate();

    // Header rows
    const headerRows = [
      [COMPANY_NAME],
      [`Email: ${COMPANY_EMAIL}  |  Phone: ${COMPANY_PHONE}`],
      [''],
      ['PURCHASE / RESTOCK ORDER'],
      [`Order #: ${orderNumber}`],
      [`Date: ${dateStr}`],
      [`Total Items: ${totalOrderItems}  |  Total Quantity: ${totalOrderQuantity}  |  Estimated Cost: \u20A6${totalEstimatedCost.toLocaleString()}`],
      [''],
      ['#', 'Item Name', 'SKU', 'Category', 'Current Stock', 'Order Quantity', 'Unit Price (\u20A6)', 'Subtotal (\u20A6)'],
    ];

    // Data rows
    const dataRows = orderItems.map((item, index) => [
      index + 1,
      item.name,
      item.sku || '-',
      item.category || '-',
      item.currentStock,
      item.orderQuantity,
      item.unitPrice,
      item.orderQuantity * item.unitPrice,
    ]);

    // Summary rows
    const summaryRows = [
      [''],
      ['', '', '', '', '', 'TOTAL QUANTITY:', totalOrderQuantity, ''],
      ['', '', '', '', '', 'TOTAL COST:', '', totalEstimatedCost],
    ];

    if (orderNote) {
      summaryRows.push(['']);
      summaryRows.push(['Notes:', orderNote]);
    }

    const allRows = [...headerRows, ...dataRows, ...summaryRows];

    const ws = XLSX.utils.aoa_to_sheet(allRows);

    // Set column widths
    ws['!cols'] = [
      { wch: 5 },   // #
      { wch: 35 },  // Item Name
      { wch: 15 },  // SKU
      { wch: 18 },  // Category
      { wch: 15 },  // Current Stock
      { wch: 15 },  // Order Qty
      { wch: 15 },  // Unit Price
      { wch: 18 },  // Subtotal
    ];

    // Merge header cells
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }, // Company name
      { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } }, // Contact
      { s: { r: 3, c: 0 }, e: { r: 3, c: 7 } }, // Title
      { s: { r: 4, c: 0 }, e: { r: 4, c: 7 } }, // Order #
      { s: { r: 5, c: 0 }, e: { r: 5, c: 7 } }, // Date
      { s: { r: 6, c: 0 }, e: { r: 6, c: 7 } }, // Summary
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Restock Order');

    XLSX.writeFile(wb, `Restock_Order_${orderNumber}.xlsx`);
  };

  if (!isOpen) return null;

  // ======== Order Preview ========
  if (showPreview) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden shadow-2xl flex flex-col">
          {/* Preview Header */}
          <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">{COMPANY_NAME}</h2>
              <p className="text-sm text-slate-300">{COMPANY_EMAIL} | {COMPANY_PHONE}</p>
            </div>
            <button onClick={() => setShowPreview(false)} className="text-white/80 hover:text-white">
              <X size={24} />
            </button>
          </div>

          {/* Preview Title Bar */}
          <div className="bg-slate-100 dark:bg-slate-800 px-6 py-3 border-b dark:border-gray-700 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">PURCHASE / RESTOCK ORDER</h3>
              <p className="text-sm text-slate-500 dark:text-gray-400">
                Order #: {generateOrderNumber()} | {formatDate()}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={generatePDF}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition shadow"
              >
                <FileDown size={18} /> Download PDF
              </button>
              <button
                onClick={generateExcel}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition shadow"
              >
                <FileSpreadsheet size={18} /> Download Excel
              </button>
            </div>
          </div>

          {/* Preview Summary Cards */}
          <div className="px-6 py-4 grid grid-cols-3 gap-4 border-b dark:border-gray-700">
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 text-center">
              <p className="text-sm text-blue-600 dark:text-blue-300 font-medium">Total Items</p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-200">{totalOrderItems}</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-3 text-center">
              <p className="text-sm text-purple-600 dark:text-purple-300 font-medium">Total Quantity</p>
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-200">{totalOrderQuantity.toLocaleString()}</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/30 rounded-lg p-3 text-center">
              <p className="text-sm text-amber-600 dark:text-amber-300 font-medium">Estimated Cost</p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-200">₦{totalEstimatedCost.toLocaleString()}</p>
            </div>
          </div>

          {/* Preview Table */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <table className="w-full border-collapse">
              <thead className="sticky top-0">
                <tr className="bg-slate-900 text-white">
                  <th className="py-2 px-3 text-left text-xs font-semibold rounded-tl-lg">#</th>
                  <th className="py-2 px-3 text-left text-xs font-semibold">Item Name</th>
                  <th className="py-2 px-3 text-center text-xs font-semibold">SKU</th>
                  <th className="py-2 px-3 text-center text-xs font-semibold">Category</th>
                  <th className="py-2 px-3 text-center text-xs font-semibold">Current Stock</th>
                  <th className="py-2 px-3 text-center text-xs font-semibold">Order Qty</th>
                  <th className="py-2 px-3 text-right text-xs font-semibold">Unit Price</th>
                  <th className="py-2 px-3 text-right text-xs font-semibold rounded-tr-lg">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {orderItems.map((item, index) => (
                  <tr key={item.id} className={`border-b dark:border-gray-700 ${index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-slate-50 dark:bg-gray-800'}`}>
                    <td className="py-2 px-3 text-sm text-center">{index + 1}</td>
                    <td className="py-2 px-3 text-sm font-medium">{item.name}</td>
                    <td className="py-2 px-3 text-sm text-center text-gray-500">{item.sku || '-'}</td>
                    <td className="py-2 px-3 text-sm text-center text-gray-500">{item.category || '-'}</td>
                    <td className="py-2 px-3 text-sm text-center">{item.currentStock.toLocaleString()}</td>
                    <td className="py-2 px-3 text-sm text-center font-bold text-blue-600">{item.orderQuantity.toLocaleString()}</td>
                    <td className="py-2 px-3 text-sm text-right">₦{item.unitPrice.toLocaleString()}</td>
                    <td className="py-2 px-3 text-sm text-right font-bold">₦{(item.orderQuantity * item.unitPrice).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 text-white font-bold">
                  <td colSpan={5} className="py-3 px-3 text-right rounded-bl-lg">TOTAL</td>
                  <td className="py-3 px-3 text-center">{totalOrderQuantity.toLocaleString()}</td>
                  <td className="py-3 px-3 text-right"></td>
                  <td className="py-3 px-3 text-right rounded-br-lg">₦{totalEstimatedCost.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>

            {/* Notes */}
            {orderNote && (
              <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
                <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-1">Notes:</p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 whitespace-pre-wrap">{orderNote}</p>
              </div>
            )}
          </div>

          {/* Preview Footer */}
          <div className="bg-slate-100 dark:bg-slate-800 px-6 py-3 flex items-center justify-between border-t dark:border-gray-700">
            <button
              onClick={() => setShowPreview(false)}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            >
              ← Back to Edit
            </button>
            <div className="flex gap-2">
              <button
                onClick={generatePDF}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition"
              >
                <FileDown size={16} /> PDF
              </button>
              <button
                onClick={generateExcel}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition"
              >
                <FileSpreadsheet size={16} /> Excel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ======== Main Order Builder ========
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-xl p-2">
              <ShoppingCart size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Generate Restock Order</h2>
              <p className="text-sm text-blue-100">Select items and quantities to order for restocking</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition">
            <X size={24} />
          </button>
        </div>

        {/* Order Summary Bar */}
        <div className="bg-slate-50 dark:bg-slate-800 px-6 py-3 flex items-center justify-between flex-wrap gap-3 border-b dark:border-gray-700">
          <div className="flex items-center gap-4">
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
            onClick={() => setShowPreview(true)}
            disabled={orderItems.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition shadow"
          >
            <CheckCircle size={16} /> Preview & Download
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-4 flex gap-2">
          <button
            onClick={() => { setActiveTab('low-stock'); setSearchTerm(''); setSelectAll(false); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-semibold text-sm transition ${
              activeTab === 'low-stock'
                ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-200 border-b-2 border-orange-500'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <AlertTriangle size={16} />
            Low Stock / Unavailable ({lowStockItems.length})
          </button>
          <button
            onClick={() => { setActiveTab('add-more'); setSearchTerm(''); setSelectAll(false); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-semibold text-sm transition ${
              activeTab === 'add-more'
                ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-200 border-b-2 border-green-500'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <Plus size={16} />
            Add More Items ({otherItems.length})
          </button>
        </div>

        {/* Search & Select All */}
        <div className="px-6 py-3 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search items by name, SKU, category, brand..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={selectAll}
              onChange={(e) => handleSelectAllLowStock(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Select All
          </label>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto px-6 pb-2">
          {activeTab === 'low-stock' ? (
            <div className="space-y-2">
              {filteredLowStock.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
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
                      className={`flex items-center gap-3 p-3 rounded-lg border transition ${
                        inOrder
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
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
                            className="p-1 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                          >
                            <Minus size={14} />
                          </button>
                          <input
                            type="number"
                            value={orderItem?.orderQuantity || 0}
                            onChange={(e) => updateOrderQuantity(item.id, parseInt(e.target.value) || 1)}
                            className="w-20 text-center py-1 border border-blue-300 dark:border-blue-600 rounded bg-white dark:bg-gray-800 text-sm font-bold"
                            min="1"
                          />
                          <button
                            onClick={() => updateOrderQuantity(item.id, (orderItem?.orderQuantity || 0) + 1)}
                            className="p-1 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                          >
                            <Plus size={14} />
                          </button>
                          <button
                            onClick={() => removeFromOrder(item.id)}
                            className="p-1 rounded bg-red-100 dark:bg-red-900/40 text-red-600 hover:bg-red-200 dark:hover:bg-red-800 ml-1"
                            title="Remove from order"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToOrder(item)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-semibold transition"
                        >
                          <Plus size={14} /> Add
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredOther.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
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
                      className={`flex items-center gap-3 p-3 rounded-lg border transition ${
                        inOrder
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
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
                            className="p-1 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                          >
                            <Minus size={14} />
                          </button>
                          <input
                            type="number"
                            value={orderItem?.orderQuantity || 0}
                            onChange={(e) => updateOrderQuantity(item.id, parseInt(e.target.value) || 1)}
                            className="w-20 text-center py-1 border border-green-300 dark:border-green-600 rounded bg-white dark:bg-gray-800 text-sm font-bold"
                            min="1"
                          />
                          <button
                            onClick={() => updateOrderQuantity(item.id, (orderItem?.orderQuantity || 0) + 1)}
                            className="p-1 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                          >
                            <Plus size={14} />
                          </button>
                          <button
                            onClick={() => removeFromOrder(item.id)}
                            className="p-1 rounded bg-red-100 dark:bg-red-900/40 text-red-600 hover:bg-red-200 dark:hover:bg-red-800 ml-1"
                            title="Remove from order"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToOrder(item)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 font-semibold transition"
                        >
                          <Plus size={14} /> Add
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Order Note + Footer */}
        <div className="border-t dark:border-gray-700 bg-slate-50 dark:bg-slate-800 px-6 py-4 space-y-3">
          {/* Order note */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
              Order Note (optional)
            </label>
            <textarea
              value={orderNote}
              onChange={(e) => setOrderNote(e.target.value)}
              placeholder="Add any special instructions or notes for this order..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white text-sm resize-none focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
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
                onClick={() => setShowPreview(true)}
                disabled={orderItems.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition shadow"
              >
                <CheckCircle size={16} /> Preview Order
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
