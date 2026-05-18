'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import api from '@/lib/api';
import { Plus, Edit2, Trash2, ChevronRight, X, Upload, Image as ImageIcon } from 'lucide-react';
import { PRODUCT_CATALOG, getBrandNames, getPackageTypes, getProductVariants, getBrandCategory, isOthersBrand } from '@/lib/productCatalog';
import type { ProductVariant } from '@/lib/productCatalog';
import { toast } from 'sonner';
import { formatQty } from '@/lib/format-quantity';

/** Compress an image file client-side to WebP before uploading. Falls back to original on failure. */
function compressImageClientSide(file: File): Promise<File> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/') || file.type === 'image/gif') {
      resolve(file);
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => resolve(file);
    reader.onloadend = () => {
      const img = new Image();
      img.onerror = () => resolve(file);
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
          if (blob && blob.size < file.size) {
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' }));
          } else {
            resolve(file);
          }
        }, 'image/webp', 0.82);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

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
  brand?: string;
  package_type?: string;
  price_jalingo?: number;
  price_outside?: number;
  image_url?: string;
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

type StoreView = 'all' | 'main' | 'active' | 'unavailable' | 'low-stocks' | 'out-of-stock' | 'half-bags';
type ModalType = 'add' | 'edit' | 'transfer' | null;

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

/**
 * Return Supabase CDN URL directly.
 * - The old proxy endpoint was removed for security (LOW-2 fix)
 * - Images are now served directly from Supabase storage CDN
 * - Supports full URLs and paths
 */
function getImageUrl(url: string | undefined | null): string | null {
  // Return Supabase CDN URL directly (proxy endpoint was removed for security)
  if (!url) return null;
  // Already a Supabase public URL or full URL
  if (url.startsWith('https://')) return url;
  if (url.startsWith('http://')) return url;
  // If it's just a path, assume it's a Supabase public URL
  return url;
}

