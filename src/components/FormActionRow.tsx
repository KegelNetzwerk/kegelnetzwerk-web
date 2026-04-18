'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Save, X } from 'lucide-react';

interface FormActionRowProps {
  readonly submitLabel: string;
  readonly loading: boolean;
  readonly onCancel: () => void;
}

export default function FormActionRow({ submitLabel, loading, onCancel }: FormActionRowProps) {
  const tc = useTranslations('common');

  return (
    <div className="flex gap-2">
      <Button type="submit" disabled={loading} style={{ background: 'var(--kn-primary, #005982)' }} className="text-white">
        <Save size={15} />
        <span>{submitLabel}</span>
      </Button>
      <Button type="button" variant="outline" onClick={onCancel}>
        <X size={15} />
        <span>{tc('cancel')}</span>
      </Button>
    </div>
  );
}
