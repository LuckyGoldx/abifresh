'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import api from '@/lib/api';
import { XCircle, Package } from 'lucide-react';
import type { Item } from '@/types';

export default function UnavailableItemsPage() {
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
      const response = await api.get('/api/inventory/unavailable', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      setItems(response.data);
    } catch (error) {
      console.error('Failed to fetch items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <AbifreshLoading />;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
        <XCircle className="w-8 h-8 text-red-500" />
        Unavailable Items ({items.length})
      </h1>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {items.map((item) => (
          <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 opacity-75">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-bold text-lg text-gray-600 dark:text-gray-400">{item.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-500">{item.category}</p>
                <p className="text-xs text-gray-400 dark:text-gray-600">{item.sku}</p>
              </div>
              <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                Out of Stock
              </span>
            </div>
            <div className="flex justify-between items-center mt-4">
              <p className="text-2xl font-bold text-gray-400">₦{(item.price_jalingo || 0).toLocaleString()}</p>
              <p className="text-sm text-red-600 dark:text-red-400">Stock: 0</p>
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <div className="card text-center py-12">
          <Package className="w-16 h-16 text-green-300 mx-auto mb-4" />
          <p className="text-gray-500">All items are in stock!</p>
        </div>
      )}
    </div>
  );
}
