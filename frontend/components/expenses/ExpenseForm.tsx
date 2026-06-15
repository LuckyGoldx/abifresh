'use client';

import type { ExpenseCategory } from '@/lib/hooks/useExpenseCategories';
import NairaInput from '@/components/NairaInput';
import { Calendar, Plus } from 'lucide-react';

interface ExpenseFormProps {
  amount: string;
  category: string;
  description: string;
  expenseDate: string;
  categories: ExpenseCategory[];
  submitting: boolean;
  showCustomInput: boolean;
  customInputValue: string;
  canAddCustom: boolean;
  onAmountChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onExpenseDateChange: (value: string) => void;
  onShowCustomInput: (show: boolean) => void;
  onCustomInputValueChange: (value: string) => void;
  onAddCustomCategory: (name: string) => Promise<boolean>;
  onSubmit: (e: React.FormEvent) => void;
  onRenameClick?: () => void;
  showRenameInput?: boolean;
  renameValue?: string;
  onRenameValueChange?: (value: string) => void;
  onRenameSubmit?: () => Promise<boolean>;
  onRenameCancel?: () => void;
}

export default function ExpenseForm({
  amount,
  category,
  description,
  expenseDate,
  categories,
  submitting,
  showCustomInput,
  customInputValue,
  canAddCustom,
  onAmountChange,
  onCategoryChange,
  onDescriptionChange,
  onExpenseDateChange,
  onShowCustomInput,
  onCustomInputValueChange,
  onAddCustomCategory,
  onSubmit,
  onRenameClick,
  showRenameInput,
  renameValue,
  onRenameValueChange,
  onRenameSubmit,
  onRenameCancel,
}: ExpenseFormProps) {
  return (
    <div className="card sticky top-6 border dark:border-gray-700/50">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Plus className="w-6 h-6 text-pink-500" />
        Add New Expense
      </h2>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            Expense Date *
          </label>
          <input
            type="date"
            value={expenseDate}
            onChange={(e) => onExpenseDateChange(e.target.value)}
            className="input w-full cursor-pointer disabled:opacity-50"
            required
            disabled={submitting}
            max={new Date().toISOString().split('T')[0]}
            onFocus={(e) => (e.currentTarget as any).showPicker?.()}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Amount (₦) *
          </label>
          <NairaInput
            value={amount}
            onChange={onAmountChange}
            required
            disabled={submitting}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Expense Type *
          </label>
          <select
            value={showCustomInput ? '__add_custom__' : category}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '__add_custom__') {
                onShowCustomInput(true);
              } else {
                onCategoryChange(val);
              }
            }}
            className="input disabled:opacity-50"
            required
            disabled={submitting}
          >
            <option value="">Select category...</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.name}>{cat.name}</option>
            ))}
            {canAddCustom && <option value="__add_custom__">➕ Add Custom</option>}
          </select>
          {onRenameClick && category && !showCustomInput && (
            <button
              type="button"
              onClick={onRenameClick}
              className="ml-2 text-gray-400 hover:text-pink-600 transition inline-flex items-center gap-1 text-xs mt-1"
            >
              ✏️ Rename
            </button>
          )}
          {showRenameInput && (
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                value={renameValue}
                onChange={(e) => onRenameValueChange?.(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') { await onRenameSubmit?.(); }
                  if (e.key === 'Escape') { onRenameCancel?.(); }
                }}
                className="input flex-1"
                placeholder="Rename category..."
                autoFocus
              />
              <button type="button" onClick={onRenameSubmit} className="bg-pink-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-pink-700 transition">Save</button>
              <button type="button" onClick={onRenameCancel} className="text-gray-500 dark:text-gray-400 px-3 py-2 text-sm hover:text-gray-700 transition">Cancel</button>
            </div>
          )}
          {canAddCustom && showCustomInput && (
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                value={customInputValue}
                onChange={(e) => onCustomInputValueChange(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    const ok = await onAddCustomCategory(customInputValue);
                    if (ok) {
                      onCategoryChange(customInputValue.trim());
                      onShowCustomInput(false);
                      onCustomInputValueChange('');
                    }
                  }
                  if (e.key === 'Escape') {
                    onShowCustomInput(false);
                    onCustomInputValueChange('');
                  }
                }}
                className="input flex-1"
                placeholder="Type custom category..."
                autoFocus
              />
              <button
                type="button"
                onClick={async () => {
                  const ok = await onAddCustomCategory(customInputValue);
                  if (ok) {
                    onCategoryChange(customInputValue.trim());
                  }
                  onShowCustomInput(false);
                  onCustomInputValueChange('');
                }}
                className="bg-pink-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-pink-700 transition"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  onShowCustomInput(false);
                  onCustomInputValueChange('');
                }}
                className="text-gray-500 dark:text-gray-400 px-3 py-2 text-sm hover:text-gray-700 transition"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Description *
          </label>
          <textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            className="input disabled:opacity-50"
            rows={3}
            required
            disabled={submitting}
            placeholder="Describe the expense..."
          />
        </div>

        <button
          type="submit"
          className="btn-primary w-full disabled:opacity-50 flex items-center justify-center gap-2"
          disabled={submitting || !amount || !category || !description}
        >
          Record Expense
        </button>
      </form>
    </div>
  );
}
