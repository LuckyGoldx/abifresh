'use client';

import { X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isAlert?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isAlert = false,
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-sm w-full p-8 shadow-2xl border dark:border-gray-700 animate-in zoom-in-95 duration-200 text-center">
        <div className="flex justify-end -mt-4 -mr-4">
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <h2 className="text-xl font-black text-gray-900 dark:text-white mb-3">{title}</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6 leading-relaxed whitespace-pre-wrap">{message}</p>
        <div className="flex gap-3">
          {!isAlert && (
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 px-4 py-3 rounded-2xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 px-4 py-3 rounded-2xl text-white font-bold text-sm transition disabled:opacity-50 ${
              isAlert ? 'w-full bg-pink-600 hover:bg-pink-700' : 'bg-pink-600 hover:bg-pink-700'
            }`}
          >
            {isLoading ? 'Processing...' : isAlert ? 'OK' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
