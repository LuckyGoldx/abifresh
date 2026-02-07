'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { Plus, Edit2, Trash2, ChevronRight, X } from 'lucide-react';

interface Item {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit_price: number;
  is_available: boolean;
  main_store_quantity: number;
  active_store_quantity: number;
  quantity_sold: number;
  commission: number;
  created_at: string;
}

interface StoreStats {
  total_items: number;
  total_quantity: number;
  total_main_store: number;
  total_active_store: number;
  available_items: number;
  unavailable_items: number;
  total_value: number;
}

type StoreView = 'all' | 'main' | 'active' | 'unavailable' | 'low-stocks' | 'out-of-stock';
type ModalType = 'add' | 'edit' | 'transfer' | null;

export default function ComprehensiveInventoryPage() {
  const token = useAuthStore((state) => state.token);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [mounted, setMounted] = useState(false);

  const [items, setItems] = useState<Item[]>([]);
  const [stats, setStats] = useState<StoreStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storeView, setStoreView] = useState<StoreView>('all');
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    unit_price: 0,
    main_store_quantity: 0,
    commission: 0,
    quantity_mode: 'add' as 'add' | 'update',
  });

  const [transferData, setTransferData] = useState({
    quantity: 0,
    direction: 'main-to-active' as 'main-to-active' | 'active-to-main',
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && isAuthenticated && token) {
      fetchData();
    }
  }, [mounted, isAuthenticated, token, storeView]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch stats based on view
      const statsUrl = `http://localhost:5000/api/inventory/summary?view=${storeView}`;
      const statsRes = await fetch(statsUrl, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (statsRes.ok) {
        const stats = await statsRes.json();
        console.log(`📊 Stats loaded (${storeView}):`, stats);
        setStats(stats);
      } else {
        console.warn('⚠️ Stats fetch failed:', statsRes.status);
      }

      // Fetch items based on view
      let url = 'http://localhost:5000/api/inventory/items';
      if (storeView === 'main') {
        url = 'http://localhost:5000/api/inventory/main-store';
      } else if (storeView === 'active') {
        url = 'http://localhost:5000/api/inventory/active-store';
      } else if (storeView === 'unavailable') {
        url = 'http://localhost:5000/api/inventory/unavailable';
      }

      console.log('📍 Fetching from:', url);
      const itemsRes = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!itemsRes.ok) {
        const errText = await itemsRes.text();
        console.error('❌ Items fetch failed:', itemsRes.status, errText);
        throw new Error(`Failed to fetch items: ${itemsRes.status}`);
      }
      const itemsData = await itemsRes.json();
      console.log('📦 Items loaded:', itemsData.length, 'items');
      console.log('📊 First item RAW:', JSON.stringify(itemsData[0], null, 2));
      console.log('🔍 Quantity check:', {
        name: itemsData[0]?.name,
        main_store_quantity: itemsData[0]?.main_store_quantity,
        active_store_quantity: itemsData[0]?.active_store_quantity,
        all_keys: Object.keys(itemsData[0] || {}).filter(k => k.includes('quantity') || k.includes('store'))
      });
      setItems(itemsData);
    } catch (err: any) {
      console.error('❌ fetchData error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    try {
      // Check for SKU uniqueness
      const existingSku = items.some(item => item.sku.toLowerCase() === formData.sku.toLowerCase());
      if (existingSku) {
        setError(`SKU "${formData.sku}" already exists. Please use a different name.`);
        return;
      }

      const quantityToAdd = formData.main_store_quantity || 0;
      console.log('📝 Adding item with quantity:', quantityToAdd, '(all goes to main store)');

      const res = await fetch('http://localhost:5000/api/inventory/items', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          sku: formData.sku,
          category: formData.category,
          unit_price: formData.unit_price,
          quantity: quantityToAdd,
          commission: formData.commission || 0,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to add item');
      }
      console.log('✅ Item added successfully');
      setModalType(null);
      resetForm();
      await fetchData();
    } catch (err: any) {
      setError(err.message);
      console.error('Add item error:', err);
    }
  };

  const handleEditItem = async () => {
    if (!selectedItem) return;
    try {
      // Check for SKU uniqueness (excluding current item)
      const existingSku = items.some(item => 
        item.id !== selectedItem.id && 
        item.sku.toLowerCase() === formData.sku.toLowerCase()
      );
      if (existingSku) {
        setError(`SKU "${formData.sku}" already exists. Please use a different name.`);
        return;
      }

      const quantityInput = formData.main_store_quantity || 0;
      const currentMainQty = selectedItem.main_store_quantity || 0;
      let newMainQty: number;
      
      // Apply mode logic
      if (formData.quantity_mode === 'add') {
        // ADD mode: increment existing quantity
        newMainQty = currentMainQty + quantityInput;
        console.log('✏️ Edit (ADD mode):', selectedItem.id, 'Old Main:', currentMainQty, 'Adding:', quantityInput, 'New Main:', newMainQty);
      } else {
        // UPDATE mode: replace existing quantity
        newMainQty = quantityInput;
        console.log('✏️ Edit (UPDATE mode):', selectedItem.id, 'Old Main:', currentMainQty, 'New Main:', newMainQty);
      }

      const res = await fetch(`http://localhost:5000/api/inventory/items/${selectedItem.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          sku: formData.sku,
          category: formData.category,
          unit_price: formData.unit_price,
          main_store_quantity: newMainQty,
          commission: formData.commission || 0,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to edit item');
      }
      console.log('✅ Item edited successfully');
      setModalType(null);
      resetForm();
      setSelectedItem(null);
      await fetchData();
    } catch (err: any) {
      setError(err.message);
      console.error('Edit item error:', err);
    }
  };

  const handleTransfer = async () => {
    if (!selectedItem) return;
    try {
      const endpoint = transferData.direction === 'main-to-active'
        ? '/api/inventory/transfer/main-to-active'
        : '/api/inventory/transfer/active-to-main';

      const res = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          item_id: selectedItem.id,
          quantity: transferData.quantity,
        }),
      });

      if (!res.ok) throw new Error('Failed to transfer');
      setModalType(null);
      setTransferData({ quantity: 0, direction: 'main-to-active' });
      setSelectedItem(null);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/inventory/items/${itemId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to delete item');
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      sku: '',
      category: '',
      unit_price: 0,
      main_store_quantity: 0,
      commission: 0,
      quantity_mode: 'add',
    });
  };

  // Auto-generate SKU from item name
  const generateSKU = (name: string) => {
    if (!name || name.trim().length === 0) return '';
    // Take first 3 letters, convert to uppercase, add -001
    const abbrev = name.substring(0, 3).toUpperCase();
    return `${abbrev}-001`;
  };

  // Filter items based on search query and view
  const getFilteredItems = () => {
    let result = items;
    
    // Filter by low stocks (quantity < 100)
    if (storeView === 'low-stocks') {
      result = result.filter(item => {
        const totalQty = item.main_store_quantity + item.active_store_quantity;
        return totalQty < 100;
      });
    }
    
    // Filter by out of stock (quantity = 0)
    if (storeView === 'out-of-stock') {
      result = result.filter(item => {
        const totalQty = item.main_store_quantity + item.active_store_quantity;
        return totalQty === 0;
      });
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => 
        item.name.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
      );
    }
    
    return result;
  };

  const filteredItems = getFilteredItems();

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      sku: generateSKU(name), // Auto-generate SKU
    }));
  };

  const openEditModal = (item: Item) => {
    setSelectedItem(item);
    setFormData({
      name: item.name,
      sku: item.sku,
      category: item.category,
      unit_price: item.unit_price,
      main_store_quantity: 0,
      commission: item.commission || 0,
      quantity_mode: 'add',
    });
    setModalType('edit');
  };

  const openTransferModal = (item: Item) => {
    setSelectedItem(item);
    setTransferData({ quantity: 0, direction: 'main-to-active' });
    setModalType('transfer');
  };

  if (!mounted) return <div className="p-6 text-center">Loading...</div>;
  if (!isAuthenticated) return <div className="p-6 text-center text-red-600">Not authenticated</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Inventory Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage items across main store and active store</p>
        </div>

        {/* Stats Cards - Dynamic based on view */}
        {stats && (
          <div className="mb-8">
            {storeView === 'all' && (
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <StatCard title="Total Items" value={stats.total_items} color="blue" />
                <StatCard title="Main Store" value={stats.total_main_store} color="purple" />
                <StatCard title="Active Store" value={stats.total_active_store} color="green" />
                <StatCard title="Available" value={stats.available_items} color="indigo" />
                <StatCard title="Unavailable" value={stats.unavailable_items} color="red" />
                <StatCard 
                  title="Total Value" 
                  value={stats.total_value} 
                  color="amber" 
                  isCurrency={true}
                />
              </div>
            )}
            
            {storeView === 'main' && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard title="Items in Main Store" value={stats.total_items} color="blue" />
                <StatCard title="Main Store Qty" value={stats.total_main_store} color="purple" />
                <StatCard 
                  title="Main Store Value" 
                  value={stats.total_value} 
                  color="amber" 
                  isCurrency={true}
                />
              </div>
            )}
            
            {storeView === 'active' && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard title="Items in Active Store" value={stats.total_items} color="blue" />
                <StatCard title="Active Store Quantity" value={stats.total_active_store} color="green" />
                <StatCard 
                  title="Active Store Value" 
                  value={stats.total_value} 
                  color="amber" 
                  isCurrency={true}
                />
              </div>
            )}
            
            {storeView === 'unavailable' && (
              <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                <StatCard title="Unavailable Items" value={stats.unavailable_items} color="red" />
                <StatCard 
                  title="Unavailable Value" 
                  value={filteredItems.reduce((sum, item) => sum + ((item.main_store_quantity + item.active_store_quantity) * item.unit_price), 0)} 
                  color="red" 
                  isCurrency={true}
                />
              </div>
            )}
            
            {storeView === 'out-of-stock' && (
              <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                <StatCard title="Out of Stock Items" value={filteredItems.length} color="red" />
                <StatCard 
                  title="Out of Stock Value" 
                  value={0} 
                  color="red" 
                  isCurrency={true}
                />
              </div>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* View Toggle & Add Button */}
        <div className="mb-6 flex flex-wrap gap-2 items-center">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setStoreView('all')}
              className={`px-4 py-2 rounded font-semibold transition ${
                storeView === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:border-blue-600 dark:hover:border-blue-500'
              }`}
            >
              All Items
            </button>
            <button
              onClick={() => setStoreView('main')}
              className={`px-4 py-2 rounded font-semibold transition ${
                storeView === 'main'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:border-purple-600 dark:hover:border-purple-500'
              }`}
            >
              Main Store
            </button>
            <button
              onClick={() => setStoreView('active')}
              className={`px-4 py-2 rounded font-semibold transition ${
                storeView === 'active'
                  ? 'bg-green-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:border-green-600 dark:hover:border-green-500'
              }`}
            >
              Active Store
            </button>
            <button
              onClick={() => setStoreView('unavailable')}
              className={`px-4 py-2 rounded font-semibold transition ${
                storeView === 'unavailable'
                  ? 'bg-red-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:border-red-600 dark:hover:border-red-500'
              }`}
            >
              Unavailable in Active Store
            </button>
            <button
              onClick={() => setStoreView('out-of-stock')}
              className={`px-4 py-2 rounded font-semibold transition ${
                storeView === 'out-of-stock'
                  ? 'bg-red-700 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:border-red-700 dark:hover:border-red-600'
              }`}
            >
              Out of Stock
            </button>
            <button
              onClick={() => setStoreView('low-stocks')}
              className={`px-4 py-2 rounded font-semibold transition ${
                storeView === 'low-stocks'
                  ? 'bg-orange-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:border-orange-600 dark:hover:border-orange-500'
              }`}
            >
              Low Stocks
            </button>
          </div>

          <button
            onClick={() => {
              resetForm();
              setSelectedItem(null);
              setModalType('add');
            }}
            className="ml-auto px-4 py-2 bg-pink-600 text-white rounded font-semibold hover:bg-pink-700 flex items-center gap-2"
          >
            <Plus size={20} /> Add Item
          </button>
        </div>

        {/* Search Box */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="🔍 Search by item name, SKU, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
          />
          {searchQuery && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Found <span className="font-semibold text-blue-600 dark:text-blue-400">{filteredItems.length}</span> item(s)
            </p>
          )}
        </div>

        {/* Items Table */}
        {loading ? (
          <div className="text-center py-12 text-gray-600 dark:text-gray-400">Loading items...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-gray-600 dark:text-gray-400">
            No items found in {storeView === 'all' ? 'inventory' : storeView === 'main' ? 'main store' : storeView === 'active' ? 'active store' : storeView === 'unavailable' ? 'unavailable items' : storeView === 'low-stocks' ? 'low stocks' : 'out of stock'}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12 text-gray-600 dark:text-gray-400">
            No items match your search "<span className="font-semibold">{searchQuery}</span>"
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 dark:bg-gray-700 border-b dark:border-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">Item Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">SKU</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">Category</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">Price (₦)</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">Quantity</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">Active</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">Main</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">Commission</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">Total Value</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">Status</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const totalQty = item.main_store_quantity + item.active_store_quantity;
                  const totalValue = totalQty * item.unit_price;
                  console.log(`🔍 ${item.name}:`, 
                    `Main=${item.main_store_quantity}`, 
                    `Active=${item.active_store_quantity}`, 
                    `Total=${totalQty}`);
                  let status = 'In Stock';
                  let statusColor = 'bg-green-100 text-green-800';
                  
                  if (totalQty === 0) {
                    status = 'Out of Stock';
                    statusColor = 'bg-red-100 text-red-800';
                  } else if (totalQty < 100) {
                    status = 'Low Stock';
                    statusColor = 'bg-red-100 text-red-800';
                  }

                  return (
                    <tr key={item.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 font-medium">{item.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.sku}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.category}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">₦{item.unit_price.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-sm font-semibold">
                          {totalQty}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded text-sm font-semibold">
                          {item.active_store_quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded text-sm font-semibold">
                          {item.main_store_quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400">
                        {item.commission}
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-semibold text-gray-900 dark:text-gray-100">
                        ₦{totalValue.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-1 rounded text-sm font-semibold ${
                          statusColor === 'bg-green-100 text-green-800' 
                            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                            : statusColor === 'bg-yellow-100 text-yellow-800'
                            ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                            : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                        }`}>
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => openTransferModal(item)}
                            className="p-2 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 rounded hover:bg-indigo-200 dark:hover:bg-indigo-800 transition"
                            title="Transfer between stores"
                          >
                            <ChevronRight size={18} />
                          </button>
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-2 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition"
                            title="Edit item"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-2 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-800 transition"
                            title="Delete item"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {modalType === 'add' && <AddEditModal type="add" formData={formData} setFormData={setFormData} onSubmit={handleAddItem} onClose={() => setModalType(null)} onNameChange={handleNameChange} />}
      {modalType === 'edit' && <AddEditModal type="edit" formData={formData} setFormData={setFormData} onSubmit={handleEditItem} onClose={() => setModalType(null)} onNameChange={handleNameChange} />}
      {modalType === 'transfer' && selectedItem && (
        <TransferModal item={selectedItem} transferData={transferData} setTransferData={setTransferData} onSubmit={handleTransfer} onClose={() => setModalType(null)} />
      )}
    </div>
  );
}

