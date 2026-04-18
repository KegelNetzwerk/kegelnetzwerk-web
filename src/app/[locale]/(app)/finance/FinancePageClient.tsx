'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCw, CreditCard, ExternalLink, Heart } from 'lucide-react';
import TxTypeCell from '@/components/finance/TxTypeCell';

interface Transaction {
  id: number;
  memberId: number | null;
  type: string;
  amount: number;
  note: string;
  date: string;
  payoffEventId: number | null;
  sessionGroup: number | null;
  sessionDate: string | null;
}

interface ClubPaymentInfo {
  accountHolder: string;
  iban: string;
  bic: string;
  paypal: string;
}

interface Props {
  readonly memberId: number;
  readonly memberNickname: string;
  readonly isAdmin: boolean;
  readonly initialBalance: number;
  readonly initialKncBalance: number;
  readonly initialTransactions: Transaction[];
  readonly allMembers: { id: number; nickname: string }[];
  readonly clubPaymentInfo: ClubPaymentInfo;
}

function fmt(amount: number): string {
  return amount.toFixed(2).replace('.', ',') + ' €';
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}


export default function FinancePageClient({
  memberId,
  memberNickname,
  isAdmin,
  initialBalance,
  initialKncBalance,
  initialTransactions,
  allMembers,
  clubPaymentInfo,
}: Props) {
  const t = useTranslations('finance');

  const [viewMemberId, setViewMemberId] = useState(memberId);
  const [viewMemberName, setViewMemberName] = useState(memberNickname);
  const [balance, setBalance] = useState(initialBalance);
  const [kncBalance, setKncBalance] = useState(initialKncBalance);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterType, setFilterType] = useState('');
  const [loading, setLoading] = useState(false);
  const [donateOpen, setDonateOpen] = useState(false);
  const [donateAmount, setDonateAmount] = useState('');
  const [donating, setDonating] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (donateOpen) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [donateOpen]);

  const ALL_TX_TYPES = ['PENALTY', 'CLUB_FEE', 'PAYMENT_IN', 'PAYMENT_OUT', 'COLLECTIVE', 'REGULAR_INCOME', 'RESET', 'MANUAL', 'SESSION_PAYMENT', 'DONATION'];

  async function loadHistory(targetMemberId: number) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ memberId: String(targetMemberId) });
      if (filterFrom) params.set('from', filterFrom);
      if (filterTo) params.set('to', filterTo);
      if (filterType) params.set('type', filterType);

      const [txRes, balRes] = await Promise.all([
        fetch(`/api/finance/transactions?${params.toString()}`),
        fetch(`/api/finance/transactions?memberId=${targetMemberId}&page=1`),
      ]);

      if (!txRes.ok) throw new Error('Failed to load transactions');
      const data = await txRes.json() as { transactions: Transaction[] };
      setTransactions(data.transactions);

      // Recompute balance from the server filtered result
      if (balRes.ok) {
        const allData = await balRes.json() as { transactions: Transaction[] };
        const total = allData.transactions.reduce((s, tx) => s + tx.amount, 0);
        setBalance(Math.round(total * 100) / 100);
      }
    } catch {
      toast.error(t('log.loadError'));
    } finally {
      setLoading(false);
    }
  }

  async function handleMemberChange(id: number, nickname: string) {
    setViewMemberId(id);
    setViewMemberName(nickname);
    setLoading(true);
    try {
      const res = await fetch(`/api/finance/transactions?memberId=${id}`);
      if (!res.ok) throw new Error('Failed to load member history');
      const data = await res.json() as { transactions: Transaction[] };
      setTransactions(data.transactions);
      const total = data.transactions.reduce((s, tx) => s + tx.amount, 0);
      setBalance(Math.round(total * 100) / 100);
    } catch {
      toast.error(t('log.loadError'));
    } finally {
      setLoading(false);
    }
  }

  async function handleDonate() {
    const amt = Number.parseFloat(donateAmount.replace(',', '.'));
    if (Number.isNaN(amt) || amt <= 0) {
      toast.error(t('donate.invalidAmount'));
      return;
    }
    setDonating(true);
    try {
      const res = await fetch('/api/finance/donate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt }),
      });
      if (!res.ok) throw new Error('Donation request failed');
      const data = await res.json() as { kncBalance: number; euroBalance: number };
      setKncBalance(data.kncBalance);
      setBalance(data.euroBalance);
      setDonateOpen(false);
      setDonateAmount('');
      toast.success(t('donate.success', { knc: Math.round(amt * 100) }));
      // Refresh transaction list to show the new DONATION entry
      await loadHistory(viewMemberId);
    } catch {
      toast.error(t('donate.error'));
    } finally {
      setDonating(false);
    }
  }

  const filtered = transactions.filter((tx) => {
    if (filterType && tx.type !== filterType) return false;
    if (filterFrom && tx.date < filterFrom) return false;
    if (filterTo && tx.date > filterTo + 'T23:59:59') return false;
    return true;
  });

  let balanceColor: string;
  let balanceBorderColor: string;
  let balanceLabel: string;
  if (balance > 0) {
    balanceColor = 'text-green-700';
    balanceBorderColor = '#15803d';
    balanceLabel = t('balance.inCredit');
  } else if (balance < 0) {
    balanceColor = 'text-red-700';
    balanceBorderColor = '#b91c1c';
    balanceLabel = t('balance.owes');
  } else {
    balanceColor = 'text-gray-500';
    balanceBorderColor = 'var(--kn-primary,#005982)';
    balanceLabel = t('balance.zero');
  }

  const hasPaymentInfo = clubPaymentInfo.iban || clubPaymentInfo.paypal;

  // Build PayPal.me URL: if user entered a handle/URL, normalize it
  const paypalUrl = clubPaymentInfo.paypal
    ? clubPaymentInfo.paypal.startsWith('http')
      ? clubPaymentInfo.paypal
      : `https://paypal.me/${clubPaymentInfo.paypal.replace(/^@/, '')}`
    : '';

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">{t('memberTitle')}</h1>

        {/* Admin member switcher */}
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Label htmlFor="view-member" className="text-sm shrink-0">{t('log.viewingMember')}</Label>
            <select
              id="view-member"
              className="rounded border border-gray-300 px-3 py-2 text-sm bg-white"
              value={viewMemberId}
              onChange={(e) => {
                const id = Number.parseInt(e.target.value);
                const m = allMembers.find((x) => x.id === id);
                if (m) handleMemberChange(m.id, m.nickname);
              }}
            >
              {allMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.nickname}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Balance section: Euro (left) | separator (centered) | button + KNC (right) */}
      <div className="flex flex-wrap items-start gap-y-4 w-full">

        {/* Left group: Euro balance card + payment info */}
        <div className="flex flex-wrap gap-4 items-start">
          {/* Balance card */}
          <div className="rounded-xl border-2 p-6 text-center min-w-[200px]" style={{ borderColor: balanceBorderColor }}>
            <div className="text-sm text-gray-500 mb-1">{t('balance.label')}</div>
            <div className={`text-4xl font-extrabold tabular-nums ${balanceColor}`}>
              {balance > 0 ? '+' : ''}{fmt(balance)}
            </div>
            <div className="text-sm text-gray-400 mt-1">{balanceLabel}</div>
          </div>

          {/* Payment info (shown when balance is negative and info is configured) */}
          {balance < 0 && hasPaymentInfo && (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-1.5 font-semibold text-gray-700 mb-1">
                <CreditCard size={15} />
                <span>{t('paymentInfo.title')}</span>
              </div>
              {clubPaymentInfo.accountHolder && (
                <div>
                  <span className="text-gray-400 text-xs">{t('paymentInfo.accountHolder')}: </span>
                  <span className="font-medium">{clubPaymentInfo.accountHolder}</span>
                </div>
              )}
              {clubPaymentInfo.iban && (
                <div>
                  <span className="text-gray-400 text-xs">IBAN: </span>
                  <span className="font-mono font-medium tracking-wide">{clubPaymentInfo.iban}</span>
                </div>
              )}
              {clubPaymentInfo.bic && (
                <div>
                  <span className="text-gray-400 text-xs">BIC: </span>
                  <span className="font-mono font-medium">{clubPaymentInfo.bic}</span>
                </div>
              )}
              {paypalUrl && (
                <a
                  href={`${paypalUrl}/${Math.abs(balance).toFixed(2)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 flex items-center gap-1.5 rounded-lg px-3 py-2 text-white text-xs font-semibold"
                  style={{ background: '#003087' }}
                >
                  <ExternalLink size={12} />
                  {t('paymentInfo.payNowPaypal', { amount: fmt(Math.abs(balance)) })}
                </a>
              )}
            </div>
          )}
        </div>

        {/* Centered separator + right-aligned KNC group — only for own account */}
        {viewMemberId === memberId && (
          <>
            {/* Separator expands to fill remaining space and centers the line */}
            <div className="hidden sm:flex flex-1 self-stretch justify-center items-stretch min-w-[48px]">
              <div className="w-px bg-gray-200" />
            </div>

            {/* Right group: description+button (left, bottom-aligned) + KNC card (right) */}
            <div className="flex items-end gap-3">
              <div className="flex flex-col justify-end gap-2">
                <p className="text-sm text-gray-500 max-w-[220px]">{t('knc.description')}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDonateOpen(true)}
                  className="gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50"
                >
                  <Heart size={13} />
                  {t('knc.donateButton')}
                </Button>
              </div>
              <div className="rounded-xl border-2 p-6 text-center min-w-[200px]" style={{ borderColor: '#d97706' }}>
                <div className="text-sm text-gray-500 mb-1">{t('knc.label')}</div>
                <div className="text-4xl font-extrabold tabular-nums text-amber-700">
                  {kncBalance.toFixed(0)} <span className="text-2xl">KNC</span>
                </div>
                <div className="text-sm text-gray-400 mt-1">{t('knc.subLabel')}</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label htmlFor="mf-type">{t('log.type')}</Label>
          <select
            id="mf-type"
            className="rounded border border-gray-300 px-3 py-2 text-sm bg-white"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">{t('log.allTypes')}</option>
            {ALL_TX_TYPES.map((type) => (
              <option key={type} value={type}>{t(`txType.${type}`)}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="mf-from">{t('log.from')}</Label>
          <Input
            id="mf-from"
            type="date"
            value={filterFrom}
            onChange={(e) => setFilterFrom(e.target.value)}
            className="bg-white"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="mf-to">{t('log.to')}</Label>
          <Input
            id="mf-to"
            type="date"
            value={filterTo}
            onChange={(e) => setFilterTo(e.target.value)}
            className="bg-white"
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => loadHistory(viewMemberId)}
          disabled={loading}
          className="gap-1"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          {t('log.refresh')}
        </Button>
      </div>

      {/* Transaction table */}
      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400 italic py-4">{t('log.empty')}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                <th className="px-4 py-3">{t('log.date')}</th>
                <th className="px-4 py-3">{t('log.type')}</th>
                <th className="px-4 py-3 text-right">{t('payment.amount')}</th>
                <th className="px-4 py-3">{t('payment.note')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tx) => (
                <tr key={tx.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{fmtDate(tx.date)}</td>
                  <TxTypeCell type={tx.type} sessionDate={tx.sessionDate} />
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    <span className={tx.amount >= 0 ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>
                      {tx.amount >= 0 ? '+' : ''}{fmt(tx.amount)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {tx.note}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* Donate dialog — native <dialog> for full accessibility (Escape key, focus trap, backdrop) */}
      <dialog
        ref={dialogRef}
        className="rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4 backdrop:bg-black/40 m-auto"
        onClose={() => { setDonateOpen(false); setDonateAmount(''); }}
        aria-labelledby="donate-dialog-title"
      >
        <h2 id="donate-dialog-title" className="text-lg font-semibold">{t('donate.title')}</h2>
        <div className="space-y-1">
          <Label htmlFor="donate-amount">{t('donate.amountLabel')}</Label>
          <Input
            id="donate-amount"
            type="number"
            step="0.01"
            min="0.01"
            placeholder={t('donate.amountPlaceholder')}
            value={donateAmount}
            onChange={(e) => setDonateAmount(e.target.value)}
            className="bg-white"
            autoFocus
          />
          <p className="text-xs text-amber-600 font-medium pt-0.5">{t('donate.exchangeRate')}</p>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => setDonateOpen(false)} disabled={donating}>
            {t('donate.cancel')}
          </Button>
          <Button onClick={handleDonate} disabled={donating} className="bg-amber-600 hover:bg-amber-700 text-white">
            <Heart size={13} className="mr-1.5" />
            {t('donate.confirm')}
          </Button>
        </div>
      </dialog>
    </div>
  );
}
