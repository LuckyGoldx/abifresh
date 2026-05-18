'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import api from '@/lib/api';
import { Package, DollarSign, TrendingUp, CheckCircle, AlertCircle, ArrowUp, Users, Clock, X } from 'lucide-react';
import { formatQty } from '@/lib/format-quantity';

// Toast notification component
const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
  const icon = type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />;

  return (
    <div className={`fixed top-4 right-4 ${bgColor} text-white px-4 py-3 rounded shadow-lg flex items-center gap-2 z-50 animate-pulse`}>
      {icon}
      <span>{message}</span>
    </div>
  );
};

interface Item {
  id: string;
  name: string;
  sku: string;
  price_jalingo: number;
  unit_price?: number;
  active_store_quantity: number;
  main_store_quantity: number;
  commission: number;
  category: string;
  brand?: string;
  package_type?: string;
  price_outside?: number;
  image_url?: string;
}

interface CartItem extends Item {
  sale_quantity: number;
  payment_method: 'cash' | 'pos' | 'transfer';
  sold_outside_jalingo: boolean;
}

interface Staff {
  id: string;
  full_name: string;
  username: string;
  role: string;
}

interface DashboardStats {
  today_items_sold: number;
  today_amount_sold: number;
  all_time_items_sold: number;
  all_time_amount_sold: number;
  available_items_count: number;
}

interface Receipt {
  id: string;
  receipt_number: string;
  total_amount: number;
  created_at: string;
  items: any[];
  staff_name?: string;
  date?: Date;
  payment_method?: string;
}

interface Activity {
  id: string;
  type: 'sale' | 'post-items' | 'receipt';
  title: string;
  description: string;
  amount?: number;
  itemCount?: number;
  timestamp: Date;
  staffName: string;
}