function StatCard({ title, value, color, isCurrency }: { title: string; value: number; color: string; isCurrency?: boolean }) {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-200',
    purple: 'bg-purple-50 dark:bg-purple-900 border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-200',
    green: 'bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-700 text-green-700 dark:text-green-200',
    indigo: 'bg-indigo-50 dark:bg-indigo-900 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-200',
    red: 'bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-700 text-red-700 dark:text-red-200',
    amber: 'bg-amber-50 dark:bg-amber-900 border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-200',
  };

  const displayValue = isCurrency 
    ? `₦${value.toLocaleString()}` 
    : value.toLocaleString();

  return (
    <div className={`border rounded-lg p-4 ${colorClasses[color as keyof typeof colorClasses]}`}>
      <p className="text-sm font-medium">{title}</p>
      <p className={`font-bold mt-2 ${isCurrency ? 'text-xl md:text-2xl' : 'text-3xl'} break-words`}>
        {displayValue}
      </p>
    </div>
  );
}

function AddEditModal({
  type,
  formData,
  setFormData,
  onSubmit,
  onClose,
  onNameChange,
}: {
  type: 'add' | 'edit';
  formData: any;
  setFormData: (data: any) => void;
  onSubmit: () => void;
  onClose: () => void;
  onNameChange: (name: string) => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-screen overflow-y-auto flex flex-col p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{type === 'add' ? 'Add New Item' : 'Edit Item'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4 flex-grow overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Item Name</label>
            <input
              type="text"
              placeholder="Item Name"
              value={formData.name}
              onChange={(e) => onNameChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SKU (Auto-generated)</label>
            <input
              type="text"
              placeholder="SKU"
              value={formData.sku}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 cursor-not-allowed text-gray-600 dark:text-gray-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price (₦)</label>
            <input
              type="number"
              placeholder="Enter price"
              min="0"
              step="0.01"
              value={formData.unit_price || ''}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '' || !isNaN(Number(val))) {
                  setFormData({ ...formData, unit_price: val ? parseFloat(val) : 0 });
                }
              }}
              onKeyDown={(e) => {
                if (['-', '+', 'e', 'E'].includes(e.key)) {
                  e.preventDefault();
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>
          {type === 'edit' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity Mode</label>
              <select
                value={formData.quantity_mode}
                onChange={(e) => setFormData({ ...formData, quantity_mode: e.target.value as 'add' | 'update' })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              >
                <option value="add">Add (Increment existing)</option>
                <option value="update">Update (Replace existing)</option>
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {formData.quantity_mode === 'add' 
                  ? 'Add: New quantity = Current + Your input' 
                  : 'Update: New quantity = Your input (replaces current)'}
              </p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {type === 'add' ? 'Quantity (Main Store)' : formData.quantity_mode === 'add' ? 'Add Quantity' : 'New Quantity'}
            </label>
            <input
              type="number"
              placeholder={type === 'add' ? 'Enter quantity for main store' : formData.quantity_mode === 'add' ? 'Enter quantity to add' : 'Enter new quantity'}
              min="0"
              step="1"
              value={formData.main_store_quantity || ''}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '' || (!isNaN(Number(val)) && Number(val) >= 0)) {
                  setFormData({ ...formData, main_store_quantity: val ? parseInt(val) : 0 });
                }
              }}
              onKeyDown={(e) => {
                if (['-', '+', 'e', 'E', '.'].includes(e.key)) {
                  e.preventDefault();
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {type === 'add' 
                ? 'All quantity goes to Main Store. Total = Active Store + Main Store' 
                : formData.quantity_mode === 'add'
                ? 'This amount will be added to existing Main Store quantity'
                : 'This amount will replace existing Main Store quantity'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
            <input
              type="text"
              placeholder="Enter category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Commission</label>
            <input
              type="number"
              placeholder="Enter commission amount"
              min="0"
              step="0.01"
              value={formData.commission || ''}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '' || !isNaN(Number(val))) {
                  setFormData({ ...formData, commission: val ? parseFloat(val) : 0 });
                }
              }}
              onKeyDown={(e) => {
                if (['-', '+', 'e', 'E'].includes(e.key)) {
                  e.preventDefault();
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6 pt-4 border-t dark:border-gray-700">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            className="flex-1 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
          >
            {type === 'add' ? 'Add' : 'Update'}
          </button>
        </div>
      </div>
    </div>
  );
}

function TransferModal({
  item,
  transferData,
  setTransferData,
  onSubmit,
  onClose,
}: {
  item: Item;
  transferData: any;
  setTransferData: (data: any) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const maxQuantity = transferData.direction === 'main-to-active' ? item.main_store_quantity : item.active_store_quantity;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Transfer Items</h2>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
            <X size={24} />
          </button>
        </div>

        <p className="text-gray-700 dark:text-gray-300 mb-4">{item.name}</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Direction</label>
            <select
              value={transferData.direction}
              onChange={(e) => setTransferData({ ...transferData, direction: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              <option value="main-to-active">Main Store → Active Store</option>
              <option value="active-to-main">Active Store → Main Store</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Quantity (Max: {maxQuantity})
            </label>
            <input
              type="number"
              min="0"
              max={maxQuantity}
              step="1"
              value={transferData.quantity}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '' || (!isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= maxQuantity)) {
                  setTransferData({ ...transferData, quantity: val ? parseInt(val) : 0 });
                }
              }}
              onKeyDown={(e) => {
                if (['-', '+', 'e', 'E', '.'].includes(e.key)) {
                  e.preventDefault();
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={transferData.quantity <= 0 || transferData.quantity > maxQuantity}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Transfer
          </button>
        </div>
      </div>
    </div>
  );
}
