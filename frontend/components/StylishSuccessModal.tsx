'use client';

import React from 'react';
import { Check, X } from 'lucide-react';

interface StylishSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  buttonText?: string;
}

export default function StylishSuccessModal({
  isOpen,
  onClose,
  title,
  message,
  buttonText = 'Awesome, Thanks!'
}: StylishSuccessModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Modal Card */}
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 fade-in duration-300">
        {/* Decorative Top Background */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-green-400 to-emerald-600 opacity-10 dark:opacity-20" />
        
        <div className="relative pt-10 pb-8 px-6 flex flex-col items-center text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6 shadow-inner animate-in slide-in-from-bottom-4 duration-500 delay-150 fill-mode-both">
            <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/40">
              <Check className="text-white w-8 h-8" strokeWidth={3} />
            </div>
          </div>
          
          {/* Content */}
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            {title}
          </h3>
          
          {message && (
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-8">
              {message}
            </p>
          )}
          
          {/* Button */}
          <button
            onClick={onClose}
            className="w-full py-4 bg-slate-900 dark:bg-green-600 hover:bg-slate-800 dark:hover:bg-green-500 text-white font-bold rounded-2xl transition-all active:scale-[0.98] shadow-xl shadow-slate-900/20 dark:shadow-green-900/20"
          >
            {buttonText}
          </button>
        </div>
        
        {/* Close Icon (Top Right) */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
