'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Image from 'next/image';

interface Partner {
  id: number;
  nickname: string;
  pic: string;
}

interface SecretSantaClientProps {
  isAdmin: boolean;
  partner: Partner | null;
}

export default function SecretSantaClient({ isAdmin, partner: initialPartner }: SecretSantaClientProps) {
  const t = useTranslations('secretSanta');
  const [partner, setPartner] = useState<Partner | null>(initialPartner);
  const [assigning, setAssigning] = useState(false);

  async function handleAssign() {
    if (!confirm(t('assignConfirm'))) return;
    setAssigning(true);
    try {
      const res = await fetch('/api/secret-santa', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error === 'notEnoughMembers' ? t('assignError') : t('assignError'));
        return;
      }
      toast.success(t('assignSuccess'));

      // Reload partner info
      const partnerRes = await fetch('/api/secret-santa');
      if (partnerRes.ok) {
        const data = await partnerRes.json();
        setPartner(data.partner);
      }
    } finally {
      setAssigning(false);
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      {/* Current partner */}
      <div className="rounded-lg border p-6 max-w-sm">
        <h2 className="text-sm font-medium text-muted-foreground mb-4">{t('yourPartner')}</h2>
        {partner ? (
          <div className="flex items-center gap-4">
            {partner.pic && partner.pic !== 'none' ? (
              <div className="relative h-14 w-14 overflow-hidden rounded-full border">
                <Image src={partner.pic} alt={partner.nickname} fill className="object-cover" />
              </div>
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full border bg-muted text-xl font-semibold text-muted-foreground">
                {partner.nickname.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-xl font-semibold">{partner.nickname}</span>
          </div>
        ) : (
          <p className="text-muted-foreground">{t('noPartner')}</p>
        )}
      </div>

      {/* Admin draw button */}
      {isAdmin && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{t('previousPartnerAvoided')}</p>
          <Button
            onClick={handleAssign}
            disabled={assigning}
            style={{ background: 'var(--color-primary)' }}
            className="text-white"
          >
            {assigning ? '...' : t('assign')}
          </Button>
        </div>
      )}
    </div>
  );
}
