'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { Package, DollarSign, TrendingUp, AlertCircle, Bell, CheckCircle2, ShoppingBag } from 'lucide-react';

interface StaffDashboard {
  total_items_sold: number;
  total_amount_sold: number;
  total_posted_items: number;
  pending_payment_count: number;
  pending_posted_items: number;
  pending_payment_amount: number;
  approved_amount: number;
  total_expenses: number;
  unread_notifications: number;
  total_commission: number;
  paid_commission: number;
  is_commission_staff: boolean;
}

interface Sale {
  id: string;
  item_id: string;
  item_name?: string;
  items?: {
    id: string;
    name: string;
    sku: string;
  };
  quantity: number;
  price_jalingo: number;
  unit_price?: number;
  total_amount: number;
  payment_method: string;
  sale_date: string;
  receipt_number: string;
}

export default function StaffDashboard() {
  const user = useAuthStore((state) => state.user);
  const [dashboard, setDashboard] = useState<StaffDashboard | null>(null);
  const [salesHistory, setSalesHistory] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [availableItems, setAvailableItems] = useState({ count: 0, total_quantity: 0 });

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [dashRes, salesRes, storeRes] = await Promise.all([
          api.get('/api/staff/dashboard'),
          api.get('/api/staff/store/sales-history'),
          api.get('/api/staff/store'), // Get available items
        ]);
        setDashboard(dashRes.data);
        console.log('📥 Sales History from API:', salesRes.data);
        
        // The backend returns {allItems: [...], stats: {...}}
        // Extract the allItems array
        let historyData = [];
        if (salesRes.data?.allItems && Array.isArray(salesRes.data.allItems)) {
          historyData = salesRes.data.allItems;
          console.log('✅ Extracted allItems from response:', historyData.length, 'sales');
        } else if (Array.isArray(salesRes.data)) {
          historyData = salesRes.data;
          console.log('✅ Using direct array from response:', historyData.length, 'sales');
        } else {
          console.warn('⚠️ Unexpected API response structure:', salesRes.data);
          historyData = [];
        }
        
        setSalesHistory(historyData);
        
        // Calculate available items count and total quantity
        const items = storeRes.data || [];
        const totalQuantity = items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
        setAvailableItems({ count: items.length, total_quantity: totalQuantity });
      } catch (error) {
        console.error('Failed to fetch dashboard:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (isLoading) {
    return <div className="text-center py-12">Loading dashboard...</div>;
  }

  const StatCard = ({ icon: Icon, title, value, color, subtitle }: any) => (
    <div className="card flex items-center space-x-4">
      <div className={`${color} p-3 rounded-lg`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-gray-600 dark:text-gray-400 text-sm">{title}</p>
        <p className="text-2xl font-bold text-gray-800 dark:text-white">{value}</p>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-500">{subtitle}</p>}
      </div>
    </div>
  );

  // Calculate today's stats with proper date comparison
  const getTodaysDate = () => {
    const now = new Date();
    return now.toISOString().split('T')[0]; // YYYY-MM-DD format
  };

  const salesHistoryArray = Array.isArray(salesHistory) ? salesHistory : [];
  const todayString = getTodaysDate();
  
  console.log('� salesHistory state:', salesHistory);
  console.log('🔍 salesHistoryArray:', salesHistoryArray, 'Type:', typeof salesHistoryArray, 'Length:', salesHistoryArray.length);
  console.log('📅 Today\'s date (YYYY-MM-DD):', todayString);
  console.log('📊 Total sales in history:', salesHistoryArray.length);
  
  // Log first few sales for debugging
  if (salesHistoryArray.length > 0) {
    console.log('First sale date:', salesHistoryArray[0].sale_date);
    console.log('First sale keys:', Object.keys(salesHistoryArray[0]));
  }
  
  const todaysSales = salesHistoryArray.filter(sale => {
    const saleDateString = new Date(sale.sale_date).toISOString().split('T')[0];
    const isToday = saleDateString === todayString;
    if (isToday) {
      console.log('✅ Found today\'s sale:', sale.item_name || sale.items?.name, 'Qty:', sale.quantity, 'Amount:', sale.total_amount);
    }
    return isToday;
  });
  
  const todaysTotalSales = todaysSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
  const todaysItemsSold = todaysSales.length;
  const todaysTotalUnits = todaysSales.reduce((sum, sale) => sum + (sale.quantity || 0), 0);
  
  console.log('📊 Today\'s Summary - Items:', todaysItemsSold, 'Units:', todaysTotalUnits, 'Total:', todaysTotalSales);

  const isCommissionStaff = ['commission_staff', 'staff_commission'].includes(user?.role || '');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Staff Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Welcome, {user?.full_name} ({isCommissionStaff ? 'Commission Staff' : 'Non-Commission Staff'})
        </p>
        {user?.store_location && (
          <p className="text-sm text-gray-500">Store: {user.store_location}</p>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Stats - First Row */}
        <StatCard
          icon={DollarSign}
          title="Today's Total Sales"
          value={`₦${todaysTotalSales.toLocaleString()}`}
          color="bg-green-500"
          subtitle="Today's revenue"
        />
        <div className="card flex items-center space-x-4">
          <div className="bg-blue-500 p-3 rounded-lg">
            <ShoppingBag className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Today's Sales</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{todaysItemsSold}</p>
            <p className="text-xs text-gray-500 dark:text-gray-500">{todaysTotalUnits} units</p>
          </div>
        </div>
        
        {/* Overall Stats */}
        <StatCard
          icon={DollarSign}
          title="Total Sales Amount"
          value={`₦${(dashboard?.total_amount_sold || 0).toLocaleString()}`}
          color="bg-purple-500"
          subtitle="From items sold"
        />
        <div className="card flex items-center space-x-4">
          <div className="bg-cyan-500 p-3 rounded-lg">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Total Items Sold</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{dashboard?.total_items_sold || 0}</p>
            <p className="text-xs text-gray-500 dark:text-gray-500">Total units sold</p>
          </div>
        </div>
        <StatCard
          icon={TrendingUp}
          title="Posted Items Accepted"
          value={dashboard?.total_posted_items || 0}
          color="bg-indigo-500"
          subtitle="Received from sales"
        />
        <StatCard
          icon={CheckCircle2}
          title="Approved Payments"
          value={`₦${(dashboard?.approved_amount || 0).toLocaleString()}`}
          color="bg-teal-500"
          subtitle="By admin"
        />
        {dashboard?.is_commission_staff && (
          <StatCard
            icon={TrendingUp}
            title="Total Commission"
            value={`₦${(dashboard?.total_commission || 0).toLocaleString()}`}
            color="bg-orange-500"
            subtitle="Commission earned"
          />
        )}
        {dashboard?.is_commission_staff && (
          <StatCard
            icon={CheckCircle2}
            title="Paid Commission"
            value={`₦${(dashboard?.paid_commission || 0).toLocaleString()}`}
            color="bg-green-500"
            subtitle={`Out of ₦${(dashboard?.total_commission || 0).toLocaleString()}`}
          />
        )}
      </div>

      {/* Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {dashboard?.pending_posted_items! > 0 && (
          <div className="card bg-yellow-50 dark:bg-yellow-900 border-l-4 border-yellow-500 flex items-start space-x-4">
            <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-300 mt-1" />
            <div>
              <h3 className="font-bold text-yellow-900 dark:text-yellow-100">Pending Items</h3>
              <p className="text-yellow-700 dark:text-yellow-200">
                {dashboard?.pending_posted_items} item(s) awaiting your acceptance
              </p>
              <a href="/staff/posted-items" className="text-yellow-800 dark:text-yellow-200 underline text-sm mt-1 inline-block">
                View items →
              </a>
            </div>
          </div>
        )}

        {dashboard?.pending_payment_count! > 0 && (
          <div className="card bg-blue-50 dark:bg-blue-900 border-l-4 border-blue-500 flex items-start space-x-4">
            <AlertCircle className="w-6 h-6 text-blue-600 dark:text-blue-300 mt-1" />
            <div>
              <h3 className="font-bold text-blue-900 dark:text-blue-100">Pending Payments</h3>
              <p className="text-blue-700 dark:text-blue-200">
                {dashboard?.pending_payment_count} payment(s) pending approval
              </p>
              <p className="text-sm text-blue-600 dark:text-blue-300">
                ₦{(dashboard?.pending_payment_amount || 0).toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {dashboard?.unread_notifications! > 0 && (
          <div className="card bg-pink-50 dark:bg-pink-900 border-l-4 border-pink-500 flex items-start space-x-4">
            <Bell className="w-6 h-6 text-pink-600 dark:text-pink-300 mt-1" />
            <div>
              <h3 className="font-bold text-pink-900 dark:text-pink-100">New Notifications</h3>
              <p className="text-pink-700 dark:text-pink-200">
                You have {dashboard?.unread_notifications} unread notification(s)
              </p>
              <a href="/staff/notifications" className="text-pink-800 dark:text-pink-200 underline text-sm mt-1 inline-block">
                View all →
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <a href="/staff/posted-items" className="card text-center hover:shadow-lg transition cursor-pointer bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800">
          <div className="text-4xl mb-2">📥</div>
          <h3 className="font-bold text-gray-800 dark:text-white">Posted Items</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {dashboard?.pending_posted_items} pending
          </p>
        </a>

        <a href="/staff/payments" className="card text-center hover:shadow-lg transition cursor-pointer bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800">
          <div className="text-4xl mb-2">💳</div>
          <h3 className="font-bold text-gray-800 dark:text-white">Make Payment</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Upload receipt</p>
        </a>

        <a href="/staff/expenses" className="card text-center hover:shadow-lg transition cursor-pointer bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800">
          <div className="text-4xl mb-2">💸</div>
          <h3 className="font-bold text-gray-800 dark:text-white">Track Expenses</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            ₦{(dashboard?.total_expenses || 0).toLocaleString()}
          </p>
        </a>

        <a href="/staff/notifications" className="card text-center hover:shadow-lg transition cursor-pointer bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900 dark:to-pink-800">
          <div className="text-4xl mb-2">🔔</div>
          <h3 className="font-bold text-gray-800 dark:text-white">Notifications</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {dashboard?.unread_notifications || 0} new
          </p>
        </a>
      </div>

      {/* Sales History */}
      {salesHistoryArray.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-pink-500" />
            Recent Sales
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 dark:text-gray-300">Item</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600 dark:text-gray-300">Qty</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600 dark:text-gray-300">Unit Price</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600 dark:text-gray-300">Total</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-600 dark:text-gray-300">Payment</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 dark:text-gray-300">Date</th>
                </tr>
              </thead>
              <tbody>
                {salesHistoryArray.slice(0, 10).map((sale) => (
                  <tr key={sale.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                    <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">{sale.item_name || sale.items?.name || 'Item'}</td>
                    <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-300">{sale.quantity}</td>
                    <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-300">₦{(sale.price_jalingo || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-bold text-pink-600 dark:text-pink-400">₦{(sale.total_amount || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-1 rounded text-xs font-medium capitalize">
                        {sale.payment_method}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                      {new Date(sale.sale_date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: '2-digit'
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {salesHistoryArray.length > 10 && (
            <div className="mt-4 pt-4 border-t dark:border-gray-700 text-center">
              <a href="/staff/make-sale" className="text-pink-600 dark:text-pink-400 hover:underline text-sm font-medium">
                View all sales →
              </a>
            </div>
          )}
        </div>
      )}

      {salesHistoryArray.length === 0 && !isLoading && (
        <div className="card text-center py-8">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 dark:text-gray-400">No sales yet</p>
          <p className="text-sm text-gray-400 mt-1">Start making sales to see them here</p>
          <a href="/staff/make-sale" className="text-pink-600 dark:text-pink-400 hover:underline text-sm font-medium mt-2 inline-block">
            Make a sale →
          </a>
        </div>
      )}
    </div>
  );
}
