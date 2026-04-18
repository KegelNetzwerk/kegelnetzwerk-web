'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CollapsibleSectionProps {
  readonly title: string;
  readonly children: React.ReactNode;
}

export default function CollapsibleSection({ title, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 text-left font-semibold text-lg bg-muted/40 hover:bg-muted/60 transition-colors cursor-pointer"
        onClick={() => setOpen((o) => !o)}
      >
        <span>{title}</span>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {open && (
        <div className="overflow-x-auto">
          {children}
        </div>
      )}
    </div>
  );
}
