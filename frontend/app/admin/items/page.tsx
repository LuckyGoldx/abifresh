'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import api from '@/lib/api';
import { ShoppingBag, Plus, Edit2, Trash2, X, Upload } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { PRODUCT_CATALOG, getBrandNames, getPackageTypes, getProductVariants, getBrandCategory, isOthersBrand } from '@/lib/productCatalog';

interface Item {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit_price: number;
  commission: number;
  brand?: string;
  package_type?: string;
  price_jalingo?: number;
  price_outside?: number;
  image_url?: string;
  created_at: string;
  main_store_quantity?: number;
  active_store_quantity?: number;
  is_available?: boolean;
}

type ModalType = 'add' | 'edit' | null;

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

function getImageUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  if (url.startsWith(API_BASE + '/api/inventory/images/')) return url;
  if (url.startsWith('/api/inventory/images/')) return `${API_BASE}${url}`;
  const match = url.match(/products\/([^?]+)/);
  if (match) return `${API_BASE}/api/inventory/images/${match[1]}`;
  return url;
}

// Helper: keep integers as integers, round decimals to 2 places
function formatPrice(value: number | string): number {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return 0;
  if (Number.isInteger(num)) return num; // Keep as integer if whole number
  return Math.round(num * 100) / 100; // Only round to 2 decimals if has decimals
}

