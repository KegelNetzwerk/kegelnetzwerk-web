'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import Modal from '@/components/admin/AdminModal';
import { toast } from 'sonner';
import Image from 'next/image';
import { Shuffle, Eye, AlertTriangle } from 'lucide-react';

interface Partner {
  id: number;
  nickname: string;
  pic: string;
}

interface PairingRow {
  id: number;
  nickname: string;
  pic: string;
  secretSantaPartner: Partner | null;
}

interface PendingChange {
  giverId: number;
  giverNickname: string;
  receiverId: number | null;
  receiverNickname: string;
  previousReceiverNickname: string | null;
}

interface SecretSantaClientProps {
  readonly isAdmin: boolean;
  readonly partner: Partner | null;
}

export default function SecretSantaClient({ isAdmin, partner: initialPartner }: SecretSantaClientProps) {
  const t = useTranslations('secretSanta');
  const tCommon = useTranslations('common');
  const [partner, setPartner] = useState<Partner | null>(initialPartner);
  const [assigning, setAssigning] = useState(false);
  const [showAssignConfirm, setShowAssignConfirm] = useState(false);
  const [pairings, setPairings] = useState<PairingRow[] | null>(null);
  const [reveal, setReveal] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);

  const receivedCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const row of pairings ?? []) {
      if (row.secretSantaPartner) {
        counts.set(row.secretSantaPartner.id, (counts.get(row.secretSantaPartner.id) ?? 0) + 1);
      }
    }
    return counts;
  }, [pairings]);

  useEffect(() => {
    if (isAdmin) fetchPairings();
  }, [isAdmin]);

  async function fetchPairings() {
    const res = await fetch('/api/secret-santa/pairings');
    if (res.ok) setPairings(await res.json());
  }

  async function confirmAssign() {
    setShowAssignConfirm(false);
    setAssigning(true);
    try {
      const res = await fetch('/api/secret-santa', { method: 'POST' });
      if (!res.ok) {
        toast.error(t('assignError'));
        return;
      }
      toast.success(t('assignSuccess'));

      // Reload partner info
      const partnerRes = await fetch('/api/secret-santa');
      if (partnerRes.ok) {
        const data = await partnerRes.json();
        setPartner(data.partner);
      }
      await fetchPairings();
    } finally {
      setAssigning(false);
    }
  }

  async function confirmChangeReceiver() {
    if (!pendingChange) return;
    const { giverId, receiverId } = pendingChange;
    setPendingChange(null);
    setSavingId(giverId);
    try {
      const res = await fetch('/api/secret-santa/pairings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ giverId, receiverId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error === 'selfAssignment' ? t('pairings.selfAssignmentError') : t('pairings.updateError'));
        return;
      }
      toast.success(t('pairings.updateSuccess'));
      await fetchPairings();
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      {/* Current partner */}
      <div className="rounded-lg border p-6">
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
            onClick={() => setShowAssignConfirm(true)}
            disabled={assigning}
            style={{ background: 'var(--kn-primary, #005982)' }}
            className="text-white"
          >
            <Shuffle size={15} />
            {assigning ? '...' : t('assign')}
          </Button>
        </div>
      )}

      {/* Admin pairings table */}
      {isAdmin && (
        <div className="rounded-lg border p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-medium">{t('pairings.title')}</h2>
              <p className="text-sm text-muted-foreground">{t('pairings.description')}</p>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={reveal}
                onChange={(e) => setReveal(e.target.checked)}
              />
              <Eye size={15} />
              <span>{t('pairings.reveal')}</span>
            </label>
          </div>

          {pairings === null ? (
            <p className="text-sm text-muted-foreground">...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">{t('pairings.giver')}</th>
                    <th className="py-2 pr-4 font-medium">{t('pairings.receiver')}</th>
                    <th className="py-2 pr-4 font-medium">{t('pairings.changeAction')}</th>
                    <th className="py-2 font-medium">{t('pairings.warningsColumn')}</th>
                  </tr>
                </thead>
                <tbody>
                  {pairings.map((row) => {
                    const isDuplicate =
                      !!row.secretSantaPartner && (receivedCounts.get(row.secretSantaPartner.id) ?? 0) > 1;
                    const hasNoReceiver = (receivedCounts.get(row.id) ?? 0) === 0;
                    return (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">{row.nickname}</td>
                      <td className="py-2 pr-4">
                        <span>
                          {reveal
                            ? (row.secretSantaPartner ? row.secretSantaPartner.nickname : t('pairings.none'))
                            : t('pairings.hidden')}
                        </span>
                      </td>
                      <td className="py-2 pr-4">
                        <select
                          value=""
                          disabled={savingId === row.id}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (!val) return;
                            const isClear = val === 'clear';
                            const receiverNickname = isClear
                              ? ''
                              : pairings.find((m) => String(m.id) === val)?.nickname ?? '';
                            setPendingChange({
                              giverId: row.id,
                              giverNickname: row.nickname,
                              receiverId: isClear ? null : Number(val),
                              receiverNickname,
                              previousReceiverNickname: row.secretSantaPartner?.nickname ?? null,
                            });
                          }}
                          className="h-8 w-full max-w-[10rem] rounded-md border bg-white px-2 text-sm cursor-pointer"
                        >
                          <option value="">{t('pairings.changePlaceholder')}</option>
                          <option value="clear">{t('pairings.clearOption')}</option>
                          {pairings
                            .filter((m) => m.id !== row.id)
                            .map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.nickname}
                              </option>
                            ))}
                        </select>
                      </td>
                      <td className="py-2">
                        <div className="flex flex-col gap-1">
                          {isDuplicate && (
                            <span className="inline-flex items-center gap-1 text-xs text-destructive">
                              <AlertTriangle size={13} />
                              {t('pairings.warningDuplicate', {
                                name: reveal && row.secretSantaPartner ? row.secretSantaPartner.nickname : t('pairings.hidden'),
                              })}
                            </span>
                          )}
                          {hasNoReceiver && (
                            <span className="inline-flex items-center gap-1 text-xs text-destructive">
                              <AlertTriangle size={13} />
                              {t('pairings.warningNoReceiver')}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Draw confirmation modal */}
      {showAssignConfirm && (
        <Modal onClose={() => setShowAssignConfirm(false)} title={t('assign')}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">{t('assignConfirm')}</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowAssignConfirm(false)}>
                {tCommon('cancel')}
              </Button>
              <Button
                style={{ background: 'var(--kn-primary, #005982)' }}
                className="text-white"
                onClick={confirmAssign}
              >
                {tCommon('confirm')}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Pairing change confirmation modal */}
      {pendingChange && (
        <Modal onClose={() => setPendingChange(null)} title={t('pairings.confirmTitle')}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">{t('pairings.confirmQuestion')}</p>
            <div className="rounded-lg border bg-gray-50 px-4 py-3 text-sm space-y-2">
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">{t('pairings.giver')}</span>
                <span className="font-medium">{pendingChange.giverNickname}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">{t('pairings.previousReceiver')}</span>
                <span className="font-medium">{pendingChange.previousReceiverNickname ?? t('pairings.none')}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">{t('pairings.newReceiver')}</span>
                <span className="font-medium">{pendingChange.receiverNickname || t('pairings.none')}</span>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setPendingChange(null)}>
                {tCommon('cancel')}
              </Button>
              <Button
                style={{ background: 'var(--kn-primary, #005982)' }}
                className="text-white"
                onClick={confirmChangeReceiver}
              >
                {tCommon('confirm')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
