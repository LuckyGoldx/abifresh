'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import api from '@/lib/api';
import { CheckCircle, Package } from 'lucide-react';
import { formatQty } from '@/lib/format-quantity';

interface Item {
  id: string;
  name: string;
  sku: string;
  active_store_quantity: number;
  price_jalingo: number;
  unit_price?: number;
  category: string;
  brand?: string;
  package_type?: string;
  price_outside?: number;
  image_url?: string;
  commission?: number;
}

export default function AvailableItemsPage() {
  const token = useAuthStore((state) => state.token);
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchItems();
    }
  }, [token]);

  const fetchItems = async () => {
    try {
      const response = await api.get('/api/inventory/active-store', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      setItems(response.data.filter((item: Item) => item.active_store_quantity > 0));
    } catch (error) {
      console.error('Failed to fetch items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-12">Loading items...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
        <CheckCircle className="w-8 h-8 text-green-500" />
        Available Items ({items.length})
      </h1>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">{item.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{item.category}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500">{item.sku}</p>
              </div>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                In Stock
              </span>
            </div>
            <div className="flex justify-between items-center mt-4">
              <p className="text-2xl font-bold text-pink-600">₦{(item.price_jalingo || 0).toLocaleString()}</p>
              <p className="text-sm text-green-600 dark:text-green-400">Stock: {formatQty(item.active_store_quantity)}</p>
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <div className="card text-center py-12">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No items available</p>
        </div>
      )}
    </div>
  );
}
