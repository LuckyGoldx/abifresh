'use client';

import type { Expense } from '@/types';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import { Wallet, TrendingDown, Eye } from 'lucide-react';

interface ExpenseTableProps {
  expenses: Expense[];
  onViewExpense: (expense: Expense) => void;
}

export default function ExpenseTable({ expenses, onViewExpense }: ExpenseTableProps) {
  return (
    <div className="card border dark:border-gray-700/50">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Expense History</h2>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {expenses.length} total entries
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold">
              <th className="text-left py-3 px-4">Date</th>
              <th className="text-left py-3 px-4">Category</th>
              <th className="text-left py-3 px-4">Description</th>
              <th className="text-center py-3 px-4">Status</th>
              <th className="text-right py-3 px-4">Amount</th>
              <th className="text-center py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense) => (
              <tr
                key={expense.id}
                className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
              >
                <td className="py-3 px-4 text-sm whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      {new Date(expense.created_at || expense.expense_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                      {new Date(expense.created_at || expense.expense_date).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      })}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 rounded text-xs font-semibold">
                    {expense.category}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm max-w-[150px] truncate" title={expense.description}>
                  {expense.description}
                </td>
                <td className="py-3 px-4 text-center">
                  <StatusBadge status={(expense.status as any) || 'pending'} />
                </td>
                <td className="py-3 px-4 text-right whitespace-nowrap font-bold text-red-600 dark:text-red-400">
                  <span className="flex items-center justify-end gap-1">
                    <TrendingDown className="w-4 h-4" />
                    ₦{expense.amount.toLocaleString()}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <button
                    onClick={() => onViewExpense(expense)}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-pink-500 dark:text-pink-400 rounded-lg transition-colors inline-flex items-center justify-center"
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {expenses.length === 0 && (
        <EmptyState
          icon={Wallet}
          title="No expenses recorded yet"
          description="Submit new ones to see them here"
        />
      )}
    </div>
  );
}
