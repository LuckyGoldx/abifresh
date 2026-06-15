'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import api from '@/lib/api';
import { Package, Users, TrendingUp } from 'lucide-react';
import { StatsCard, ActivityLog, Toast, Activity, CreditTabs } from '@/components/credits';

import { formatQty } from '@/lib/format-quantity';
import { AbifreshLoading } from '@/components/AbifreshLoading';

export default function CreditsPage() {
  const user = useAuthStore((state) => state.user);
  const [stats, setStats] = useState<any>({});
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (retryCount = 0) => {
    try {
      const [statsRes, activitiesRes] = await Promise.all([
        api.get('/api/credits/overview/stats'),
        api.get('/api/credits/activities'),
      ]);
      setStats(statsRes.data);
      setActivities(activitiesRes.data);
      setToast(null);
      setIsLoading(false);
    } catch (error: any) {
      if (retryCount < 2) {
        // Silent retry after 1.5s
        setTimeout(() => fetchData(retryCount + 1), 1500);
      } else {
        setToast({ message: 'Failed to load credit data. Retrying...', type: 'error' });
        setIsLoading(false);
      }
    }
  };

  if (isLoading) return <AbifreshLoading />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <CreditTabs />
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Credit Overview</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Summary of credit activities and statistics</p>
        </div>

        <div className="space-y-6">
          {/* Today's Credit Sales */}
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-3">Today's Credit Sales</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard
                icon={({ className }: { className?: string }) => <span className={`${className} flex items-center justify-center text-2xl font-black leading-none`}>₦</span>}
                label="Today's Credit Sales"
                value={`₦${Number(stats.today_credits_amount || 0).toLocaleString()}`}
                color="bg-blue-50"
              />
              <StatsCard
                icon={Package}
                label="Today's Credit Items"
                value={stats.today_credit_items || 0}
                color="bg-green-50"
              />
              <StatsCard
                icon={TrendingUp}
                label="Today's Credits Collected"
                value={`₦${Number(stats.today_credits_collected || 0).toLocaleString()}`}
                color="bg-orange-50"
              />
              <StatsCard
                icon={({ className }: { className?: string }) => <span className={`${className} flex items-center justify-center text-lg font-black`}>#</span>}
                label="Today's Quantity Sold"
                value={formatQty(Number(stats.today_quantity_sold || 0))}
                color="bg-purple-50"
              />
            </div>
          </div>

          {/* All-Time Credits */}
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-3">All-Time Credits</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              icon={({ className }: { className?: string }) => <span className={`${className} flex items-center justify-center text-2xl font-black leading-none`}>₦</span>}
              label="Total Credits Amount"
              value={`₦${Number(stats.total_credits_amount || stats.totalCreditsAmount || 0).toLocaleString()}`}
              color="bg-blue-50"
            />
            <StatsCard
              icon={Package}
              label="Total Credits Quantity"
              value={formatQty(Number(stats.total_credits_quantity || stats.totalQuantity || 0))}
              color="bg-green-50"
            />
            <StatsCard
              icon={Users}
              label="Total Creditors"
              value={stats.total_creditors || stats.totalCreditors || 0}
              color="bg-purple-50"
            />
            <StatsCard
              icon={TrendingUp}
              label="Total Amount Paid"
              value={`₦${Number(stats.total_amount_paid || stats.totalAmountPaid || 0).toLocaleString()}`}
              color="bg-orange-50"
            />
          </div>
          </div>
          <ActivityLog activities={activities} />
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
