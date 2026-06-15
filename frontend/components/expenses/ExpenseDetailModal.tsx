'use client';

import type { Expense } from '@/types';
import Modal from '@/components/Modal';
import StatusBadge from '@/components/StatusBadge';
import { Wallet } from 'lucide-react';

interface ExpenseDetailModalProps {
  expense: Expense | null;
  onClose: () => void;
}

export default function ExpenseDetailModal({ expense, onClose }: ExpenseDetailModalProps) {
  if (!expense) return null;

  return (
    <Modal isOpen={!!expense} onClose={onClose} title="Expense Request Details">
      <div className="space-y-3 py-2 text-sm text-gray-700 dark:text-gray-300">
        <div className="grid grid-cols-3 gap-2 border-b dark:border-gray-800 pb-2">
          <span className="font-semibold text-gray-500 dark:text-gray-400">Date</span>
          <span className="col-span-2 font-medium">
            {new Date(expense.expense_date || expense.created_at).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 border-b dark:border-gray-800 pb-2">
          <span className="font-semibold text-gray-500 dark:text-gray-400">Category</span>
          <span className="col-span-2">
            <span className="px-2.5 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 rounded-full text-xs font-semibold">
              {expense.category}
            </span>
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 border-b dark:border-gray-800 pb-2">
          <span className="font-semibold text-gray-500 dark:text-gray-400">Amount</span>
          <span className="col-span-2 text-lg font-bold text-red-600 dark:text-red-400">
            ₦{expense.amount.toLocaleString()}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 border-b dark:border-gray-800 pb-2">
          <span className="font-semibold text-gray-500 dark:text-gray-400">Status</span>
          <span className="col-span-2">
            <StatusBadge status={(expense.status as any) || 'pending'} />
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 border-b dark:border-gray-800 pb-2">
          <span className="font-semibold text-gray-500 dark:text-gray-400">Description</span>
          <span className="col-span-2 whitespace-pre-wrap break-words">{expense.description}</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <span className="font-semibold text-gray-500 dark:text-gray-400">Admin Note</span>
          <span className="col-span-2 italic text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-words">
            {expense.admin_notes
              ? expense.admin_notes
              : expense.status === 'disapproved'
              ? 'No reason provided by admin'
              : 'No notes added yet'}
          </span>
        </div>
      </div>
      <div className="pt-4 border-t dark:border-gray-800">
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium text-sm"
        >
          Close Details
        </button>
      </div>
    </Modal>
  );
}