// Helper: keep integers as integers, round decimals to 2 places
function formatPrice(value: number | string): number {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return 0;
  if (Number.isInteger(num)) return num; // Keep as integer if whole number
  return Math.round(num * 100) / 100; // Only round to 2 decimals if has decimals
}

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
    brand: '',
    package_type: '',
    price_jalingo: 0,
    price_outside: 0,
    image_url: '',
  });

  const [transferData, setTransferData] = useState({
    quantity: 0,
    direction: 'main-to-active' as 'main-to-active' | 'active-to-main',
  });

  // Image preview state
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);



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

      // Fetch stats based on view (using api module for reliable auth)
      try {
        const statsRes = await api.get(`/api/inventory/summary`, { params: { view: storeView } });
        setStats(statsRes.data);
      } catch (statsErr: any) {
        console.warn('⚠️ Stats fetch failed:', statsErr.response?.status || statsErr.message);
      }

      // Fetch items based on view (using api module for reliable auth)
      let itemsPath = '/api/inventory/items';
      if (storeView === 'main') {
        itemsPath = '/api/inventory/main-store';
      } else if (storeView === 'active') {
        itemsPath = '/api/inventory/active-store';
      } else if (storeView === 'unavailable') {
        itemsPath = '/api/inventory/unavailable';
      }

      const itemsRes = await api.get(itemsPath);
      const itemsData = itemsRes.data;
      console.log('📦 Items loaded:', itemsData.length, 'items');
      console.log('📊 First item RAW:', JSON.stringify(itemsData[0], null, 2));
      console.log('🔍 Image & Field check:', {
        name: itemsData[0]?.name,
        image_url: itemsData[0]?.image_url,
        brand: itemsData[0]?.brand,
        package_type: itemsData[0]?.package_type,
        all_keys: Object.keys(itemsData[0] || {})
      });
      setItems(itemsData);
    } catch (err: any) {
      console.error('❌ fetchData error:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to fetch inventory data';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    try {
      // Check for duplicate item (by SKU or Name)
      const existingBySku = items.find(item => item.sku.toLowerCase() === formData.sku.toLowerCase());
      const existingByName = items.find(item => item.name.toLowerCase() === formData.name.toLowerCase());
      
      if (existingBySku || existingByName) {
        const duplicateItem = (existingBySku || existingByName)!;
        toast.error(
          `⚠️ "${duplicateItem.name}" already exists in inventory! Search for it and edit instead.`,
          { duration: 5000 }
        );
        return;
      }

      const quantityToAdd = formData.main_store_quantity || 0;
      console.log('📝 Adding item with quantity:', quantityToAdd, '(all goes to main store)');

      await api.post('/api/inventory/items', {
        name: formData.name,
        sku: formData.sku,
        category: formData.category,
        unit_price: formatPrice(formData.unit_price),
        quantity: quantityToAdd,
        commission: formatPrice(formData.commission || 0),
        brand: formData.brand || undefined,
        package_type: formData.package_type || undefined,
        price_jalingo: formatPrice(formData.price_jalingo || 0),
        price_outside: formatPrice(formData.price_outside || 0),
        image_url: formData.image_url || undefined,
      });

      toast.success('✅ Item added successfully');
      setModalType(null);
      resetForm();
      await fetchData();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Error adding item';
      setError(errorMsg);
      if (!errorMsg.includes('SKU')) {
        toast.error(errorMsg);
      }
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

      await api.put(`/api/inventory/items/${selectedItem.id}`, {
        name: formData.name,
        sku: formData.sku,
        category: formData.category,
        unit_price: formatPrice(formData.unit_price),
        main_store_quantity: newMainQty,
        commission: formatPrice(formData.commission || 0),
        brand: formData.brand || undefined,
        package_type: formData.package_type || undefined,
        price_jalingo: formatPrice(formData.price_jalingo || 0),
        price_outside: formatPrice(formData.price_outside || 0),
        image_url: formData.image_url || undefined,
      });

      toast.success('✅ Item updated successfully');
      setModalType(null);
      resetForm();
      setSelectedItem(null);
      await fetchData();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Error editing item';
      setError(errorMsg);
      if (!errorMsg.includes('SKU')) {
        toast.error(errorMsg);
      }
      console.error('Edit item error:', err);
    }
  };

  const handleTransfer = async () => {
    if (!selectedItem) return;
    try {
      const endpoint = transferData.direction === 'main-to-active'
        ? '/api/inventory/transfer/main-to-active'
        : '/api/inventory/transfer/active-to-main';

      await api.post(endpoint, {
        item_id: selectedItem.id,
        quantity: transferData.quantity,
      });

      toast.success(`✅ Transferred ${transferData.quantity} units ${transferData.direction === 'main-to-active' ? 'to Active Store' : 'to Main Store'}`);
      setModalType(null);
      setTransferData({ quantity: 0, direction: 'main-to-active' });
      setSelectedItem(null);
      fetchData();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Error transferring item';
      setError(errorMsg);
      toast.error(errorMsg);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      await api.delete(`/api/inventory/items/${itemId}`);

      toast.success('✅ Item deleted successfully');
      fetchData();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Error deleting item';
      setError(errorMsg);
      toast.error(errorMsg);
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
      brand: '',
      package_type: '',
      price_jalingo: 0,
      price_outside: 0,
      image_url: '',
    });
    setImagePreview(null);
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

    // Filter by half-bag quantities (any store quantity has a .5 fractional part)
    if (storeView === 'half-bags') {
      result = result.filter(item =>
        item.main_store_quantity % 1 !== 0 ||
        item.active_store_quantity % 1 !== 0
      );
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
    console.log('🔍 EDIT MODAL OPENED - Item:', {
      id: item.id,
      name: item.name,
      image_url: item.image_url,
      brand: item.brand,
      package_type: item.package_type,
    });
    setFormData({
      name: item.name,
      sku: item.sku,
      category: item.category,
      unit_price: item.unit_price,
      main_store_quantity: 0,
      commission: item.commission || 0,
      quantity_mode: 'add',
      brand: item.brand || '',
      package_type: item.package_type || '',
      price_jalingo: item.price_jalingo || 0,
      price_outside: item.price_outside || 0,
      image_url: item.image_url || '',
    });
    // Set image preview for editing - use proxy URL
    setImagePreview(getImageUrl(item.image_url) || null);
    console.log('📸 Image preview set to:', getImageUrl(item.image_url) || null);
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard 
                  title="Total Items" 
                  items={stats.total_items} 
                  quantity={stats.total_quantity}
                  color="blue" 
                  onClick={() => setStoreView('all')}
                  isActive={storeView === 'all'}
                />
                <StatCard 
                  title="Main Store" 
                  items={items.filter(item => item.main_store_quantity > 0).length}
                  quantity={stats.total_main_store} 
                  color="purple" 
                  onClick={() => setStoreView('main')}
                />
                <StatCard 
                  title="Active Store" 
                  items={items.filter(item => item.active_store_quantity > 0).length}
                  quantity={stats.total_active_store} 
                  color="green" 
                  onClick={() => setStoreView('active')}
                />
                <StatCard 
                  title="Available" 
                  items={stats.available_items}
                  quantity={items.filter(item => item.is_available === true && (item.active_store_quantity || 0) > 0).reduce((sum, item) => sum + (item.main_store_quantity || 0) + (item.active_store_quantity || 0), 0)}
                  color="indigo"
                />
                <StatCard 
                  title="Unavailable" 
                  items={stats.unavailable_items}
                  quantity={items.filter(item => item.is_available === false || (item.active_store_quantity || 0) === 0).reduce((sum, item) => sum + (item.main_store_quantity || 0) + (item.active_store_quantity || 0), 0)}
                  color="red"
                  onClick={() => setStoreView('unavailable')}
                />
                <StatCard 
                  title="Total Value" 
                  quantity={stats.total_value} 
                  color="amber" 
                  isCurrency={true}
                  valueOnly={true}
                  totalQuantity={stats.total_quantity}
                />
                <div className="border rounded-lg p-4 bg-indigo-50 dark:bg-indigo-900 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-200">
                  <p className="text-sm font-medium mb-3">Estimated Revenue</p>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-indigo-600 dark:text-indigo-300">Inside Jalingo</p>
                      <p className="font-bold text-lg">₦{items.reduce((sum, item) => sum + ((item.main_store_quantity + item.active_store_quantity) * (item.price_jalingo || 0)), 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-indigo-600 dark:text-indigo-300">Outside Jalingo</p>
                      <p className="font-bold text-lg">₦{items.reduce((sum, item) => sum + ((item.main_store_quantity + item.active_store_quantity) * (item.price_outside || 0)), 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {storeView === 'main' && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard 
                  title="Items in Main Store" 
                  items={stats.total_items} 
                  quantity={stats.total_main_store}
                  color="blue" 
                  onClick={() => setStoreView('all')}
                  isActive={storeView === 'main'}
                />
                <StatCard 
                  title="Total Qty" 
                  items={items.filter(item => item.main_store_quantity > 0).length}
                  quantity={stats.total_main_store}
                  color="purple"
                />
                <StatCard 
                  title="Main Store Value" 
                  quantity={stats.total_value} 
                  color="amber" 
                  isCurrency={true}
                  valueOnly={true}
                  totalQuantity={stats.total_main_store}
                />
              </div>
            )}
            
            {storeView === 'active' && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard 
                  title="Items in Active Store" 
                  items={stats.total_items}
                  quantity={items.filter(item => item.active_store_quantity > 0).reduce((sum, item) => sum + (item.active_store_quantity || 0), 0)}
                  color="blue"
                  onClick={() => setStoreView('all')}
                  isActive={storeView === 'active'}
                />
                <StatCard 
                  title="Active Store Qty" 
                  items={items.filter(item => item.active_store_quantity > 0).length}
                  quantity={stats.total_active_store} 
                  color="green"
                />
                <StatCard 
                  title="Active Store Value" 
                  quantity={stats.total_value} 
                  color="amber" 
                  isCurrency={true}
                  valueOnly={true}
                  totalQuantity={stats.total_active_store}
                />
              </div>
            )}
            
            {storeView === 'unavailable' && (
              <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                <StatCard 
                  title="Unavailable Items" 
                  items={stats.unavailable_items}
                  quantity={items.filter(item => item.is_available === false || (item.active_store_quantity || 0) === 0).reduce((sum, item) => sum + (item.main_store_quantity || 0) + (item.active_store_quantity || 0), 0)}
                  color="red"
                  onClick={() => setStoreView('all')}
                  isActive={storeView === 'unavailable'}
                />
                <StatCard 
                  title="Unavailable Value" 
                  quantity={filteredItems.reduce((sum, item) => sum + ((item.main_store_quantity + item.active_store_quantity) * (item.unit_price || 0)), 0)} 
                  color="red" 
                  isCurrency={true}
                  valueOnly={true}
                  totalQuantity={filteredItems.reduce((sum, item) => sum + (item.main_store_quantity || 0) + (item.active_store_quantity || 0), 0)}
                />
              </div>
            )}
            
            {storeView === 'out-of-stock' && (
              <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                <StatCard 
                  title="Out of Stock Items" 
                  items={filteredItems.length}
                  quantity={0}
                  color="red"
                />
                <StatCard 
                  title="Out of Stock Value" 
                  quantity={0} 
                  color="red" 
                  isCurrency={true}
                  valueOnly={true}
                  totalQuantity={0}
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
            <button
              onClick={() => setStoreView('half-bags')}
              className={`px-4 py-2 rounded font-semibold transition ${
                storeView === 'half-bags'
                  ? 'bg-pink-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:border-pink-600 dark:hover:border-pink-500'
              }`}
            >
              ½ Stocks
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
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">Image</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">Item Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">Package Type</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">Brand</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">SKU</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">Category</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">Price Jalingo</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">Price Outside</th>
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
                  console.log(`🔍 TABLE ROW: ${item.name}:`, {
                    main_qty: item.main_store_quantity,
                    active_qty: item.active_store_quantity,
                    total_qty: totalQty,
                    image_url: item.image_url,
                    brand: item.brand,
                    package_type: item.package_type,
                    has_image: !!item.image_url,
                  });
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
                      {/* Image Column - First */}
                      <td className="px-4 py-3 text-center">
                        {item.image_url ? (
                          <img 
                            src={getImageUrl(item.image_url) || ''} 
                            alt={item.name}
                            className="w-12 h-12 rounded object-cover cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setFullscreenImage(getImageUrl(item.image_url) || '')}
                            onError={(e) => {
                              console.error(`❌ Image failed to load:`, item.image_url);
                              e.currentTarget.style.display = 'none';
                            }}
                            onLoad={() => {
                              console.log(`✅ Image loaded successfully:`, item.image_url);
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                            <span className="text-xs text-gray-600 dark:text-gray-400 font-semibold">
                              {item.name.toUpperCase().substring(0, 2)}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 font-medium">{item.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.package_type || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.brand || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.sku}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.category}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">₦{(item.price_jalingo || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">₦{(item.price_outside || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">₦{item.unit_price.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-sm font-semibold">
                          {formatQty(totalQty)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded text-sm font-semibold">
                          {formatQty(item.active_store_quantity)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded text-sm font-semibold">
                          {formatQty(item.main_store_quantity)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400">
                        ₦{(item.commission || 0).toLocaleString()}
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
      {modalType === 'add' && <AddEditModal type="add" formData={formData} setFormData={setFormData} imagePreview={imagePreview} setImagePreview={setImagePreview} onSubmit={handleAddItem} onClose={() => setModalType(null)} onNameChange={handleNameChange} token={token} />}
      {modalType === 'edit' && <AddEditModal type="edit" formData={formData} setFormData={setFormData} imagePreview={imagePreview} setImagePreview={setImagePreview} onSubmit={handleEditItem} onClose={() => setModalType(null)} onNameChange={handleNameChange} token={token} />}
      {modalType === 'transfer' && selectedItem && (
        <TransferModal item={selectedItem} transferData={transferData} setTransferData={setTransferData} onSubmit={handleTransfer} onClose={() => setModalType(null)} />
      )}

      {/* Fullscreen Image Modal */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={() => setFullscreenImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <img
              src={fullscreenImage}
              alt="Fullscreen"
              className="max-w-full max-h-[85vh] object-contain"
              onError={(e) => {
                console.error('❌ Fullscreen image failed to load');
                e.currentTarget.style.display = 'none';
              }}
            />
            <button
              onClick={() => setFullscreenImage(null)}
              className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white rounded-lg p-2 transition"
              title="Close image"
            >
              <X size={24} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

function StatCard({ title, items, quantity, color, isCurrency, onClick, isActive, valueOnly, totalQuantity }: { title: string; items?: number; quantity: number; color: string; isCurrency?: boolean; onClick?: () => void; isActive?: boolean; valueOnly?: boolean; totalQuantity?: number }) {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-200',
    purple: 'bg-purple-50 dark:bg-purple-900 border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-200',
    green: 'bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-700 text-green-700 dark:text-green-200',
    indigo: 'bg-indigo-50 dark:bg-indigo-900 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-200',
    red: 'bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-700 text-red-700 dark:text-red-200',
    amber: 'bg-amber-50 dark:bg-amber-900 border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-200',
  };

  const displayQuantity = isCurrency 
    ? `₦${quantity.toLocaleString()}` 
    : formatQty(quantity);

  return (
    <div 
      onClick={onClick}
      className={`border rounded-lg p-4 cursor-pointer transition-all ${
        isActive ? 'ring-2 ring-offset-2 ring-offset-gray-50 dark:ring-offset-gray-900' : ''
      } ${colorClasses[color as keyof typeof colorClasses]} ${
        onClick ? 'hover:shadow-lg hover:scale-105' : ''
      }`}
    >
      <p className="text-sm font-medium">{title}</p>
      {valueOnly ? (
        <div className="mt-6 space-y-4">
          <p className={`font-bold text-center ${isCurrency ? 'text-3xl md:text-4xl' : 'text-3xl'} break-words`}>
            {displayQuantity}
          </p>
          {totalQuantity !== undefined && (
            <p className="text-sm font-semibold text-center">{formatQty(totalQuantity)} Units</p>
          )}
        </div>
      ) : (
        <div className="mt-3 space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold opacity-75">Items</span>
            <span className="text-2xl font-bold">{items?.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold opacity-75">Quantity</span>
            <span className="text-xl font-bold">{displayQuantity}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function AddEditModal({
  type,
  formData,
  setFormData,
  imagePreview,
  setImagePreview,
  onSubmit,
  onClose,
  onNameChange,
  token,
}: {
  type: 'add' | 'edit';
  formData: any;
  setFormData: (data: any) => void;
  imagePreview: string | null;
  setImagePreview: (preview: string | null) => void;
  onSubmit: () => void;
  onClose: () => void;
  onNameChange: (name: string) => void;
  token: string | null;
}) {
  const [uploading, setUploading] = useState(false);

  // Cascading dropdown state
  const brandNames = getBrandNames();
  const isOthers = isOthersBrand(formData.brand);
  const packageTypes = formData.brand && !isOthers ? getPackageTypes(formData.brand) : [];
  const productVariants = formData.brand && formData.package_type && !isOthers
    ? getProductVariants(formData.brand, formData.package_type)
    : [];

  const handleBrandChange = (brand: string) => {
    const category = getBrandCategory(brand);
    setFormData({
      ...formData,
      brand,
      package_type: '',
      name: '',
      sku: '',
      category: category || formData.category,
      price_jalingo: 0,
      price_outside: 0,
    });
  };

  const handlePackageChange = (packageType: string) => {
    setFormData({
      ...formData,
      package_type: packageType,
      name: '',
      sku: '',
      price_jalingo: 0,
      price_outside: 0,
    });
  };

  const handleVariantChange = (variantName: string) => {
    const variant = productVariants.find((v) => v.name === variantName);
    const sku = generateSKUFromName(variantName);
    setFormData({
      ...formData,
      name: variantName,
      sku,
      unit_price: variant?.priceJalingo || formData.unit_price,
      price_jalingo: variant?.priceJalingo || 0,
      price_outside: variant?.priceOutside || 0,
    });
  };

  const generateSKUFromName = (name: string) => {
    if (!name || name.trim().length === 0) return '';
    // Generate SKU: first 3 chars uppercase + dash + 3-digit hash
    const clean = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const abbrev = clean.substring(0, 3);
    const hash = Math.abs(name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 900 + 100);
    return `${abbrev}-${hash}`;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Compress image client-side before uploading
      const fileToUpload = await compressImageClientSide(file);

      // Show preview
      const previewUrl = URL.createObjectURL(fileToUpload);
      setImagePreview(previewUrl);

      const fd = new FormData();
      fd.append('image', fileToUpload);

      const res = await api.post('/api/inventory/upload-image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const { url } = res.data;
      const proxyUrl = getImageUrl(url) || url;
      setFormData({ ...formData, image_url: proxyUrl });
      toast.success('✅ Image uploaded successfully');
    } catch (err: any) {
      console.error('Image upload error:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Upload failed';
      toast.error('Failed to upload image: ' + errorMsg);
      setImagePreview(null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto flex flex-col p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{type === 'add' ? 'Add New Item' : 'Edit Item'}</h2>
          <button onClick={() => { setImagePreview(null); onClose(); }} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4 flex-grow overflow-y-auto">
          {/* Level 1: Brand */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Brand</label>
            <select
              value={formData.brand}
              onChange={(e) => handleBrandChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              <option value="">-- Select Brand --</option>
              {brandNames.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Level 2: Package Type */}
          {formData.brand && !isOthers && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Package Type</label>
              <select
                value={formData.package_type}
                onChange={(e) => handlePackageChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              >
                <option value="">-- Select Package Type --</option>
                {packageTypes.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          )}

          {/* Level 2 & 3 text inputs for "OTHERS" */}
          {isOthers && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Package Type</label>
                <input
                  type="text"
                  placeholder="Enter package type"
                  value={formData.package_type}
                  onChange={(e) => setFormData({ ...formData, package_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Item Name</label>
                <input
                  type="text"
                  placeholder="Enter product name"
                  value={formData.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setFormData({ ...formData, name, sku: generateSKUFromName(name) });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
            </>
          )}

          {/* Level 3: Product Variant */}
          {formData.brand && formData.package_type && !isOthers && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Specific Product Name</label>
              <select
                value={formData.name}
                onChange={(e) => handleVariantChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              >
                <option value="">-- Select Product --</option>
                {productVariants.map((v) => (
                  <option key={v.name} value={v.name}>{v.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* SKU (Auto-generated) */}
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

          {/* Category (auto-filled from brand, editable) */}
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

          {/* Price in Jalingo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PRICE/CTN/BAG IN JALINGO (₦)</label>
            <input
              type="number"
              placeholder="Enter price in Jalingo"
              min="0"
              step="0.01"
              value={formData.price_jalingo || ''}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '' || !isNaN(Number(val))) {
                  setFormData({ ...formData, price_jalingo: val ? parseFloat(val) : 0 });
                }
              }}
              onKeyDown={(e) => { if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault(); }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Price Outside Jalingo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PRICE/CTN/BAG OUTSIDE JALINGO (₦)</label>
            <input
              type="number"
              placeholder="Enter price outside Jalingo"
              min="0"
              step="0.01"
              value={formData.price_outside || ''}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '' || !isNaN(Number(val))) {
                  setFormData({ ...formData, price_outside: val ? parseFloat(val) : 0 });
                }
              }}
              onKeyDown={(e) => { if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault(); }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Unit Price (general price field) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit Price (₦)</label>
            <input
              type="number"
              placeholder="Enter unit price"
              min="0"
              step="0.01"
              value={formData.unit_price || ''}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '' || !isNaN(Number(val))) {
                  setFormData({ ...formData, unit_price: val ? parseFloat(val) : 0 });
                }
              }}
              onKeyDown={(e) => { if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault(); }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Quantity Mode (edit only) */}
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

          {/* Quantity */}
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
                if (val === '') {
                  setFormData({ ...formData, main_store_quantity: 0 });
                } else {
                  const num = Number(val);
                  // Only accept integers (whole numbers)
                  if (!isNaN(num) && Number.isInteger(num) && num >= 0) {
                    setFormData({ ...formData, main_store_quantity: num });
                  }
                }
              }}
              onKeyDown={(e) => { if (['-', '+', 'e', 'E', '.'].includes(e.key)) e.preventDefault(); }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {type === 'add' 
                ? 'All quantity goes to Main Store.' 
                : formData.quantity_mode === 'add'
                ? 'This amount will be added to existing Main Store quantity'
                : 'This amount will replace existing Main Store quantity'}
            </p>
          </div>

          {/* Commission */}
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
              onKeyDown={(e) => { if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault(); }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Product Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product Image</label>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
              {imagePreview ? (
                <div className="relative">
                  <img 
                    src={imagePreview} 
                    alt="Product preview" 
                    className="w-full h-40 object-contain rounded-lg bg-gray-200 dark:bg-gray-600"
                    onError={(e) => {
                      console.error('❌ Preview image failed to load:', imagePreview);
                      e.currentTarget.style.display = 'none';
                    }}
                    onLoad={() => {
                      console.log('✅ Preview image loaded successfully');
                    }}
                  />
                  <button
                    onClick={() => {
                      console.log('🗑️ Clearing image preview');
                      setImagePreview(null);
                      setFormData({ ...formData, image_url: '' });
                    }}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center cursor-pointer py-4">
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {uploading ? 'Uploading...' : 'Click to upload image'}
                  </span>
                  <span className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP, GIF (max 5MB)</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6 pt-4 border-t dark:border-gray-700">
          <button
            onClick={() => { setImagePreview(null); onClose(); }}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={uploading}
            className="flex-1 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50"
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
                if (val === '') {
                  setTransferData({ ...transferData, quantity: 0 });
                } else {
                  const num = Number(val);
                  // Only accept integers (whole numbers)
                  if (!isNaN(num) && Number.isInteger(num) && num >= 0 && num <= maxQuantity) {
                    setTransferData({ ...transferData, quantity: num });
                  }
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