export default function SalesDashboard() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [unavailableItems, setUnavailableItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [logisticPrice, setLogisticPrice] = useState(0);
  const [selectedStaffForPost, setSelectedStaffForPost] = useState<string | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showReceiptsModal, setShowReceiptsModal] = useState(false);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [currentReceipt, setCurrentReceipt] = useState<any | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [currentActivityPage, setCurrentActivityPage] = useState(1);
  const [postedItemsStats, setPostedItemsStats] = useState<any | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && token) {
      loadAllData();
      const interval = setInterval(loadAllData, 10000);
      return () => clearInterval(interval);
    }
  }, [mounted, token]);

  const loadAllData = async () => {
    try {
      await Promise.all([
        fetchItems(),
        fetchUnavailableItems(),
        fetchStats(),
        fetchStaff(),
        fetchLogisticPrice(),
        fetchReceipts(),
        fetchActivities(),
        fetchPostedItemsStats(),
      ]);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const fetchItems = async () => {
    try {
      const response = await api.get('/api/inventory/active-store', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const available = response.data.filter((item: Item) => item.active_store_quantity > 0);
      setItems(available);
      setFilteredItems(available);
    } catch (error) {
      console.error('Failed to fetch items:', error);
    }
  };

  const fetchUnavailableItems = async () => {
    try {
      const response = await api.get('/api/inventory/items', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const unavailable = response.data.filter((item: Item) => item.active_store_quantity === 0);
      setUnavailableItems(unavailable);
    } catch (error) {
      console.error('Failed to fetch unavailable items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Fetch receipts to calculate today's stats
      const receiptsRes = await api.get('/api/receipts', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      const allReceipts = receiptsRes.data || [];
      
      // Get today's date (without time) in local timezone
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Filter receipts created today
      const todayReceipts = allReceipts.filter((receipt: any) => {
        const receiptDate = new Date(receipt.created_at);
        return receiptDate >= today && receiptDate < tomorrow;
      });
      
      // Calculate today's stats
      // receipts API returns receipt_items[] array (no items_count field)
      const todayStats = todayReceipts.reduce((acc: any, receipt: any) => {
        const itemsCount = (receipt.receipt_items || []).reduce(
          (sum: number, item: any) => sum + (item.quantity || 0), 0
        );
        return {
          items: acc.items + itemsCount,
          amount: acc.amount + (receipt.total_amount || 0),
        };
      }, { items: 0, amount: 0 });
      
      // Fetch available and unavailable items count from active store only
      const itemsRes = await api.get('/api/inventory/active-store', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      const allItems = itemsRes.data || [];
      const availableCount = allItems.filter((item: any) => item.active_store_quantity > 0).length;
      
      setStats({
        today_items_sold: todayStats.items,
        today_amount_sold: todayStats.amount,
        all_time_items_sold: 0,
        all_time_amount_sold: 0,
        available_items_count: availableCount,
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchStaff = async () => {
    try {
      const response = await api.get('/api/admin/staff', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      setStaffList(response.data.filter((s: Staff) => s.id !== user?.id));
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    }
  };

  const fetchLogisticPrice = async () => {
    try {
      const response = await api.get('/api/admin/settings/logistics-price', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      setLogisticPrice(response.data?.price || 0);
    } catch (error) {
      console.error('Failed to fetch logistics price:', error);
    }
  };

  const fetchReceipts = async () => {
    try {
      const response = await api.get('/api/sales/receipts', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      setReceipts(response.data);
    } catch (error) {
      console.error('Failed to fetch receipts:', error);
    }
  };

  const fetchActivities = async () => {
    try {
      // Fetch receipts for sales activities
      const receiptsRes = await api.get('/api/sales/receipts', {
        headers: { 'Authorization': `Bearer ${token}` },
      }).catch((error) => {
        console.error('Error fetching receipts:', error);
        return { data: [] };
      });

      // Fetch posted items history
      const postedItemsRes = await api.get('/api/sales/posted-items/history', {
        headers: { 'Authorization': `Bearer ${token}` },
      }).catch((error) => {
        console.error('Error fetching posted items history:', error);
        return { data: [] };
      });

      const allActivities: Activity[] = [];

      // Add receipt activities (sales made)
      (receiptsRes.data || []).forEach((receipt: any) => {
        if (receipt.id && receipt.receipt_number) {
          allActivities.push({
            id: receipt.id,
            type: 'sale',
            title: 'Sale Completed',
            description: `Receipt #${receipt.receipt_number} - ${receipt.items_count || 0} item(s) sold`,
            amount: receipt.total_amount,
            itemCount: receipt.items_count || 0,
            timestamp: new Date(receipt.created_at),
            staffName: user?.full_name || 'Unknown',
          });
        }
      });

      // Add posted items activities
      (postedItemsRes.data || []).forEach((item: any) => {
        allActivities.push({
          id: item.id,
          type: 'post-items',
          title: item.title,
          description: item.description,
          amount: item.amount,
          itemCount: item.quantity,
          timestamp: new Date(item.timestamp),
          staffName: item.staff_name || 'Unknown',
        });
      });

      // Sort by timestamp (newest first)
      allActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // Keep only last 10 activities
      setActivities(allActivities.slice(0, 10));
    } catch (error) {
      console.error('Failed to fetch activities:', error);
      setActivities([]);
    }
  };

  const fetchPostedItemsStats = async () => {
    try {
      const response = await api.get('/api/sales/posted-items/stats', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      setPostedItemsStats(response.data);
    } catch (error) {
      console.error('Failed to fetch posted items stats:', error);
      setPostedItemsStats(null);
    }
  };;

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredItems(items);
    } else {
      const filtered = items.filter(item =>
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.sku.toLowerCase().includes(query.toLowerCase()) ||
        item.category.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredItems(filtered);
    }
  };

  const addToCart = (item: Item) => {
    const existing = cart.find(c => c.id === item.id);
    if (existing && existing.sale_quantity < item.active_store_quantity) {
      setCart(cart.map(c => c.id === item.id ? { ...c, sale_quantity: c.sale_quantity + 1 } : c));
      setToast({ message: `${item.name} quantity increased`, type: 'success' });
    } else if (!existing) {
      setCart([...cart, { ...item, sale_quantity: 1, payment_method: 'cash', sold_outside_jalingo: false }]);
      setToast({ message: `${item.name} added to cart`, type: 'success' });
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    const item = items.find(i => i.id === id);
    setCart(cart.map(cartItem => {
      if (cartItem.id === id) {
        const newQty = cartItem.sale_quantity + delta;
        return (newQty > 0 && newQty <= (item?.active_store_quantity || 0))
          ? { ...cartItem, sale_quantity: newQty }
          : cartItem;
      }
      return cartItem;
    }).filter(item => item.sale_quantity > 0));
  };

  const updatePaymentMethod = (id: string, method: 'cash' | 'pos' | 'transfer') => {
    setCart(cart.map(item => item.id === id ? { ...item, payment_method: method } : item));
  };

  const updateOutsideJalingo = (id: string, value: boolean) => {
    setCart(cart.map(item => item.id === id ? { ...item, sold_outside_jalingo: value } : item));
  };

  const removeFromCart = (id: string) => {
    const item = cart.find(c => c.id === id);
    setCart(cart.filter(item => item.id !== id));
    if (item) {
      setToast({ message: `${item.name} removed from cart`, type: 'success' });
    }
  };

  const calculateCartTotal = () => {
    return cart.reduce((sum, item) => {
      let itemTotal = (item.price_jalingo || 0) * item.sale_quantity;
      if (item.sold_outside_jalingo) {
        itemTotal += logisticPrice * item.sale_quantity;
      }
      return sum + itemTotal;
    }, 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      setToast({ message: 'Cart is empty', type: 'error' });
      return;
    }

    try {
      const saleData = {
        items: cart.map(item => ({
          item_id: item.id,
          quantity: item.sale_quantity,
          unit_price: item.price_jalingo || 0,
          payment_method: cart[0].payment_method,
          sold_outside_jalingo: cart[0].sold_outside_jalingo,
          logistics_fee: cart[0].sold_outside_jalingo ? logisticPrice : 0,
        })),
        total_amount: calculateCartTotal(),
        payment_method: cart[0].payment_method,
        sold_outside_jalingo: cart[0].sold_outside_jalingo,
      };

      const response = await api.post('/api/sales/create-sale', saleData, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      // Generate receipt
      const receipt = {
        id: response.data.sale_id,
        receipt_number: response.data.receipt_number || `REC-${Date.now()}`,
        date: new Date(),
        created_at: new Date().toISOString(),
        staff_name: user?.full_name,
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.sale_quantity,
          unit_price: item.price_jalingo || 0,
          subtotal: (item.price_jalingo || 0) * item.sale_quantity,
        })),
        logistics_fee: cart[0].sold_outside_jalingo ? logisticPrice * cart.reduce((sum, item) => sum + item.sale_quantity, 0) : 0,
        total_amount: calculateCartTotal(),
        payment_method: cart[0].payment_method,
      };

      setCurrentReceipt(receipt);
      setShowReceiptModal(true);
      setReceipts([...receipts, receipt]);
      setCart([]);
      setToast({ message: 'Sale completed successfully! Receipt generated.', type: 'success' });
      await loadAllData();
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to complete sale';
      setToast({ message: errorMsg, type: 'error' });
    }
  };

  const handlePostItems = async () => {
    if (!selectedStaffForPost || cart.length === 0) {
      setToast({ message: 'Please select a staff member and add items', type: 'error' });
      return;
    }

    try {
      const postData = {
        staff_id: selectedStaffForPost,
        items: cart,
      };

      await api.post('/api/sales/post-items', postData, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      setToast({ message: 'Items posted successfully. Staff will receive a notification.', type: 'success' });
      setCart([]);
      setSelectedStaffForPost(null);
      setShowPostModal(false);
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to post items';
      alert(errorMsg);
    }
  };

  const printReceipt = (receipt: Receipt) => {
    const printWindow = window.open('', '', 'height=400,width=600');
    if (printWindow) {
      const staffName = receipt.staff_name || 'Staff';
      const paymentMethod = (receipt.payment_method || 'cash').toUpperCase();
      const date = receipt.date ? new Date(receipt.date).toLocaleString() : new Date().toLocaleString();
      
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt ${receipt.receipt_number}</title>
            <style>
              body { font-family: Arial; padding: 20px; }
              .receipt { border: 1px solid #ccc; padding: 20px; max-width: 400px; margin: 0 auto; }
              .header { text-align: center; margin-bottom: 20px; }
              .company-name { font-size: 18px; font-weight: bold; color: #d91e63; }
              .receipt-number { font-size: 12px; color: #666; }
              .items { margin: 20px 0; border-top: 1px solid #ccc; border-bottom: 1px solid #ccc; padding: 10px 0; }
              .item { display: flex; justify-content: space-between; padding: 5px 0; font-size: 12px; }
              .total { border-top: 2px solid #000; padding-top: 10px; font-weight: bold; display: flex; justify-content: space-between; }
              .footer { text-align: center; margin-top: 20px; font-size: 11px; color: #666; }
              .staff-info { text-align: center; font-size: 11px; margin-top: 10px; }
            </style>
          </head>
          <body>
            <div class="receipt">
              <div class="header">
                <div class="company-name">ABIFRESH & KIDDIES VENTURES</div>
                <div class="receipt-number">#${receipt.receipt_number}</div>
              </div>
              <div class="items">
                ${receipt.items.map((item: any) => `
                  <div class="item">
                    <span>${item.name} x${formatQty(item.quantity)}</span>
                    <span>₦${item.subtotal.toLocaleString()}</span>
                  </div>
                `).join('')}
              </div>
              <div class="total">
                <span>Total:</span>
                <span>₦${receipt.total_amount.toLocaleString()}</span>
              </div>
              <div class="staff-info">
                <p>Staff: ${staffName}</p>
                <p>Payment: ${paymentMethod}</p>
                <p>${date}</p>
              </div>
              <div class="footer">
                <p>Thank you for your purchase!</p>
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const downloadReceiptAsImage = async (receipt: any) => {
    const staffName = receipt.staff_name || 'Staff';
    const paymentMethod = (receipt.payment_method || 'cash').toUpperCase();
    const date = receipt.date ? new Date(receipt.date).toLocaleString() : new Date().toLocaleString();
    
    const element = document.createElement('div');
    element.style.cssText = 'position: absolute; left: -9999px; top: -9999px; background: white; padding: 20px; width: 400px; font-family: Arial;';
    element.innerHTML = `
      <div style="border: 1px solid #ccc; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="font-size: 18px; font-weight: bold; color: #d91e63;">ABIFRESH & KIDDIES VENTURES</div>
          <div style="font-size: 12px; color: #666;">#${receipt.receipt_number}</div>
        </div>
        <div style="margin: 20px 0; border-top: 1px solid #ccc; border-bottom: 1px solid #ccc; padding: 10px 0;">
          ${receipt.items.map((item: any) => `
            <div style="display: flex; justify-content: space-between; padding: 5px 0; font-size: 12px;">
              <span>${item.name} x${formatQty(item.quantity)}</span>
              <span>₦${item.subtotal.toLocaleString()}</span>
            </div>
          `).join('')}
        </div>
        <div style="border-top: 2px solid #000; padding-top: 10px; font-weight: bold; display: flex; justify-content: space-between;">
          <span>Total:</span>
          <span>₦${receipt.total_amount.toLocaleString()}</span>
        </div>
        <div style="text-align: center; font-size: 11px; margin-top: 10px;">
          <p>Staff: ${staffName}</p>
          <p>Payment: ${paymentMethod}</p>
          <p>${date}</p>
        </div>
      </div>
    `;
    document.body.appendChild(element);
    
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(element);
      const link = document.createElement('a');
      link.href = canvas.toDataURL();
      link.download = `receipt-${receipt.receipt_number}.png`;
      link.click();
    } catch (error) {
      console.error('Failed to download receipt:', error);
      alert('Please print instead');
    } finally {
      document.body.removeChild(element);
    }
  };

  if (!mounted || isLoading) {
    return <div className="text-center py-12 text-gray-600 dark:text-gray-400">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Today's Items Sold</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{formatQty(stats?.today_items_sold || 0)}</p>
            </div>
            <Package className="w-8 h-8 text-pink-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Today's Amount</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">₦{(stats?.today_amount_sold || 0).toLocaleString()}</p>
            </div>
            <svg className="w-8 h-8 text-green-500" fill="currentColor" viewBox="0 0 24 24">
              <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="16" fontWeight="bold">₦</text>
            </svg>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Available Items</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats?.available_items_count || 0}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Unavailable Items</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{unavailableItems.length}</p>
            </div>
            <X className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Posted Items (Accepted)</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{postedItemsStats?.accepted_items || 0}</p>
              <p className="text-xs text-gray-500 mt-1">{formatQty(postedItemsStats?.accepted_quantity || 0)} qty</p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Posted Items (Total)</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{postedItemsStats?.total_posted_items || 0}</p>
              <p className="text-xs text-gray-500 mt-1">{formatQty(postedItemsStats?.total_posted_quantity || 0)} qty</p>
            </div>
            <Users className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Recent Activities Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-6 h-6 text-pink-500" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recent Activities</h2>
        </div>

        {activities.length > 0 ? (
          <>
            <div className="space-y-3">
              {activities.slice((currentActivityPage - 1) * 10, currentActivityPage * 10).map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 pb-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700 p-3 rounded transition"
                >
                  <div className="mt-1">
                    {activity.type === 'sale' ? (
                      <div className="w-5 h-5 text-green-500 font-bold text-lg flex items-center justify-center">₦</div>
                    ) : activity.type === 'post-items' ? (
                      <TrendingUp className="w-5 h-5 text-blue-500" />
                    ) : (
                      <ArrowUp className="w-5 h-5 text-gray-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {activity.title}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {activity.timestamp.toLocaleTimeString('en-NG', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })} • {activity.timestamp.toLocaleDateString('en-NG')}
                    </p>
                  </div>
                  <div className="text-right">
                    {activity.amount && (
                      <p className="font-bold text-green-600 dark:text-green-400">
                        ₦{activity.amount.toLocaleString()}
                      </p>
                    )}
                    {activity.itemCount && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {formatQty(activity.itemCount)} item{activity.itemCount !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls - Always show for consistency */}
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing {(currentActivityPage - 1) * 10 + 1} to {Math.min(currentActivityPage * 10, activities.length)} of {activities.length} activities
              </div>
              {activities.length > 10 && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentActivityPage(Math.max(1, currentActivityPage - 1))}
                    disabled={currentActivityPage === 1}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white transition"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.ceil(activities.length / 10) }).map((_, idx) => {
                      const pageNum = idx + 1;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentActivityPage(pageNum)}
                          className={`px-3 py-1 rounded transition ${
                            currentActivityPage === pageNum
                              ? 'bg-pink-600 text-white'
                              : 'border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentActivityPage(Math.min(Math.ceil(activities.length / 10), currentActivityPage + 1))}
                    disabled={currentActivityPage === Math.ceil(activities.length / 10)}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white transition"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No activities yet. Start making sales or posting items!</p>
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
