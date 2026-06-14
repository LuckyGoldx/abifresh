'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, AlertCircle, Activity } from 'lucide-react';
import { formatQty } from '@/lib/format-quantity';

export const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) => {
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

export const StatsCard = ({ icon: Icon, label, value, color = 'bg-blue-50' }: any) => (
  <div className={`${color} dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden`}>
    <div className="flex flex-col items-center text-center lg:flex-row lg:items-center lg:text-left gap-3">
      <Icon className="w-8 h-8 text-pink-500 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-gray-600 dark:text-gray-400 text-sm">{label}</p>
        <p className="text-2xl font-bold text-gray-800 dark:text-white break-words">{value}</p>
      </div>
    </div>
  </div>
);

export interface Activity {
  id: string;
  action: string;
  details: any;
  creditor_name?: string;
  staff_name?: string;
  created_at: string;
}

export function getActivityDescription(activity: Activity): string {
  const name = activity.creditor_name || 'Unknown';
  const details = activity.details || {};

  switch (activity.action) {
    case 'CREDITOR_CREATED':
      return `${name} has been added as a creditor`;
    case 'CREDITOR_UPDATED':
      return `${name}'s details have been updated`;
    case 'CREDIT_GIVEN': {
      const count = details.items?.length || 0;
      const amount = Number(details.total_amount) || 0;
      return `${name} has been given ${count} item${count !== 1 ? 's' : ''} worth ₦${amount.toLocaleString()} on credit`;
    }
    case 'CREDIT_PAYMENT_MADE':
    case 'CREDIT_PAYMENT_APPROVED': {
      const amt = Number(details.amount) || 0;
      return `${name} made a payment of ₦${amt.toLocaleString()}`;
    }
    case 'PAYMENT_APPROVED': {
      const amt = Number(details.amount) || 0;
      return `${name}'s payment of ₦${amt.toLocaleString()} has been approved`;
    }
    case 'PAYMENT_REJECTED': {
      const amt = Number(details.amount) || 0;
      const reason = details.reason ? ` (${details.reason})` : '';
      return `${name}'s payment of ₦${amt.toLocaleString()} was rejected${reason}`;
    }
    case 'CREDIT_CANCELLED':
      return `${name}'s credit (receipt ${details.receipt_number || ''}) has been cancelled`;
    case 'CREDIT_ITEM_RETURNED': {
      const details = activity.details || {};
      const qty = details.quantity || details.qty || 0;
      const item = details.item_name || details.itemName || details.item || 'item';
      const creditor = details.creditor_name || details.creditorName || details.creditor || 'creditor';
      const staff = activity.staff_name || 'Staff';
      return `${staff} returned ${formatQty(qty)} ${item} from ${creditor} to the active store`;
    }
    default:
      if (activity.action.includes('CREDIT_ITEM_RETURNED')) {
         const details = activity.details || {};
         const qty = details.quantity || details.qty || 0;
         const item = details.item_name || details.itemName || details.item || 'item';
         const creditor = details.creditor_name || details.creditorName || details.creditor || 'creditor';
         const staff = activity.staff_name || 'Staff';
         return `${staff} returned ${formatQty(qty)} ${item} from ${creditor} to the active store`;
      }
      return `${activity.staff_name || name} - ${activity.action.replace(/_/g, ' ').toLowerCase()}`;
  }
}

export const ActivityLog = ({ activities }: { activities: Activity[] }) => {
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4">
      <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5 text-pink-500" />
        Recent Activities
      </h3>
      <div className="space-y-3">
        {activities.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">No activities yet</p>
        ) : (
          activities.slice(0, 10).map((activity) => (
            <div 
              key={activity.id} 
              onClick={() => setSelectedActivity(activity)}
              className="border-l-4 border-pink-500 pl-4 py-2 hover:bg-pink-50 dark:hover:bg-pink-900/10 transition-colors cursor-pointer group"
            >
              <div className="flex justify-between items-start">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 group-hover:text-pink-600 transition-colors">
                  {getActivityDescription(activity)}
                </p>
                <div className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded uppercase font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                  View Details
                </div>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                {new Date(activity.created_at).toLocaleString()}
              </p>
            </div>
          ))
        )}
      </div>

      {/* ACTIVITY DETAIL MODAL */}
      {selectedActivity && (
        <div 
          onClick={() => setSelectedActivity(null)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 cursor-default border dark:border-gray-700"
          >
            <div className="bg-pink-600 p-6 text-white">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold uppercase tracking-widest opacity-80">Activity Summary</span>
                <button onClick={() => setSelectedActivity(null)} className="hover:bg-white/20 p-1 rounded-full transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
              <h2 className="text-xl font-black leading-tight">
                {getActivityDescription(selectedActivity)}
              </h2>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase mb-1">Processed By</p>
                  <p className="font-bold text-gray-900 dark:text-white">{selectedActivity.staff_name || 'System'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase mb-1">Transaction Date</p>
                  <p className="font-bold text-gray-900 dark:text-white">{new Date(selectedActivity.created_at).toLocaleString()}</p>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase mb-3">Transaction Summary</p>
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 space-y-2">
                  {Object.entries(selectedActivity.details || {}).map(([key, value]: [string, any]) => {
                    if (['success', 'credit_store_id', 'item_id'].includes(key)) return null;
                    const label = key.replace(/_/g, ' ').replace('url', '').trim();
                    
                    let displayValue = String(value);
                    if (Array.isArray(value)) {
                      displayValue = `${value.length} items`;
                    } else if (typeof value === 'object' && value !== null) {
                      displayValue = 'See Details';
                    }

                    if (key.includes('amount') || key.includes('price')) {
                      displayValue = `₦${Number(value).toLocaleString()}`;
                    }

                    const isUrl = String(value).startsWith('http');

                    return (
                      <div key={key} className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 last:border-0 pb-2 last:pb-0 pt-1 first:pt-0">
                        <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500">{label}</span>
                        {isUrl ? (
                          <div 
                            onClick={() => setFullScreenImage(String(value))}
                            className="w-12 h-12 rounded-lg border-2 border-pink-200 dark:border-pink-900 overflow-hidden cursor-pointer hover:border-pink-500 transition-all shadow-sm"
                          >
                            <img src={String(value)} alt="Receipt" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{displayValue}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <button 
                onClick={() => setSelectedActivity(null)}
                className="w-full py-4 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white rounded-2xl font-black hover:bg-gray-200 dark:hover:bg-gray-700 transition-all uppercase tracking-widest text-xs"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL SCREEN IMAGE OVERLAY */}
      {fullScreenImage && (
        <div 
          onClick={() => setFullScreenImage(null)}
          className="fixed inset-0 bg-black/95 z-[300] flex items-center justify-center p-4 cursor-pointer animate-in fade-in duration-200"
        >
          <img 
            src={fullScreenImage} 
            alt="Full Preview" 
            className="max-w-full max-h-full object-contain shadow-2xl rounded-lg animate-in zoom-in-90 duration-300" 
          />
          <div className="absolute top-6 right-6 text-white bg-white/20 p-2 rounded-full backdrop-blur-md">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </div>
          <p className="absolute bottom-6 text-white/60 font-bold uppercase tracking-widest text-[10px]">Click anywhere to close</p>
        </div>
      )}
    </div>
  );
};



export function getImageUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  if (url.startsWith('https://')) return url;
  if (url.startsWith('http://')) return url;
  return url;
}

export const CreditTabs = () => {
  return null;
};