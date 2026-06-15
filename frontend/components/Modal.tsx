'use client';

import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden transform transition-all duration-300 scale-100">
        <div className="p-6 space-y-4">
          {title && (
            <h3 className="text-xl font-bold text-gray-900 dark:text-white border-b pb-3 dark:border-gray-800 flex justify-between items-center">
              <span>{title}</span>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </h3>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
