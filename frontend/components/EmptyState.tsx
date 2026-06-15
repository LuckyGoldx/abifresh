'use client';

import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
}

export default function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="text-center py-12 text-gray-500">
      <Icon className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-700" />
      <p className="font-medium text-gray-700 dark:text-gray-300">{title}</p>
      {description && <p className="text-sm mt-1 text-gray-400">{description}</p>}
    </div>
  );
}
