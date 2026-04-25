'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import { AlertTriangle, Minus, Plus, RotateCcw, X } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MemberRow {
  id: number;
  nickname: string;
  pic: string;
  isInactive: boolean;
  kncBalance: number;
}

interface Props {
  members: MemberRow[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function KncBalance({ balance }: { readonly balance: number }) {
  return (
    <span className="text-sm font-semibold tabular-nums text-gray-800">
      {Math.round(balance)} <span className="font-bold text-yellow-400">K</span>
    </span>
  );
}

function Avatar({ pic, nickname }: { readonly pic: string; readonly nickname: string }) {
  if (pic && pic !== 'none') {
    return (
      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border">
        <Image src={pic} alt={nickname} fill className="object-cover" />
      </div>
    );
  }
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-muted text-sm font-semibold text-muted-foreground">
      {nickname.charAt(0).toUpperCase()}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function KncAdminClient({ members: initialMembers }: Props) {
  const t = useTranslations('kncAdmin');
  const [members, setMembers] = useState(initialMembers);
  const [amount, setAmount] = useState(100);
  const [showResetAll, setShowResetAll] = useState(false);
  const [resetInput, setResetInput] = useState('');
  const [loading, setLoading] = useState<number | 'all' | null>(null);

  async function adjust(memberId: number, delta: number) {
    setLoading(memberId);
    try {
      const res = await fetch('/api/knc/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, delta }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json() as { id: number; kncBalance: number };
      setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, kncBalance: data.kncBalance } : m));
      toast.success(t('success.adjust'));
    } catch {
      toast.error(t('error.adjust'));
    } finally {
      setLoading(null);
    }
  }

  async function adjustAll(delta: number) {
    setLoading('all');
    try {
      const res = await fetch('/api/knc/adjust-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json() as { id: number; kncBalance: number }[];
      const map = new Map(data.map((r) => [r.id, r.kncBalance]));
      setMembers((prev) => prev.map((m) => ({ ...m, kncBalance: map.get(m.id) ?? m.kncBalance })));
      toast.success(t('success.adjust'));
    } catch {
      toast.error(t('error.adjust'));
    } finally {
      setLoading(null);
    }
  }

  async function resetOne(memberId: number) {
    setLoading(memberId);
    try {
      const res = await fetch('/api/knc/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      });
      if (!res.ok) throw new Error();
      setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, kncBalance: 0 } : m));
      toast.success(t('success.reset'));
    } catch {
      toast.error(t('error.reset'));
    } finally {
      setLoading(null);
    }
  }

  async function resetAll() {
    setLoading('all');
    try {
      const res = await fetch('/api/knc/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error();
      toast.success(t('success.resetAll'));
      globalThis.location.reload();
    } catch {
      toast.error(t('error.reset'));
      setLoading(null);
    }
    setShowResetAll(false);
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => { setResetInput(''); setShowResetAll(true); }}
        >
          <RotateCcw size={14} className="mr-1.5" />
          {t('resetAll')}
        </Button>
      </div>

      {/* Amount control + global buttons */}
      <div className="flex items-center gap-3 flex-wrap">
        <Label htmlFor="knc-amount" className="shrink-0 font-medium">{t('amount')}</Label>
        <Input
          id="knc-amount"
          type="number"
          min={1}
          value={amount}
          onChange={(e) => setAmount(Math.max(1, Number(e.target.value) || 1))}
          className="w-28 bg-white"
        />
        <button
          type="button"
          disabled={loading === 'all'}
          onClick={() => adjustAll(amount)}
          title={`+${amount} ${t('forAll')}`}
          className="flex items-center gap-1.5 rounded border border-green-200 bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-40 cursor-pointer transition-colors"
        >
          <Plus size={14} />
          {t('forAll')}
        </button>
        <button
          type="button"
          disabled={loading === 'all'}
          onClick={() => adjustAll(-amount)}
          title={`-${amount} ${t('forAll')}`}
          className="flex items-center gap-1.5 rounded border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-40 cursor-pointer transition-colors"
        >
          <Minus size={14} />
          {t('forAll')}
        </button>
      </div>

      {/* Member table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
              <th className="px-4 py-3">{t('colMember')}</th>
              <th className="px-4 py-3 text-right">{t('colBalance')}</th>
              <th className="px-4 py-3 text-right">{t('colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <Avatar pic={m.pic} nickname={m.nickname} />
                    <span className={`text-sm font-medium truncate ${m.isInactive ? 'text-muted-foreground line-through' : ''}`}>
                      {m.nickname}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <KncBalance balance={m.kncBalance} />
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      disabled={loading === m.id}
                      onClick={() => adjust(m.id, amount)}
                      title={`+${amount}`}
                      className="flex h-8 w-8 items-center justify-center rounded border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-40 cursor-pointer transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={loading === m.id}
                      onClick={() => adjust(m.id, -amount)}
                      title={`-${amount}`}
                      className="flex h-8 w-8 items-center justify-center rounded border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-40 cursor-pointer transition-colors"
                    >
                      <Minus size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={loading === m.id}
                      onClick={() => resetOne(m.id)}
                      title={t('resetOne')}
                      className="flex h-8 w-8 items-center justify-center rounded border border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100 disabled:opacity-40 cursor-pointer transition-colors"
                    >
                      <RotateCcw size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reset All modal */}
      {showResetAll && (
        <Modal onClose={() => setShowResetAll(false)} title={t('resetAll')}>
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{t('confirmAll')}</span>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reset-confirm">{t('typeToConfirm')}</Label>
            <Input
              id="reset-confirm"
              value={resetInput}
              onChange={(e) => setResetInput(e.target.value)}
              className="bg-white"
              autoComplete="off"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowResetAll(false)}>
              {t('cancel')}
            </Button>
            <Button
              variant="destructive"
              disabled={resetInput !== 'reset all' || loading === 'all'}
              onClick={resetAll}
            >
              {t('resetAll')}
            </Button>
          </div>
        </Modal>
      )}

    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({ children, title, onClose }: { readonly children: React.ReactNode; readonly title: string; readonly onClose: () => void }) {
  return createPortal(
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className="w-full max-w-md rounded-xl bg-white shadow-xl p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
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
