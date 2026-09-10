'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import Modal from '@/components/admin/AdminModal';
import { toast } from 'sonner';
import Image from 'next/image';
import { Shuffle, Eye, EyeOff, AlertTriangle, Info, ToggleLeft, ToggleRight, ChevronDown, ChevronRight } from 'lucide-react';

interface Partner {
  id: number;
  nickname: string;
  pic: string;
}

interface HistoryEntry {
  year: number;
  receiverNickname: string | null;
  receiverPic: string | null;
}

interface PairingRow {
  id: number;
  nickname: string;
  pic: string;
  isInactive: boolean;
  secretSantaPartner: Partner | null;
  history: HistoryEntry[];
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
  const [savingId, setSavingId] = useState<number | null>(null);
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [revealedCurrentIds, setRevealedCurrentIds] = useState<Set<number>>(new Set());
  const [revealedHistoryIds, setRevealedHistoryIds] = useState<Set<number>>(new Set());
  const currentYear = new Date().getFullYear();

  const receivedCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const row of pairings ?? []) {
      if (row.secretSantaPartner) {
        counts.set(row.secretSantaPartner.id, (counts.get(row.secretSantaPartner.id) ?? 0) + 1);
      }
    }
    return counts;
  }, [pairings]);

  const inactiveMembers = useMemo(() => (pairings ?? []).filter((row) => row.isInactive), [pairings]);

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
        const message =
          data.error === 'selfAssignment'
            ? t('pairings.selfAssignmentError')
            : data.error === 'inactiveReceiver'
              ? t('pairings.inactiveReceiverError')
              : t('pairings.updateError');
        toast.error(message);
        return;
      }
      toast.success(t('pairings.updateSuccess'));
      await fetchPairings();
    } finally {
      setSavingId(null);
    }
  }

  function toggleSetMember(set: Set<number>, id: number): Set<number> {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  }

  function toggleExpand(id: number) {
    setExpandedIds((prev) => toggleSetMember(prev, id));
  }

  function toggleRevealCurrent(id: number) {
    setRevealedCurrentIds((prev) => toggleSetMember(prev, id));
  }

  function toggleRevealHistory(id: number) {
    setRevealedHistoryIds((prev) => toggleSetMember(prev, id));
  }

  async function toggleInactive(row: PairingRow) {
    const next = !row.isInactive;
    try {
      const res = await fetch(`/api/finance/members/${row.id}/inactive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isInactive: next }),
      });
      if (!res.ok) throw new Error('Request failed');
      setPairings((prev) => prev?.map((m) => (m.id === row.id ? { ...m, isInactive: next } : m)) ?? prev);
      toast.success(t('pairings.inactiveToggled'));
    } catch {
      toast.error(t('pairings.inactiveError'));
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
          <div>
            <h2 className="text-sm font-medium">{t('pairings.title')}</h2>
            <p className="text-sm text-muted-foreground">{t('pairings.description')}</p>
            <p className="text-sm text-muted-foreground">{t('pairings.inactiveHint')}</p>
          </div>

          {pairings === null ? (
            <p className="text-sm text-muted-foreground">...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-2 font-medium sr-only">{t('pairings.historyTitle')}</th>
                    <th className="py-2 pr-4 font-medium">{t('pairings.giver')}</th>
                    <th className="py-2 pr-4 font-medium">{t('pairings.statusColumn')}</th>
                    <th className="py-2 pr-4 font-medium">{t('pairings.receiver')}</th>
                    <th className="py-2 pr-4 font-medium">{t('pairings.changeAction')}</th>
                    <th className="py-2 pr-4 font-medium">{t('pairings.warningsColumn')}</th>
                    <th className="py-2 font-medium">{t('pairings.revealColumn')}</th>
                  </tr>
                </thead>
                <tbody>
                  {pairings.map((row) => {
                    const isDuplicate =
                      !!row.secretSantaPartner && (receivedCounts.get(row.secretSantaPartner.id) ?? 0) > 1;
                    const hasNoReceiver = (receivedCounts.get(row.id) ?? 0) === 0;
                    const isExpanded = expandedIds.has(row.id);
                    return (
                    <Fragment key={row.id}>
                    <tr className="border-b last:border-0">
                      <td className="py-2 pr-2">
                        <button
                          type="button"
                          onClick={() => toggleExpand(row.id)}
                          className="cursor-pointer text-muted-foreground"
                          aria-label={t('pairings.historyTitle')}
                          aria-expanded={isExpanded}
                        >
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                      </td>
                      <td className="py-2 pr-4">{row.nickname}</td>
                      <td className="py-2 pr-4">
                        <button
                          type="button"
                          onClick={() => toggleInactive(row)}
                          className="flex items-center gap-2 cursor-pointer"
                          aria-label={row.nickname}
                        >
                          {row.isInactive
                            ? <ToggleLeft size={20} className="text-gray-400" />
                            : <ToggleRight size={20} style={{ color: 'var(--kn-primary, #005982)' }} />}
                          <span className="text-xs text-muted-foreground">
                            {row.isInactive ? t('pairings.inactiveLabel') : t('pairings.activeLabel')}
                          </span>
                        </button>
                      </td>
                      <td className="py-2 pr-4">
                        <span>
                          {revealedCurrentIds.has(row.id)
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
                            .filter((m) => m.id !== row.id && !m.isInactive)
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
                                name: revealedCurrentIds.has(row.id) && row.secretSantaPartner
                                  ? row.secretSantaPartner.nickname
                                  : t('pairings.hidden'),
                              })}
                            </span>
                          )}
                          {hasNoReceiver && (
                            row.isInactive ? (
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <Info size={13} />
                                {t('pairings.inactiveInfo')}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-destructive">
                                <AlertTriangle size={13} />
                                {t('pairings.warningNoReceiver')}
                              </span>
                            )
                          )}
                        </div>
                      </td>
                      <td className="py-2">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => toggleRevealCurrent(row.id)}
                            className="cursor-pointer inline-flex items-center gap-1 text-xs text-muted-foreground"
                            aria-pressed={revealedCurrentIds.has(row.id)}
                          >
                            {revealedCurrentIds.has(row.id) ? <EyeOff size={14} /> : <Eye size={14} />}
                            <span>{t('pairings.revealCurrent')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleRevealHistory(row.id)}
                            className="cursor-pointer inline-flex items-center gap-1 text-xs text-muted-foreground"
                            aria-pressed={revealedHistoryIds.has(row.id)}
                          >
                            {revealedHistoryIds.has(row.id) ? <EyeOff size={14} /> : <Eye size={14} />}
                            <span>{t('pairings.revealHistory')}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-b last:border-0 bg-muted/30">
                        <td colSpan={7} className="py-3 px-4">
                          <p className="text-xs font-medium text-muted-foreground mb-2">{t('pairings.historyTitle')}</p>
                          {row.history.length === 0 ? (
                            <p className="text-xs text-muted-foreground">{t('pairings.historyEmpty')}</p>
                          ) : (
                            <ul className="space-y-1 text-sm max-w-xs">
                              {row.history.map((h) => {
                                const isCurrentYear = h.year === currentYear;
                                const isRevealed = isCurrentYear
                                  ? revealedHistoryIds.has(row.id) && revealedCurrentIds.has(row.id)
                                  : revealedHistoryIds.has(row.id);
                                return (
                                  <li key={h.year} className="flex justify-between gap-4">
                                    <span className="text-gray-500">{h.year}</span>
                                    <span className="font-medium">
                                      {isRevealed ? (h.receiverNickname ?? t('pairings.none')) : t('pairings.hidden')}
                                    </span>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </td>
                      </tr>
                    )}
                    </Fragment>
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
            {inactiveMembers.length > 0 && (
              <div className="rounded-lg border bg-gray-50 px-4 py-3 text-sm space-y-2">
                <p className="text-gray-500">{t('pairings.excludedMembersLabel')}</p>
                <ul className="space-y-1">
                  {inactiveMembers.map((m) => (
                    <li key={m.id} className="font-medium">{m.nickname}</li>
                  ))}
                </ul>
              </div>
            )}
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
