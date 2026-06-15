'use client';

type StatusVariant = 'pending' | 'approved' | 'disapproved' | 'rejected' | 'accepted' | 'active' | 'inactive';

interface StatusBadgeProps {
  status: StatusVariant;
  className?: string;
}

const variantClasses: Record<StatusVariant, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400',
  disapproved: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400',
  accepted: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400',
  active: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400',
  inactive: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold inline-block ${variantClasses[status] || variantClasses.pending} ${className}`}>
      {label}
    </span>
  );
}
