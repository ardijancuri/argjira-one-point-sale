import React from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, size = 'max-w-4xl', titleSize = 'text-lg sm:text-xl' }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className={`bg-white rounded-lg ${size} w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto`}>
        <div className="sticky top-0 bg-white border-b border-border px-4 sm:px-6 md:px-8 py-4 sm:py-6 flex justify-between items-center z-10">
          <h2 className={`${titleSize} font-bold pr-2`}>{title}</h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4 sm:w-6 sm:h-6" />
          </button>
        </div>
        <div className="p-4 sm:p-6 md:p-8">{children}</div>
      </div>
    </div>
  );
}

