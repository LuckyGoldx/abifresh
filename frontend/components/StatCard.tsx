'use client';

import type { LucideIcon } from 'lucide-react';

export interface StatCardProps {
  icon: LucideIcon;
  title: string;
  value: string | number;
  color: string;
  onClick?: () => void;
  additionalInfo?: string;
  subtitle?: string;
  badge?: string;
}

export default function StatCard({
  icon: Icon,
  title,
  value,
  color,
  onClick,
  additionalInfo,
  subtitle,
  badge,
}: StatCardProps) {
  return (
    <div
      className={`card flex flex-col md:flex-row items-center md:space-x-4 text-center md:text-left ${
        onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''
      }`}
      onClick={onClick}
    >
      <div className={`${color} p-2 md:p-3 rounded-lg flex-shrink-0`}>
        <Icon className="w-5 md:w-6 h-5 md:h-6 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-gray-600 dark:text-gray-400 text-xs md:text-sm break-words">
          {title}
        </p>
        <div className="flex items-center justify-center md:justify-start gap-2">
          <p className="text-lg md:text-2xl font-bold text-gray-800 dark:text-white break-words leading-tight">
            {value}
          </p>
          {badge && (
            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-pink-100 dark:bg-pink-900 text-pink-600 dark:text-pink-300 whitespace-nowrap">
              {badge}
            </span>
          )}
        </div>
        {additionalInfo && (
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 break-words">
            {additionalInfo}
          </p>
        )}
        {subtitle && !additionalInfo && (
          <p className="text-xs text-gray-500 dark:text-gray-500 break-words">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