export default function ItemsPage() {
  const token = useAuthStore((state) => state.token);
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<{ url: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    unit_price: 0,
    commission: 0,
    brand: '',
    package_type: '',
    price_jalingo: 0,
    price_outside: 0,
    image_url: '',
    main_store_quantity: 0,
    quantity_mode: 'add' as 'add' | 'update',
  });

  // Get available options based on cascade
  const brandNames = getBrandNames();
  const isOthers = isOthersBrand(formData.brand);
  const packageTypes = formData.brand && !isOthers ? getPackageTypes(formData.brand) : [];
  const productVariants = formData.brand && formData.package_type && !isOthers
    ? getProductVariants(formData.brand, formData.package_type)
    : [];

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/api/inventory/items');
      setItems(response.data);
    } catch (error) {
      console.error('Failed to fetch items:', error);
      toast.error('Failed to load items');
    } finally {
      setIsLoading(false);
    }
  };

  const getStockStatus = (item: Item) => {
    const totalQuantity = (item.main_store_quantity || 0) + (item.active_store_quantity || 0);
    
    if (totalQuantity === 0) {
      return {
        status: 'Out of Stock',
        color: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200',
        bgColor: 'bg-red-50 dark:bg-red-950',
        badge: 'bg-red-600',
      };
    } else if (totalQuantity < 100) {
      return {
        status: 'Low Stock',
        color: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200',
        bgColor: 'bg-yellow-50 dark:bg-yellow-950',
        badge: 'bg-yellow-600',
      };
    } else {
      return {
        status: 'In Stock',
        color: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200',
        bgColor: 'bg-green-50 dark:bg-green-950',
        badge: 'bg-green-600',
      };
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      sku: '',
      category: '',
      unit_price: 0,
      commission: 0,
      brand: '',
      package_type: '',
      price_jalingo: 0,
      price_outside: 0,
      image_url: '',
      main_store_quantity: 0,
      quantity_mode: 'add',
    });
    setSelectedItem(null);
    setModalType(null);
    setImagePreview(null);
  };

  const generateSKUFromName = (name: string) => {
    if (!name || name.trim().length === 0) return '';
    const clean = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const abbrev = clean.substring(0, 3);
    const hash = Math.abs(name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 900 + 100);
    return `${abbrev}-${hash}`;
  };

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch(`${API_BASE}/api/inventory/upload-image`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: fd,
      });

      if (!res.ok) {
        const err = await res.json();
        const errorMsg = err.error || 'Upload failed';
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }

      const { url } = await res.json();
      // Store the actual Supabase URL in the database (not a localhost proxy URL).
      // getImageUrl() will still proxy it for display purposes.
      setFormData({ ...formData, image_url: url });
      setImagePreview(getImageUrl(url) || url);
      toast.success('✅ Image uploaded successfully');
    } catch (err: any) {
      console.error('Image upload error:', err);
      toast.error('Failed to upload image: ' + err.message);
      setImagePreview(null);
    } finally {
      setUploading(false);
    }
  };

  const openAddModal = () => {
    resetForm();
    setModalType('add');
  };

  const openEditModal = (item: Item) => {
    setSelectedItem(item);
    setFormData({
      name: item.name,
      sku: item.sku,
      category: item.category,
      unit_price: item.unit_price,
      commission: item.commission || 0,
      brand: item.brand || '',
      package_type: item.package_type || '',
      price_jalingo: item.price_jalingo || 0,
      price_outside: item.price_outside || 0,
      image_url: item.image_url || '',
      main_store_quantity: 0,
      quantity_mode: 'add',
    });
    setImagePreview(getImageUrl(item.image_url) || null);
    setModalType('edit');
  };

  const handleAddItem = async () => {
    try {
      if (!formData.name || !formData.sku || !formData.category) {
        toast.error('Please fill in all required fields');
        return;
      }

      const res = await fetch('http://localhost:5000/api/inventory/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          sku: formData.sku,
          category: formData.category,
          unit_price: formatPrice(formData.unit_price),
          quantity: formData.main_store_quantity,
          commission: formatPrice(formData.commission || 0),
          brand: formData.brand || undefined,
          package_type: formData.package_type || undefined,
          price_jalingo: formatPrice(formData.price_jalingo || 0),
          price_outside: formatPrice(formData.price_outside || 0),
          image_url: formData.image_url || undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to add item');
      }

      toast.success('✅ Item added successfully');
      resetForm();
      fetchItems();
    } catch (error: any) {
      toast.error(error.message || 'Error adding item');
    }
  };

  const handleEditItem = async () => {
    try {
      if (!selectedItem) return;
      if (!formData.name || !formData.sku || !formData.category) {
        toast.error('Please fill in all required fields');
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
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
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
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to edit item');
      }

      toast.success('✅ Item updated successfully');
      resetForm();
      setSelectedItem(null);
      fetchItems();
    } catch (error: any) {
      toast.error(error.message || 'Error editing item');
    }
  };

  const handleDeleteItem = (itemId: string) => {
    setDeleteItemId(itemId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteItemId) return;
    
    try {
      const res = await fetch(`http://localhost:5000/api/inventory/items/${deleteItemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to delete item');
      }

      toast.success('✅ Item deleted successfully');
      setShowDeleteModal(false);
      setDeleteItemId(null);
      fetchItems();
    } catch (error: any) {
      toast.error(error.message || 'Error deleting item');
      setShowDeleteModal(false);
      setDeleteItemId(null);
    }
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return <div className="text-center py-12 text-gray-600 dark:text-gray-400">Loading items...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <ShoppingBag className="w-10 h-10 text-pink-500" />
            Items Catalog
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{filteredItems.length} items</p>
        </div>
        <button
          onClick={openAddModal}
          className="px-6 py-3 bg-pink-600 text-white rounded-lg font-semibold hover:bg-pink-700 flex items-center gap-2 transition shadow-lg hover:shadow-xl"
        >
          <Plus className="w-5 h-5" />
          Add Item
        </button>
      </div>

      {/* Search Box */}
      <div className="mb-8">
        <input
          type="text"
          placeholder="🔍 Search by item name, SKU, or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent dark:bg-gray-800 dark:text-white text-lg transition"
        />
      </div>

      {/* Items Grid */}
      {filteredItems.length === 0 ? (
        <div className="card text-center py-16">
          <ShoppingBag className="w-20 h-20 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            {searchQuery ? 'No items match your search' : 'No items found'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 auto-rows-max">
          {filteredItems.map((item) => {
            const stockInfo = getStockStatus(item);
            const totalQuantity = (item.main_store_quantity || 0) + (item.active_store_quantity || 0);
            
            return (
              <div
                key={item.id}
                className={`${stockInfo.bgColor} rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border-2 border-transparent hover:border-pink-300 dark:hover:border-pink-600`}
              >
                {/* Product Image Container */}
                <div 
                  className="relative h-64 bg-gray-200 dark:bg-gray-700 overflow-hidden group cursor-pointer"
                  onClick={() => {
                    if (item.image_url) {
                      setFullscreenImage({ url: getImageUrl(item.image_url) || item.image_url, name: item.name });
                    }
                  }}
                >
                  {item.image_url ? (
                    <Image
                      src={item.image_url}
                      alt={item.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  
                  {/* Stock Badge */}
                  <div className={`absolute top-3 right-3 ${stockInfo.color} px-3 py-1 rounded-full text-xs font-bold shadow-lg`}>
                    {stockInfo.status}
                  </div>

                  {/* Quantity Display */}
                  <div className="absolute bottom-3 left-3 bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    Quantity: {totalQuantity}
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-4 space-y-3">
                  {/* Product Name */}
                  <div>
                    <h3 
                      className="text-lg font-bold text-gray-900 dark:text-white line-clamp-2 hover:text-pink-600 cursor-pointer"
                      onClick={() => {
                        if (item.image_url) {
                          setFullscreenImage({ url: getImageUrl(item.image_url) || item.image_url, name: item.name });
                        }
                      }}
                    >
                      {item.name}
                    </h3>
                  </div>

                  {/* SKU and Category */}
                  <div className="flex gap-2 text-xs font-semibold">
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                      SKU: {item.sku}
                    </span>
                    <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded">
                      {item.category}
                    </span>
                  </div>

                  {/* Brand and Package Type */}
                  {(item.brand || item.package_type) && (
                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      {item.brand && <p><span className="font-semibold">Brand:</span> {item.brand}</p>}
                      {item.package_type && <p><span className="font-semibold">Type:</span> {item.package_type}</p>}
                    </div>
                  )}

                  {/* Pricing Section */}
                  <div className="border-t border-gray-300 dark:border-gray-600 pt-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Unit Price:</span>
                      <span className="text-lg font-bold text-pink-600 dark:text-pink-400">
                        ₦{item.unit_price.toLocaleString()}
                      </span>
                    </div>
                    
                    {item.price_jalingo ? (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Jalingo:</span>
                        <span className="font-semibold text-gray-800 dark:text-gray-200">
                          ₦{item.price_jalingo.toLocaleString()}
                        </span>
                      </div>
                    ) : null}
                    
                    {item.price_outside ? (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Outside:</span>
                        <span className="font-semibold text-gray-800 dark:text-gray-200">
                          ₦{item.price_outside.toLocaleString()}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  {/* Commission */}
                  <div className="flex justify-between items-center bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900 dark:to-orange-900 p-2 rounded-lg">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Commission:</span>
                    <span className="text-lg font-bold text-amber-600 dark:text-amber-400">₦{item.commission.toLocaleString()}</span>
                  </div>

                  {/* Store Quantities */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-indigo-100 dark:bg-indigo-900 p-2 rounded">
                      <p className="text-indigo-600 dark:text-indigo-300 font-semibold">Main Store</p>
                      <p className="text-lg font-bold text-indigo-700 dark:text-indigo-200">{item.main_store_quantity || 0}</p>
                    </div>
                    <div className="bg-teal-100 dark:bg-teal-900 p-2 rounded">
                      <p className="text-teal-600 dark:text-teal-300 font-semibold">Active Store</p>
                      <p className="text-lg font-bold text-teal-700 dark:text-teal-200">{item.active_store_quantity || 0}</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-4 border-t border-gray-300 dark:border-gray-600">
                    <button
                      onClick={() => openEditModal(item)}
                      className="flex-1 p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
                      title="Edit item"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="flex-1 p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
                      title="Delete item"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {modalType === 'add' ? 'Add New Item' : 'Edit Item'}
              </h2>
              <button
                onClick={resetForm}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Level 1: Brand */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Brand</label>
                <select
                  value={formData.brand}
                  onChange={(e) => handleBrandChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 dark:bg-gray-700 dark:text-white"
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
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Package Type</label>
                  <select
                    value={formData.package_type}
                    onChange={(e) => handlePackageChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">-- Select Package Type --</option>
                    {packageTypes.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Level 2 & 3 text inputs for OTHERS brand */}
              {isOthers && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Package Type</label>
                    <input
                      type="text"
                      placeholder="Enter package type"
                      value={formData.package_type}
                      onChange={(e) => setFormData({ ...formData, package_type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Item Name</label>
                    <input
                      type="text"
                      placeholder="Enter product name"
                      value={formData.name}
                      onChange={(e) => {
                        const name = e.target.value;
                        setFormData({ ...formData, name, sku: generateSKUFromName(name) });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </>
              )}

              {/* Level 3: Specific Product Name (dropdown for catalog items) */}
              {formData.brand && formData.package_type && !isOthers && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Specific Product Name</label>
                  <select
                    value={formData.name}
                    onChange={(e) => handleVariantChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">-- Select Product --</option>
                    {productVariants.map((v) => (
                      <option key={v.name} value={v.name}>{v.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* SKU (Auto-generated, read-only) */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">SKU (Auto-generated)</label>
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
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Category</label>
                <input
                  type="text"
                  placeholder="Enter category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Price Jalingo */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Price Jalingo (₦)</label>
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Price Outside Jalingo */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Price Outside Jalingo (₦)</label>
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Unit Price */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Unit Price (₦)</label>
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Commission */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Commission (₦)</label>
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Quantity Mode (edit only) */}
              {modalType === 'edit' && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Quantity Mode</label>
                  <select
                    value={formData.quantity_mode}
                    onChange={(e) => setFormData({ ...formData, quantity_mode: e.target.value as 'add' | 'update' })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 dark:bg-gray-700 dark:text-white"
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
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  {modalType === 'add' ? 'Quantity (Main Store)' : formData.quantity_mode === 'add' ? 'Add Quantity' : 'New Quantity'}
                </label>
                <input
                  type="number"
                  placeholder={modalType === 'add' ? 'Enter quantity for main store' : formData.quantity_mode === 'add' ? 'Enter quantity to add' : 'Enter new quantity'}
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 dark:bg-gray-700 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {modalType === 'add' 
                    ? 'All quantity goes to Main Store.' 
                    : formData.quantity_mode === 'add'
                    ? 'This amount will be added to existing Main Store quantity'
                    : 'This amount will replace existing Main Store quantity'}
                </p>
              </div>

              {/* Product Image Upload */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Product Image</label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
                  {imagePreview ? (
                    <div className="relative">
                      <Image
                        src={imagePreview}
                        alt="Product preview"
                        width={300}
                        height={160}
                        className="w-full h-40 object-contain rounded-lg bg-gray-200 dark:bg-gray-600"
                        onError={(e) => {
                          console.error('❌ Preview image failed to load:', imagePreview);
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
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

            <div className="flex gap-2 pt-6">
              <button
                onClick={modalType === 'add' ? handleAddItem : handleEditItem}
                className="flex-1 px-4 py-2 bg-pink-600 text-white rounded-lg font-semibold hover:bg-pink-700 transition"
              >
                {modalType === 'add' ? 'Add Item' : 'Save Changes'}
              </button>
              <button
                onClick={resetForm}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-sm w-full overflow-hidden animate-scale-in">
            {/* Red header */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-6">
              <div className="flex items-center gap-3">
                <div className="bg-white bg-opacity-20 p-3 rounded-full">
                  <Trash2 className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white">Delete Item</h3>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-6">
              <p className="text-gray-700 dark:text-gray-300 text-lg font-medium mb-2">
                Are you sure you want to delete this item?
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                This action cannot be undone. The item will be permanently removed from your inventory.
              </p>
            </div>

            {/* Footer with buttons */}
            <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteItemId(null);
                }}
                className="flex-1 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-100 dark:hover:bg-gray-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition shadow-lg hover:shadow-xl"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Image Modal */}
      {fullscreenImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-[60] p-4 cursor-pointer"
          onClick={() => setFullscreenImage(null)}
        >
          <div className="relative w-full h-full flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {/* Close Button */}
            <button
              onClick={() => setFullscreenImage(null)}
              className="absolute top-4 right-4 bg-white text-black rounded-full p-2 hover:bg-gray-300 z-10 transition"
            >
              <X size={28} />
            </button>

            {/* Item Name */}
            <div className="absolute top-4 left-4 bg-white text-black px-4 py-2 rounded-lg font-bold max-w-md truncate">
              {fullscreenImage.name}
            </div>

            {/* Image */}
            <Image
              src={fullscreenImage.url}
              alt={fullscreenImage.name}
              fill
              className="object-contain"
              onClick={() => setFullscreenImage(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
