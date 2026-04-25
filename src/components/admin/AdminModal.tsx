'use client';

import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface AdminModalProps {
  readonly children: React.ReactNode;
  readonly title: string;
  readonly onClose: () => void;
  readonly wide?: boolean;
}

export default function AdminModal({ children, title, onClose, wide }: AdminModalProps) {
  return createPortal(
    <div // NOSONAR — backdrop cannot be a <button> as it contains buttons; role is intentionally omitted
      aria-label="Close"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
    >
      <div // NOSONAR — native <dialog> breaks flex centering via UA default positioning
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={`w-full rounded-xl bg-white shadow-xl p-6 space-y-4 ${wide ? 'max-w-2xl' : 'max-w-md'}`}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">{title}</h3>
          <button type="button" onClick={onClose} className="cursor-pointer text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
