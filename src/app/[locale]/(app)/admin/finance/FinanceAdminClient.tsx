'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import TxTypeCell from '@/components/finance/TxTypeCell';
import {
  AlertTriangle, Calendar, CalendarCheck, Check, ChevronDown, ChevronUp, Plus, RefreshCw,
  Trash2, Wallet, Users, BarChart3, ListFilter, RotateCcw, X,
  Euro, TrendingUp, TrendingDown, ToggleLeft, ToggleRight, Info, CreditCard,
  FileText, Copy, Landmark,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FinanceSettings {
  feeAmount: number;
  feeFrequency: string;
  guestFeeAmount: number;
  autoPayoffEnabled: boolean;
  autoPayoffFrequency: string;
  autoPayoffDayOfMonth: number;
  lastPayoffAt: string | null;
}

interface GuestSummary {
  id: number;
  nickname: string;
  balance: number;
}

interface MemberSummary {
  id: number;
  nickname: string;
  pic: string;
  balance: number;
  isInactive: boolean;
}

interface AssignmentRow {
  id: number;
  memberId: number;
  amount: number;
  excluded: boolean;
  paidAt: string | null;
  member: { id: number; nickname: string };
}

interface CollectiveCharge {
  id: number;
  name: string;
  defaultAmount: number;
  note: string;
  closed: boolean;
  createdAt: string;
  assignments: AssignmentRow[];
}

interface RegularPayment {
  id: number;
  memberId: number;
  amount: number;
  frequency: string;
  note: string;
  active: boolean;
  member: { id: number; nickname: string };
}

interface Transaction {
  id: number;
  memberId: number | null;
  guestId: number | null;
  type: string;
  amount: number;
  note: string;
  date: string;
  payoffEventId: number | null;
  sessionGroup: number | null;
  sessionDate: string | null;
  member: { id: number; nickname: string } | null;
  guest: { id: number; nickname: string } | null;
}

interface ClubPaymentInfo {
  accountHolder: string;
  iban: string;
  bic: string;
  paypal: string;
}

interface MoneySourceLog {
  id: number;
  moneySourceId: number;
  value: number;
  createdAt: string;
}

interface MoneySource {
  id: number;
  name: string;
  value: number;
  createdAt: string;
  log: MoneySourceLog[];
}

interface Props {
  readonly settings: FinanceSettings;
  readonly members: MemberSummary[];
  readonly guests: GuestSummary[];
  readonly collectives: CollectiveCharge[];
  readonly regularPayments: RegularPayment[];
  readonly recentTransactions: Transaction[];
  readonly payoffDue: boolean;
  readonly clubPaymentInfo: ClubPaymentInfo;
  readonly moneySources: MoneySource[];
  readonly clubPurchaseTotal: number;
}

const FREQUENCIES = ['NONE', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'PER_SESSION'] as const;
const FREQ_NO_NONE = ['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'] as const;
const TX_TYPES = ['PAYMENT_IN', 'PAYMENT_OUT', 'MANUAL', 'CLUB_PURCHASE'] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(amount: number): string {
  return amount.toFixed(2).replace('.', ',') + ' €';
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function AvatarImg({ pic, nickname }: { readonly pic?: string; readonly nickname: string }) {
  const hasPic = pic && pic !== 'none';
  return (
    <div className="shrink-0 w-7 h-7 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center text-gray-500 text-xs font-semibold select-none">
      {hasPic
        ? <img src={pic} alt={nickname} className="w-full h-full object-cover" />
        : <span>{nickname.charAt(0).toUpperCase()}</span>}
    </div>
  );
}

function BalanceBadge({ balance }: { readonly balance: number }) {
  let color: string;
  if (balance > 0) {
    color = 'text-green-700 bg-green-50';
  } else if (balance < 0) {
    color = 'text-red-700 bg-red-50';
  } else {
    color = 'text-gray-500 bg-gray-100';
  }
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold tabular-nums ${color}`}>
      {balance > 0 ? '+' : ''}{fmt(balance)}
    </span>
  );
}

function TxTypeBadge({ type, t }: { readonly type: string; readonly t: (k: string, v?: Record<string, string | number | Date>) => string }) {
  const colors: Record<string, string> = {
    PENALTY: 'bg-red-100 text-red-700',
    CLUB_FEE: 'bg-orange-100 text-orange-700',
    PAYMENT_IN: 'bg-green-100 text-green-700',
    PAYMENT_OUT: 'bg-red-100 text-red-700',
    CLUB_PURCHASE: 'bg-gray-100 text-gray-600',
    COLLECTIVE: 'bg-blue-100 text-blue-700',
    SESSION_PAYMENT: 'bg-cyan-100 text-cyan-700',
    REGULAR_INCOME: 'bg-teal-100 text-teal-700',
    RESET: 'bg-purple-100 text-purple-700',
    MANUAL: 'bg-yellow-100 text-yellow-700',
  };
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${colors[type] ?? 'bg-gray-100 text-gray-600'}`}>
      {t(`txType.${type}`)}
    </span>
  );
}

function buildDemandText(
  t: (k: string) => string,
  debtMembers: { nickname: string; balance: number }[],
  debtGuests: { nickname: string; balance: number }[],
  paypalBase: string,
): string {
  const today = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const lines: string[] = [];
  lines.push(`${t('demand.title')} — ${today}`);
  lines.push('');
  if (debtMembers.length > 0) {
    lines.push(t('demand.membersHeader'));
    for (const m of debtMembers) {
      const displayAmt = Math.abs(m.balance).toFixed(2).replace('.', ',');
      let line = `• ${m.nickname}: ${displayAmt}€`;
      if (paypalBase) line += `  →  ${paypalBase}/${Math.abs(m.balance).toFixed(2)}`;
      lines.push(line);
    }
  }
  if (debtGuests.length > 0) {
    if (debtMembers.length > 0) lines.push('');
    lines.push(t('demand.guestsHeader'));
    for (const g of debtGuests) {
      const displayAmt = Math.abs(g.balance).toFixed(2).replace('.', ',');
      let line = `• ${g.nickname}: ${displayAmt}€`;
      if (paypalBase) line += `  →  ${paypalBase}/${Math.abs(g.balance).toFixed(2)}`;
      lines.push(line);
    }
  }
  return lines.join('\n');
}

// ─── Main component ───────────────────────────────────────────────────────────

type Tab = 'overview' | 'settings' | 'collectives' | 'log' | 'payment-info' | 'sources';

export default function FinanceAdminClient({
  settings: initialSettings,
  members: initialMembers,
  guests,
  collectives: initialCollectives,
  regularPayments: initialRegularPayments,
  recentTransactions: initialTx,
  payoffDue,
  clubPaymentInfo: initialPaymentInfo,
  moneySources: initialMoneySources,
  clubPurchaseTotal: initialCpTotal,
}: Props) {
  const t = useTranslations('finance');
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [settings, setSettings] = useState(initialSettings);
  const [members, setMembers] = useState(initialMembers);
  const [collectives, setCollectives] = useState(initialCollectives);
  const [regularPayments, setRegularPayments] = useState(initialRegularPayments);
  const [transactions, setTransactions] = useState(initialTx);
  const [paymentInfo, setPaymentInfo] = useState(initialPaymentInfo);
  const [moneySources, setMoneySources] = useState(initialMoneySources);
  const [cpTotal, setCpTotal] = useState(initialCpTotal);
  const [memberBalances, setMemberBalances] = useState<Map<number, number>>(
    new Map(initialMembers.map((m) => [m.id, m.balance]))
  );

  function getBalance(memberId: number) {
    return Math.round((memberBalances.get(memberId) ?? 0) * 100) / 100;
  }

  function applyTxToBalance(memberId: number, amount: number) {
    setMemberBalances((prev) => {
      const next = new Map(prev);
      next.set(memberId, Math.round(((next.get(memberId) ?? 0) + amount) * 100) / 100);
      return next;
    });
  }

  function applyClubPurchaseTx(amount: number) {
    setCpTotal((prev) => Math.round((prev + amount) * 100) / 100);
  }

  const membersTotalCredit = members.filter((m) => getBalance(m.id) > 0).reduce((s, m) => s + getBalance(m.id), 0);
  const totalCredit = Math.round((membersTotalCredit + cpTotal) * 100) / 100;

  const tabItems: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: t('tabs.overview'), icon: <Wallet size={15} /> },
    { id: 'settings', label: t('tabs.settings'), icon: <BarChart3 size={15} /> },
    { id: 'collectives', label: t('tabs.collectives'), icon: <Users size={15} /> },
    { id: 'log', label: t('tabs.log'), icon: <ListFilter size={15} /> },
    { id: 'payment-info', label: t('tabs.paymentInfo'), icon: <CreditCard size={15} /> },
    { id: 'sources', label: t('tabs.sources'), icon: <Landmark size={15} /> },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('adminTitle')}</h1>

      {/* Tab bar */}
      <div className="flex border-b border-gray-200">
        {tabItems.map(({ id, label, icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            title={label}
            className={`flex flex-1 sm:flex-none items-center justify-center sm:justify-start gap-1.5 px-2 sm:px-4 py-2 text-sm font-medium border-b-2 cursor-pointer transition-colors ${
              activeTab === id
                ? 'border-[var(--kn-primary,#005982)] text-[var(--kn-primary,#005982)]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {icon}
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <OverviewTab
          t={t}
          members={members}
          guests={guests}
          getBalance={getBalance}
          applyTxToBalance={applyTxToBalance}
          applyClubPurchaseTx={applyClubPurchaseTx}
          transactions={transactions}
          setTransactions={setTransactions}
          payoffDue={payoffDue}
          settings={settings}
          paymentInfo={paymentInfo}
          totalCredit={totalCredit}
        />
      )}
      {activeTab === 'settings' && (
        <SettingsTab
          t={t}
          settings={settings}
          setSettings={setSettings}
          members={members}
          regularPayments={regularPayments}
          setRegularPayments={setRegularPayments}
          onToggleInactive={(id, val) =>
            setMembers((prev) => prev.map((m) => m.id === id ? { ...m, isInactive: val } : m))
          }
        />
      )}
      {activeTab === 'collectives' && (
        <CollectivesTab
          t={t}
          members={members}
          collectives={collectives}
          setCollectives={setCollectives}
          applyTxToBalance={applyTxToBalance}
          transactions={transactions}
          setTransactions={setTransactions}
        />
      )}
      {activeTab === 'log' && (
        <LogTab
          t={t}
          members={members}
          guests={guests}
          transactions={transactions}
          setTransactions={setTransactions}
        />
      )}
      {activeTab === 'payment-info' && (
        <PaymentInfoTab
          t={t}
          paymentInfo={paymentInfo}
          setPaymentInfo={setPaymentInfo}
        />
      )}
      {activeTab === 'sources' && (
        <SourcesTab
          t={t}
          moneySources={moneySources}
          setMoneySources={setMoneySources}
          totalCredit={totalCredit}
        />
      )}
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({
  t, members, guests, getBalance, applyTxToBalance, applyClubPurchaseTx,
  transactions, setTransactions, payoffDue, settings, paymentInfo, totalCredit,
}: {
  readonly t: (k: string, v?: Record<string, string | number | Date>) => string;
  readonly members: MemberSummary[];
  readonly guests: GuestSummary[];
  readonly getBalance: (id: number) => number;
  readonly applyTxToBalance: (id: number, amount: number) => void;
  readonly applyClubPurchaseTx: (amount: number) => void;
  readonly transactions: Transaction[];
  readonly setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  readonly payoffDue: boolean;
  readonly settings: FinanceSettings;
  readonly paymentInfo: ClubPaymentInfo;
  readonly totalCredit: number;
}) {
  const [payoffLoading, setPayoffLoading] = useState(false);
  const [showPayoffConfirm, setShowPayoffConfirm] = useState(false);
  const [showAccountedUntil, setShowAccountedUntil] = useState(false);
  const [accountedUntilDate, setAccountedUntilDate] = useState('');
  const [accountedUntilLoading, setAccountedUntilLoading] = useState(false);
  const [resetConfirm, setResetConfirm] = useState<'all' | number | null>(null);
  const [resetAllInput, setResetAllInput] = useState('');
  const [addPaymentFor, setAddPaymentFor] = useState<number | null>(null); // memberId
  const [bulkModal, setBulkModal] = useState(false);
  const [showDemand, setShowDemand] = useState(false);
  const [demandCopied, setDemandCopied] = useState(false);
  const [showSessionPayment, setShowSessionPayment] = useState(false);

  // Club purchase modal state
  const [showClubPurchase, setShowClubPurchase] = useState(false);
  const [cpMode, setCpMode] = useState<'in' | 'out' | 'set'>('out');
  const [cpAmount, setCpAmount] = useState('');
  const [cpNote, setCpNote] = useState('');
  const [cpTargetBalance, setCpTargetBalance] = useState('');

  // Quick payment modal state
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');
  const [payType, setPayType] = useState<'PAYMENT_IN' | 'PAYMENT_OUT'>('PAYMENT_IN');

  // Bulk modal state
  const [bulkType, setBulkType] = useState<'PAYMENT_IN' | 'PAYMENT_OUT'>('PAYMENT_IN');
  const [bulkAmount, setBulkAmount] = useState('');
  const [bulkNote, setBulkNote] = useState('');
  const [excludedIds, setExcludedIds] = useState<Set<number>>(new Set());

  const totalDebt = members.filter((m) => getBalance(m.id) < 0).reduce((s, m) => s + getBalance(m.id), 0);

  const debtMembers = members
    .map((m) => ({ nickname: m.nickname, balance: getBalance(m.id) }))
    .filter((m) => m.balance < 0)
    .sort((a, b) => a.nickname.localeCompare(b.nickname));
  const debtGuests = guests
    .filter((g) => g.balance < 0)
    .sort((a, b) => a.nickname.localeCompare(b.nickname));
  const rawPaypal = paymentInfo.paypal.trim();
  const paypalBase = rawPaypal
    ? rawPaypal.startsWith('http')
      ? rawPaypal.replace(/\/$/, '')
      : `https://paypal.me/${rawPaypal.replace(/^paypal\.me\//, '')}`
    : '';
  const demandText = buildDemandText(t, debtMembers, debtGuests, paypalBase);

  async function triggerPayoff() {
    setPayoffLoading(true);
    try {
      const res = await fetch('/api/finance/payoff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      if (!res.ok) throw new Error('Request failed');
      toast.success(t('payoff.success'));
      // Reload page to get fresh data
      globalThis.location.reload();
    } catch {
      toast.error(t('payoff.error'));
    } finally {
      setPayoffLoading(false);
    }
  }

  async function addPayment() {
    if (!addPaymentFor) return;
    const amount = Number.parseFloat(payAmount.replace(',', '.'));
    if (Number.isNaN(amount) || amount <= 0) {
      toast.error(t('error.invalidAmount'));
      return;
    }
    const signedAmount = payType === 'PAYMENT_IN' ? amount : -amount;
    try {
      const res = await fetch('/api/finance/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: addPaymentFor, type: payType, amount: signedAmount, note: payNote }),
      });
      if (!res.ok) throw new Error('Request failed');
      const tx = await res.json() as Transaction;
      setTransactions((prev) => [tx, ...prev]);
      applyTxToBalance(addPaymentFor, signedAmount);
      toast.success(t('payment.success'));
      setAddPaymentFor(null);
      setPayAmount('');
      setPayNote('');
    } catch {
      toast.error(t('payment.error'));
    }
  }

  async function doBulk() {
    const amount = Number.parseFloat(bulkAmount.replace(',', '.'));
    if (Number.isNaN(amount) || amount <= 0) {
      toast.error(t('error.invalidAmount'));
      return;
    }
    const signedAmount = bulkType === 'PAYMENT_OUT' ? -amount : amount;
    try {
      const res = await fetch('/api/finance/transactions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: bulkType,
          amount: signedAmount,
          note: bulkNote,
          excludedMemberIds: Array.from(excludedIds),
        }),
      });
      if (!res.ok) throw new Error('Request failed');
      toast.success(t('bulk.success'));
      globalThis.location.reload();
    } catch {
      toast.error(t('bulk.error'));
    }
  }

  async function doReset(memberIds?: number[]) {
    try {
      const res = await fetch('/api/finance/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true, ...(memberIds ? { memberIds } : {}) }),
      });
      if (!res.ok) throw new Error('Request failed');
      toast.success(t('reset.success'));
      globalThis.location.reload();
    } catch {
      toast.error(t('reset.error'));
    } finally {
      setResetConfirm(null);
      setResetAllInput('');
    }
  }

  async function saveAccountedUntil() {
    if (!accountedUntilDate) return;
    setAccountedUntilLoading(true);
    try {
      const res = await fetch('/api/finance/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lastPayoffAt: new Date(accountedUntilDate).toISOString() }),
      });
      if (!res.ok) throw new Error('Request failed');
      toast.success(t('accountedUntil.success'));
      setShowAccountedUntil(false);
      setAccountedUntilDate('');
      globalThis.location.reload();
    } catch {
      toast.error(t('accountedUntil.error'));
    } finally {
      setAccountedUntilLoading(false);
    }
  }

  async function addClubPurchase() {
    let signedAmount: number;
    if (cpMode === 'set') {
      const targetBal = Number.parseFloat(cpTargetBalance.replace(',', '.'));
      if (Number.isNaN(targetBal) || targetBal < 0) {
        toast.error(t('error.invalidAmount'));
        return;
      }
      signedAmount = Math.round((targetBal - totalCredit) * 100) / 100;
      if (signedAmount === 0) {
        setShowClubPurchase(false);
        return;
      }
    } else {
      const amount = Number.parseFloat(cpAmount.replace(',', '.'));
      if (Number.isNaN(amount) || amount <= 0) {
        toast.error(t('error.invalidAmount'));
        return;
      }
      signedAmount = cpMode === 'in' ? amount : -amount;
    }
    try {
      const res = await fetch('/api/finance/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'CLUB_PURCHASE', amount: signedAmount, note: cpNote }),
      });
      if (!res.ok) throw new Error('Request failed');
      const tx = await res.json() as Transaction;
      setTransactions((prev) => [tx, ...prev]);
      applyClubPurchaseTx(signedAmount);
      setShowClubPurchase(false);
      setCpAmount('');
      setCpNote('');
      setCpTargetBalance('');
      toast.success(t('clubPurchase.success'));
    } catch {
      toast.error(t('clubPurchase.error'));
    }
  }

  return (
    <div className="space-y-6">
      {/* Payoff due banner */}
      {payoffDue && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertTriangle size={18} />
            <span className="text-sm font-medium">{t('payoff.due')}</span>
            {settings.lastPayoffAt && (
              <span className="text-xs text-amber-600">
                {t('payoff.lastOn')} {fmtDate(settings.lastPayoffAt)}
              </span>
            )}
          </div>
          <Button
            size="sm"
            onClick={() => setShowPayoffConfirm(true)}
            disabled={payoffLoading}
            style={{ background: 'var(--kn-primary,#005982)' }}
            className="text-white shrink-0"
          >
            <RefreshCw size={14} className={payoffLoading ? 'animate-spin' : ''} />
            {t('payoff.trigger')}
          </Button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-gray-50 p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">{t('overview.totalCredit')}</div>
          <div className="text-xl font-bold text-green-700">+{fmt(totalCredit)}</div>
        </div>
        <div className="rounded-lg border bg-gray-50 p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">{t('overview.totalDebt')}</div>
          <div className="text-xl font-bold text-red-700">{fmt(totalDebt)}</div>
        </div>
        <div className="rounded-lg border bg-gray-50 p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">{t('overview.members')}</div>
          <div className="text-xl font-bold">{members.length}</div>
        </div>
      </div>

      {/* Actions row */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowPayoffConfirm(true)}
          disabled={payoffLoading}
          className="gap-1.5 text-green-700 border-green-300 hover:bg-green-50"
        >
          <RefreshCw size={14} className={payoffLoading ? 'animate-spin' : ''} />
          {t('payoff.trigger')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setBulkModal(true)}
          className="gap-1.5"
        >
          <Users size={14} />
          {t('bulk.title')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowSessionPayment(true)}
          className="gap-1.5"
        >
          <Calendar size={14} />
          {t('sessionPayment.button')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => { setShowClubPurchase(true); setCpMode('out'); setCpAmount(''); setCpNote(''); setCpTargetBalance(''); }}
          className="gap-1.5"
        >
          <Euro size={14} />
          {t('clubPurchase.button')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setAccountedUntilDate(settings.lastPayoffAt ? settings.lastPayoffAt.slice(0, 10) : '');
            setShowAccountedUntil(true);
          }}
          className="gap-1.5"
        >
          <CalendarCheck size={14} />
          {t('accountedUntil.button')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => { setShowDemand(true); setDemandCopied(false); }}
          className="gap-1.5"
        >
          <FileText size={14} />
          {t('demand.button')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => { setResetConfirm('all'); setResetAllInput(''); }}
          className="gap-1.5 ml-auto text-red-600 border-red-200 hover:bg-red-50"
        >
          <RotateCcw size={14} />
          {t('reset.allButton')}
        </Button>
      </div>

      {/* Members table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
              <th className="px-4 py-3">{t('overview.member')}</th>
              <th className="px-4 py-3 text-right">{t('overview.balance')}</th>
              <th className="px-4 py-3 text-right">{t('overview.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <AvatarImg pic={m.pic} nickname={m.nickname} />
                    <span className="font-medium">{m.nickname}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <BalanceBadge balance={getBalance(m.id)} />
                </td>
                <td className="px-4 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-green-700 hover:bg-green-50"
                      onClick={() => { setAddPaymentFor(m.id); setPayType('PAYMENT_IN'); }}
                      title={t('payment.in')}
                    >
                      <TrendingUp size={13} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-red-700 hover:bg-red-50"
                      onClick={() => { setAddPaymentFor(m.id); setPayType('PAYMENT_OUT'); }}
                      title={t('payment.out')}
                    >
                      <TrendingDown size={13} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-purple-700 hover:bg-purple-50"
                      onClick={() => setResetConfirm(m.id)}
                      title={t('reset.member')}
                    >
                      <RotateCcw size={13} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Guests table */}
      {guests.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                <th className="px-4 py-3">{t('overview.guest')}</th>
                <th className="px-4 py-3 text-right">{t('overview.balance')}</th>
              </tr>
            </thead>
            <tbody>
              {guests.map((g) => (
                <tr key={g.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <AvatarImg nickname={g.nickname} />
                      <span className="font-medium">{g.nickname}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <BalanceBadge balance={g.balance} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add payment modal */}
      {addPaymentFor !== null && (
        <Modal onClose={() => setAddPaymentFor(null)} title={
          payType === 'PAYMENT_IN'
            ? `${t('payment.in')} — ${members.find((m) => m.id === addPaymentFor)?.nickname ?? ''}`
            : `${t('payment.out')} — ${members.find((m) => m.id === addPaymentFor)?.nickname ?? ''}`
        }>
          <div className="space-y-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPayType('PAYMENT_IN')}
                className={`flex-1 rounded border py-2 text-sm font-medium cursor-pointer ${payType === 'PAYMENT_IN' ? 'bg-green-50 border-green-400 text-green-700' : 'border-gray-200 text-gray-500'}`}
              >
                {t('payment.in')}
              </button>
              <button
                type="button"
                onClick={() => setPayType('PAYMENT_OUT')}
                className={`flex-1 rounded border py-2 text-sm font-medium cursor-pointer ${payType === 'PAYMENT_OUT' ? 'bg-red-50 border-red-400 text-red-700' : 'border-gray-200 text-gray-500'}`}
              >
                {t('payment.out')}
              </button>
            </div>
            <div className="space-y-1">
              <Label htmlFor="pay-amount">{t('payment.amount')} (€)</Label>
              <Input
                id="pay-amount"
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="bg-white"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pay-note">{t('payment.note')}</Label>
              <Input
                id="pay-note"
                type="text"
                placeholder={t('payment.notePlaceholder')}
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
                className="bg-white"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setAddPaymentFor(null)}>{t('cancel')}</Button>
              <Button
                onClick={addPayment}
                style={{ background: 'var(--kn-primary,#005982)' }}
                className="text-white"
              >
                <Check size={14} />
                {t('payment.save')}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Bulk modal */}
      {bulkModal && (
        <Modal onClose={() => setBulkModal(false)} title={t('bulk.title')}>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>{t('payment.type')}</Label>
              <select
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm bg-white"
                value={bulkType}
                onChange={(e) => setBulkType(e.target.value as typeof bulkType)}
              >
                <option value="PAYMENT_IN">{t('txType.PAYMENT_IN')}</option>
                <option value="PAYMENT_OUT">{t('txType.PAYMENT_OUT')}</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="bulk-amount">{t('payment.amount')} (€)</Label>
              <Input
                id="bulk-amount"
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={bulkAmount}
                onChange={(e) => setBulkAmount(e.target.value)}
                className="bg-white"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="bulk-note">{t('payment.note')}</Label>
              <Input
                id="bulk-note"
                type="text"
                placeholder={t('payment.notePlaceholder')}
                value={bulkNote}
                onChange={(e) => setBulkNote(e.target.value)}
                className="bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('bulk.exclude')}</Label>
              <div className="max-h-80 overflow-y-auto rounded border divide-y text-sm">
                {members.map((m) => (
                  <label key={m.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={excludedIds.has(m.id)}
                      onChange={(e) => {
                        setExcludedIds((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(m.id); else next.delete(m.id);
                          return next;
                        });
                      }}
                    />
                    <AvatarImg pic={m.pic} nickname={m.nickname} />
                    <span>{m.nickname}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setBulkModal(false)}>{t('cancel')}</Button>
              <Button
                onClick={doBulk}
                style={{ background: 'var(--kn-primary,#005982)' }}
                className="text-white"
              >
                <Check size={14} />
                {t('bulk.apply')}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Club balance modal */}
      {showClubPurchase && (
        <Modal onClose={() => setShowClubPurchase(false)} title={t('clubPurchase.title')}>
          <div className="space-y-4">
            {/* Mode selector */}
            <div className="flex gap-4">
              {(['in', 'out', 'set'] as const).map((mode) => (
                <label key={mode} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="cpMode"
                    value={mode}
                    checked={cpMode === mode}
                    onChange={() => setCpMode(mode)}
                  />
                  <span>{t(`clubPurchase.mode${mode.charAt(0).toUpperCase()}${mode.slice(1)}` as 'clubPurchase.modeIn')}</span>
                </label>
              ))}
            </div>

            {cpMode !== 'set' ? (
              <div className="space-y-1">
                <Label htmlFor="cp-amount-ov">{t('payment.amount')} (€)</Label>
                <Input
                  id="cp-amount-ov"
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={cpAmount}
                  onChange={(e) => setCpAmount(e.target.value)}
                  className="bg-white"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-sm text-gray-500">
                  {t('clubPurchase.currentBalance')}: <span className="font-medium">{fmt(totalCredit)} €</span>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cp-target-bal">{t('clubPurchase.modeSet')} (€)</Label>
                  <Input
                    id="cp-target-bal"
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={cpTargetBalance}
                    onChange={(e) => setCpTargetBalance(e.target.value)}
                    className="bg-white"
                  />
                </div>
                {(() => {
                  const targetBal = Number.parseFloat(cpTargetBalance.replace(',', '.'));
                  if (Number.isNaN(targetBal)) return null;
                  const delta = Math.round((targetBal - totalCredit) * 100) / 100;
                  if (delta === 0) return <p className="text-sm text-gray-400 italic">{t('clubPurchase.noChange')}</p>;
                  return (
                    <p className={`text-sm font-medium ${delta > 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {delta > 0 ? t('clubPurchase.willDeposit') : t('clubPurchase.willWithdraw')}
                      {': '}
                      {delta > 0 ? '+' : ''}{fmt(delta)} €
                    </p>
                  );
                })()}
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="cp-note-ov">{t('payment.note')}</Label>
              <Input
                id="cp-note-ov"
                type="text"
                placeholder={t('payment.notePlaceholder')}
                value={cpNote}
                onChange={(e) => setCpNote(e.target.value)}
                className="bg-white"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowClubPurchase(false)}>{t('cancel')}</Button>
              <Button
                onClick={addClubPurchase}
                style={{ background: 'var(--kn-primary,#005982)' }}
                className="text-white"
              >
                <Check size={14} />
                {t('clubPurchase.save')}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Payoff confirmation modal */}
      {showPayoffConfirm && (
        <Modal onClose={() => setShowPayoffConfirm(false)} title={t('payoff.trigger')}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">{t('payoff.confirmText')}</p>
            {settings.lastPayoffAt && (
              <p className="text-xs text-gray-400">
                {t('payoff.lastOn')} {fmtDate(settings.lastPayoffAt)}
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowPayoffConfirm(false)}>{t('cancel')}</Button>
              <Button
                onClick={() => { setShowPayoffConfirm(false); triggerPayoff(); }}
                disabled={payoffLoading}
                className="gap-1 bg-green-600 hover:bg-green-700 text-white"
              >
                <RefreshCw size={14} className={payoffLoading ? 'animate-spin' : ''} />
                {t('payoff.trigger')}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Payment demand modal */}
      {showDemand && (
        <Modal onClose={() => setShowDemand(false)} title={t('demand.title')} wide>
          {debtMembers.length === 0 && debtGuests.length === 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 italic">{t('demand.empty')}</p>
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setShowDemand(false)}>{t('cancel')}</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <textarea
                readOnly
                value={demandText}
                rows={Math.min(20, demandText.split('\n').length + 2)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm font-mono bg-gray-50 resize-none"
                onClick={(e) => e.currentTarget.select()}
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowDemand(false)}>{t('cancel')}</Button>
                <Button
                  onClick={async () => {
                    await navigator.clipboard.writeText(demandText);
                    setDemandCopied(true);
                    setTimeout(() => setDemandCopied(false), 2000);
                  }}
                  style={{ background: 'var(--kn-primary,#005982)' }}
                  className="text-white gap-1"
                >
                  {demandCopied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{demandCopied ? t('demand.copied') : t('demand.copy')}</span>
                </Button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Reset confirmation */}
      {showSessionPayment && (
        <SessionPaymentModal
          t={t}
          members={members}
          guests={guests}
          onClose={() => setShowSessionPayment(false)}
          onSuccess={() => globalThis.location.reload()}
        />
      )}

      {/* Bereits abgerechnet bis modal */}
      {showAccountedUntil && (
        <Modal onClose={() => setShowAccountedUntil(false)} title={t('accountedUntil.title')}>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">{t('accountedUntil.hint')}</p>
            <div className="space-y-1">
              <Label htmlFor="accounted-until-date">{t('accountedUntil.date')}</Label>
              <Input
                id="accounted-until-date"
                type="date"
                value={accountedUntilDate}
                onChange={(e) => setAccountedUntilDate(e.target.value)}
                className="bg-white"
                max={new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowAccountedUntil(false)}>{t('cancel')}</Button>
              <Button
                disabled={!accountedUntilDate || accountedUntilLoading}
                onClick={saveAccountedUntil}
                style={{ background: 'var(--kn-primary,#005982)' }}
                className="text-white"
              >
                {t('accountedUntil.save')}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {resetConfirm !== null && (
        <Modal onClose={() => { setResetConfirm(null); setResetAllInput(''); }} title={t('reset.confirmTitle')}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {resetConfirm === 'all'
                ? t('reset.confirmAll')
                : `${t('reset.confirmOnePre')} ${members.find((m) => m.id === resetConfirm)?.nickname ?? ''}${t('reset.confirmOnePost')}`}
            </p>
            {resetConfirm === 'all' && (
              <div className="space-y-1">
                <Label htmlFor="reset-confirm-input">{t('reset.typeToConfirm')}</Label>
                <Input
                  id="reset-confirm-input"
                  type="text"
                  placeholder="reset all"
                  value={resetAllInput}
                  onChange={(e) => setResetAllInput(e.target.value)}
                  className="bg-white font-mono"
                />
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setResetConfirm(null); setResetAllInput(''); }}>{t('cancel')}</Button>
              <Button
                variant="destructive"
                disabled={resetConfirm === 'all' && resetAllInput !== 'reset all'}
                onClick={() => doReset(resetConfirm === 'all' ? undefined : [resetConfirm as number])}
              >
                {t('reset.confirm')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab({
  t, settings, setSettings, members, regularPayments, setRegularPayments, onToggleInactive,
}: {
  readonly t: (k: string, v?: Record<string, string | number | Date>) => string;
  readonly settings: FinanceSettings;
  readonly setSettings: React.Dispatch<React.SetStateAction<FinanceSettings>>;
  readonly members: MemberSummary[];
  readonly regularPayments: RegularPayment[];
  readonly setRegularPayments: React.Dispatch<React.SetStateAction<RegularPayment[]>>;
  readonly onToggleInactive: (id: number, isInactive: boolean) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [fee, setFee] = useState(String(settings.feeAmount));
  const [feeFreq, setFeeFreq] = useState(settings.feeFrequency);
  const [guestFee, setGuestFee] = useState(String(settings.guestFeeAmount));
  const [autoEnabled, setAutoEnabled] = useState(settings.autoPayoffEnabled);
  const [autoFreq, setAutoFreq] = useState(settings.autoPayoffFrequency);
  const [autoDay, setAutoDay] = useState(String(settings.autoPayoffDayOfMonth));

  // Regular payments form
  const [newRpMember, setNewRpMember] = useState('');
  const [newRpAmount, setNewRpAmount] = useState('');
  const [newRpFreq, setNewRpFreq] = useState<string>('MONTHLY');
  const [newRpNote, setNewRpNote] = useState('');
  const [addingRp, setAddingRp] = useState(false);

  async function saveSettings() {
    setSaving(true);
    try {
      const res = await fetch('/api/finance/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feeAmount: Number.parseFloat(fee.replace(',', '.')) || 0,
          feeFrequency: feeFreq,
          guestFeeAmount: Number.parseFloat(guestFee.replace(',', '.')) || 0,
          autoPayoffEnabled: autoEnabled,
          autoPayoffFrequency: autoFreq,
          autoPayoffDayOfMonth: Number.parseInt(autoDay) || 1,
        }),
      });
      if (!res.ok) throw new Error('Request failed');
      const updated = await res.json() as FinanceSettings;
      setSettings(updated);
      toast.success(t('settings.saved'));
    } catch {
      toast.error(t('settings.error'));
    } finally {
      setSaving(false);
    }
  }

  async function addRegularPayment() {
    const amount = Number.parseFloat(newRpAmount.replace(',', '.'));
    if (!newRpMember || Number.isNaN(amount) || amount <= 0) {
      toast.error(t('error.invalidAmount'));
      return;
    }
    setAddingRp(true);
    try {
      const res = await fetch('/api/finance/regular-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: Number.parseInt(newRpMember), amount, frequency: newRpFreq, note: newRpNote }),
      });
      if (!res.ok) throw new Error('Request failed');
      const created = await res.json() as RegularPayment;
      setRegularPayments((prev) => [...prev, created]);
      setNewRpMember('');
      setNewRpAmount('');
      setNewRpNote('');
      toast.success(t('regularPayment.created'));
    } catch {
      toast.error(t('regularPayment.error'));
    } finally {
      setAddingRp(false);
    }
  }

  async function toggleRpActive(rp: RegularPayment) {
    try {
      const res = await fetch(`/api/finance/regular-payments/${rp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !rp.active }),
      });
      if (!res.ok) throw new Error('Request failed');
      const updated = await res.json() as RegularPayment;
      setRegularPayments((prev) => prev.map((p) => p.id === rp.id ? updated : p));
    } catch {
      toast.error(t('regularPayment.error'));
    }
  }

  async function deleteRp(id: number) {
    try {
      const res = await fetch(`/api/finance/regular-payments/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Request failed');
      setRegularPayments((prev) => prev.filter((p) => p.id !== id));
      toast.success(t('regularPayment.deleted'));
    } catch {
      toast.error(t('regularPayment.error'));
    }
  }

  async function toggleInactive(m: MemberSummary) {
    const next = !m.isInactive;
    try {
      const res = await fetch(`/api/finance/members/${m.id}/inactive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isInactive: next }),
      });
      if (!res.ok) throw new Error('Request failed');
      onToggleInactive(m.id, next);
      toast.success(t('settings.inactiveToggled'));
    } catch {
      toast.error(t('settings.inactiveError'));
    }
  }

  return (
    <div className="space-y-8">
      {/* Club fee settings */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{t('settings.clubFee')}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="fee-amount">{t('settings.feeAmount')} (€)</Label>
            <Input
              id="fee-amount"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              className="bg-white max-w-[160px]"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="fee-freq">{t('settings.feeFrequency')}</Label>
            <select
              id="fee-freq"
              className="w-full max-w-[200px] rounded border border-gray-300 px-3 py-2 text-sm bg-white"
              value={feeFreq}
              onChange={(e) => setFeeFreq(e.target.value)}
            >
              {FREQUENCIES.map((f) => (
                <option key={f} value={f}>{t(`freq.${f}`)}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="guest-fee-amount">{t('settings.guestFeeAmount')} (€)</Label>
            <Input
              id="guest-fee-amount"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={guestFee}
              onChange={(e) => setGuestFee(e.target.value)}
              className="bg-white max-w-[160px]"
            />
          </div>
        </div>
      </section>

      {/* Auto payoff settings */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{t('settings.autoPayoff')}</h2>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setAutoEnabled((v) => !v)}
            className="cursor-pointer"
            aria-label={t('settings.autoPayoffToggle')}
          >
            {autoEnabled
              ? <ToggleRight size={28} style={{ color: 'var(--kn-primary,#005982)' }} />
              : <ToggleLeft size={28} className="text-gray-400" />}
          </button>
          <span className="text-sm">{t('settings.autoPayoffEnabled')}</span>
          <span className="relative group inline-flex items-center">
            <Info size={14} className="text-gray-400 cursor-help" />
            <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 rounded-lg bg-gray-800 px-3 py-2 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 z-10 shadow-lg">
              {t('settings.autoPayoffHint')}
            </span>
          </span>
        </div>
        {autoEnabled && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="auto-freq">{t('settings.autoFrequency')}</Label>
              <select
                id="auto-freq"
                className="w-full max-w-[200px] rounded border border-gray-300 px-3 py-2 text-sm bg-white"
                value={autoFreq}
                onChange={(e) => setAutoFreq(e.target.value)}
              >
                {FREQ_NO_NONE.map((f) => (
                  <option key={f} value={f}>{t(`freq.${f}`)}</option>
                ))}
              </select>
            </div>
            {(autoFreq === 'MONTHLY' || autoFreq === 'QUARTERLY' || autoFreq === 'YEARLY') && (
              <div className="space-y-1">
                <Label htmlFor="auto-day">{t('settings.dayOfMonth')}</Label>
                <Input
                  id="auto-day"
                  type="number"
                  min={1}
                  max={28}
                  value={autoDay}
                  onChange={(e) => setAutoDay(e.target.value)}
                  className="bg-white max-w-[100px]"
                />
              </div>
            )}
          </div>
        )}
      </section>

      <Button
        onClick={saveSettings}
        disabled={saving}
        style={{ background: 'var(--kn-primary,#005982)' }}
        className="text-white"
      >
        {saving ? t('settings.saving') : t('settings.save')}
      </Button>

      {/* Regular member payments */}
      <section className="space-y-4 border-t pt-6">
        <h2 className="text-lg font-semibold">{t('regularPayment.title')}</h2>
        <p className="text-sm text-gray-500">{t('regularPayment.hint')}</p>

        {/* Add form */}
        <div className="rounded-lg border bg-gray-50 p-4 space-y-3">
          <h3 className="text-sm font-semibold">{t('regularPayment.add')}</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="space-y-1 col-span-2 sm:col-span-1">
              <Label htmlFor="rp-member">{t('overview.member')}</Label>
              <select
                id="rp-member"
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm bg-white"
                value={newRpMember}
                onChange={(e) => setNewRpMember(e.target.value)}
              >
                <option value="">—</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.nickname}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="rp-amount">{t('payment.amount')} (€)</Label>
              <Input
                id="rp-amount"
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={newRpAmount}
                onChange={(e) => setNewRpAmount(e.target.value)}
                className="bg-white"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="rp-freq">{t('settings.feeFrequency')}</Label>
              <select
                id="rp-freq"
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm bg-white"
                value={newRpFreq}
                onChange={(e) => setNewRpFreq(e.target.value)}
              >
                {FREQ_NO_NONE.map((f) => (
                  <option key={f} value={f}>{t(`freq.${f}`)}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="rp-note">{t('payment.note')}</Label>
              <Input
                id="rp-note"
                type="text"
                placeholder={t('payment.notePlaceholder')}
                value={newRpNote}
                onChange={(e) => setNewRpNote(e.target.value)}
                className="bg-white"
              />
            </div>
          </div>
          <Button
            size="sm"
            onClick={addRegularPayment}
            disabled={addingRp}
            style={{ background: 'var(--kn-primary,#005982)' }}
            className="text-white gap-1"
          >
            <Plus size={14} />
            {t('regularPayment.add')}
          </Button>
        </div>

        {/* List */}
        {regularPayments.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  <th className="px-4 py-3">{t('overview.member')}</th>
                  <th className="px-4 py-3">{t('payment.amount')}</th>
                  <th className="px-4 py-3">{t('settings.feeFrequency')}</th>
                  <th className="px-4 py-3">{t('payment.note')}</th>
                  <th className="px-4 py-3">{t('regularPayment.active')}</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {regularPayments.map((rp) => (
                  <tr key={rp.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <AvatarImg pic={members.find((m) => m.id === rp.memberId)?.pic} nickname={rp.member.nickname} />
                        <span className="font-medium">{rp.member.nickname}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">{fmt(rp.amount)}</td>
                    <td className="px-4 py-2.5">{t(`freq.${rp.frequency}`)}</td>
                    <td className="px-4 py-2.5 text-gray-500">{rp.note}</td>
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => toggleRpActive(rp)}
                        className="cursor-pointer"
                      >
                        {rp.active
                          ? <ToggleRight size={22} style={{ color: 'var(--kn-primary,#005982)' }} />
                          : <ToggleLeft size={22} className="text-gray-400" />}
                      </button>
                    </td>
                    <td className="px-4 py-2.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                        onClick={() => deleteRp(rp.id)}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">{t('regularPayment.empty')}</p>
        )}
      </section>

      {/* Inactive members */}
      <section className="space-y-4 border-t pt-6">
        <h2 className="text-lg font-semibold">{t('settings.inactiveMembers')}</h2>
        <p className="text-sm text-gray-500">{t('settings.inactiveMembersHint')}</p>
        <div className="rounded-lg border divide-y">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-2">
                <AvatarImg pic={m.pic} nickname={m.nickname} />
                <span className="text-sm font-medium">{m.nickname}</span>
              </div>
              <button
                type="button"
                onClick={() => toggleInactive(m)}
                className="cursor-pointer"
                aria-label={m.nickname}
              >
                {m.isInactive
                  ? <ToggleRight size={22} style={{ color: 'var(--kn-primary,#005982)' }} />
                  : <ToggleLeft size={22} className="text-gray-400" />}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ─── Collectives Tab ──────────────────────────────────────────────────────────

function CollectivesTab({
  t, members, collectives, setCollectives, applyTxToBalance, transactions, setTransactions,
}: {
  readonly t: (k: string, v?: Record<string, string | number | Date>) => string;
  readonly members: MemberSummary[];
  readonly collectives: CollectiveCharge[];
  readonly setCollectives: React.Dispatch<React.SetStateAction<CollectiveCharge[]>>;
  readonly applyTxToBalance: (id: number, amount: number) => void;
  readonly transactions: Transaction[];
  readonly setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
}) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newNote, setNewNote] = useState('');
  const [amountMode, setAmountMode] = useState<'per-member' | 'total'>('per-member');
  const [excludedMemberIds, setExcludedMemberIds] = useState<Set<number>>(new Set());
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const includedCount = members.filter((m) => !excludedMemberIds.has(m.id)).length;
  const parsedAmount = Number.parseFloat(newAmount.replace(',', '.'));
  const perMemberPreview = amountMode === 'total' && includedCount > 0 && !Number.isNaN(parsedAmount)
    ? Math.round((parsedAmount / includedCount) * 100) / 100
    : null;

  async function createCollective() {
    const raw = Number.parseFloat(newAmount.replace(',', '.'));
    if (!newName.trim() || Number.isNaN(raw) || raw < 0) {
      toast.error(t('collective.invalidInput'));
      return;
    }
    const amount = amountMode === 'total' && includedCount > 0
      ? Math.round((raw / includedCount) * 100) / 100
      : raw;
    try {
      const res = await fetch('/api/finance/collectives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          defaultAmount: amount,
          note: newNote,
          excludedMemberIds: Array.from(excludedMemberIds),
        }),
      });
      if (!res.ok) throw new Error('Request failed');
      const created = await res.json() as CollectiveCharge;
      setCollectives((prev) => [created, ...prev]);
      setCreating(false);
      setNewName('');
      setNewAmount('');
      setNewNote('');
      setExcludedMemberIds(new Set());
      toast.success(t('collective.created'));
    } catch {
      toast.error(t('collective.error'));
    }
  }

  async function toggleClosed(c: CollectiveCharge) {
    try {
      const res = await fetch(`/api/finance/collectives/${c.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ closed: !c.closed }),
      });
      if (!res.ok) throw new Error('Request failed');
      const updated = await res.json() as CollectiveCharge;
      setCollectives((prev) => prev.map((x) => x.id === c.id ? { ...x, closed: updated.closed } : x));
    } catch {
      toast.error(t('collective.error'));
    }
  }

  async function deleteCollective(id: number) {
    try {
      const res = await fetch(`/api/finance/collectives/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Request failed');
      setCollectives((prev) => prev.filter((c) => c.id !== id));
      toast.success(t('collective.deleted'));
    } catch {
      toast.error(t('collective.error'));
    }
  }

  async function patchAssignment(collectiveId: number, memberId: number, action: 'pay' | 'unpay' | 'exclude' | 'include') {
    try {
      const res = await fetch(`/api/finance/collectives/${collectiveId}/assignments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, action }),
      });
      if (!res.ok) throw new Error('Request failed');
      const updated = await res.json() as AssignmentRow;

      setCollectives((prev) => prev.map((c) => {
        if (c.id !== collectiveId) return c;
        return {
          ...c,
          assignments: c.assignments.map((a) => a.memberId === memberId ? { ...a, ...updated } : a),
        };
      }));

      if (action === 'pay') {
        applyTxToBalance(memberId, updated.amount);
        const newTx: Transaction = {
          id: Date.now(),
          memberId,
          guestId: null,
          type: 'COLLECTIVE',
          amount: updated.amount,
          note: '',
          date: new Date().toISOString(),
          payoffEventId: null,
          sessionGroup: null,
          sessionDate: null,
          member: members.find((m) => m.id === memberId) ?? null,
          guest: null,
        };
        setTransactions((prev) => [newTx, ...prev]);
      } else if (action === 'unpay') {
        applyTxToBalance(memberId, -updated.amount);
      }
    } catch {
      toast.error(t('collective.error'));
    }
  }

  function toggleExpand(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      {/* Create button */}
      {!creating && (
        <Button
          size="sm"
          onClick={() => setCreating(true)}
          style={{ background: 'var(--kn-primary,#005982)' }}
          className="text-white gap-1"
        >
          <Plus size={14} />
          {t('collective.create')}
        </Button>
      )}

      {/* Create form */}
      {creating && (
        <div className="rounded-lg border bg-gray-50 p-4 space-y-4">
          <h3 className="text-sm font-semibold">{t('collective.newTitle')}</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="col-name">{t('collective.name')}</Label>
              <Input
                id="col-name"
                type="text"
                placeholder={t('collective.namePlaceholder')}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="bg-white"
              />
            </div>
            <div className="space-y-1">
              <Label>
                {amountMode === 'per-member' ? t('collective.amount') : t('collective.totalAmount')}
                <span className="text-gray-400"> (€)</span>
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="col-amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="bg-white"
                />
                <div className="flex rounded border border-gray-300 overflow-hidden text-xs shrink-0">
                  <button
                    type="button"
                    onClick={() => setAmountMode('per-member')}
                    className={`px-2 py-1.5 cursor-pointer ${amountMode === 'per-member' ? 'bg-[var(--kn-primary,#005982)] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  >
                    {t('collective.perMember')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAmountMode('total')}
                    className={`px-2 py-1.5 cursor-pointer border-l border-gray-300 ${amountMode === 'total' ? 'bg-[var(--kn-primary,#005982)] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  >
                    {t('collective.total')}
                  </button>
                </div>
              </div>
              {amountMode === 'total' && perMemberPreview !== null && (
                <p className="text-xs text-gray-500">
                  {t('collective.splitPreview', { perMember: fmt(perMemberPreview), count: includedCount })}
                </p>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="col-note">{t('payment.note')}</Label>
            <Input
              id="col-note"
              type="text"
              placeholder={t('payment.notePlaceholder')}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="bg-white"
            />
          </div>
          <div className="space-y-2">
            <Label>{t('collective.excludeMembers')}</Label>
            <div className="max-h-[264px] overflow-y-auto rounded border divide-y text-sm bg-white">
              {members.map((m) => (
                <label key={m.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={excludedMemberIds.has(m.id)}
                    onChange={(e) => {
                      setExcludedMemberIds((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(m.id); else next.delete(m.id);
                        return next;
                      });
                    }}
                  />
                  <AvatarImg pic={m.pic} nickname={m.nickname} />
                  <span>{m.nickname}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={createCollective}
              style={{ background: 'var(--kn-primary,#005982)' }}
              className="text-white"
            >
              <Check size={14} />
              {t('collective.save')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setCreating(false)}>{t('cancel')}</Button>
          </div>
        </div>
      )}

      {/* Collectives list */}
      {collectives.length === 0 && !creating && (
        <p className="text-sm text-gray-400 italic">{t('collective.empty')}</p>
      )}

      <div className="space-y-3">
        {collectives.map((c) => {
          const active = c.assignments.filter((a) => !a.excluded);
          const paid = active.filter((a) => a.paidAt !== null);
          const progress = active.length > 0 ? (paid.length / active.length) * 100 : 0;
          const isExpanded = expanded.has(c.id);

          return (
            <div key={c.id} className={`rounded-lg border ${c.closed ? 'opacity-60' : ''}`}>
              <div className="flex items-center gap-3 px-4 py-3">
                <button
                  type="button"
                  className="flex-1 text-left cursor-pointer"
                  onClick={() => toggleExpand(c.id)}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{c.name}</span>
                    <span className="text-xs text-gray-500 tabular-nums">
                      {fmt(c.defaultAmount)} / {t('collective.perMember')}
                      <span className="text-gray-400"> · {fmt(Math.round(c.defaultAmount * active.length * 100) / 100)} {t('collective.total')}</span>
                    </span>
                    {c.closed && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">{t('collective.closed')}</span>}
                  </div>
                  <div className="mt-1.5 h-1.5 w-full rounded-full bg-gray-200">
                    <div
                      className="h-1.5 rounded-full bg-green-500 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 mt-0.5">{paid.length} / {active.length} {t('collective.paid')}</span>
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleClosed(c)}
                    className="cursor-pointer p-1 rounded hover:bg-gray-100 text-xs text-gray-500"
                    title={c.closed ? t('collective.reopen') : t('collective.close')}
                  >
                    {c.closed ? <Check size={14} /> : <X size={14} />}
                  </button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                    onClick={() => setDeleteConfirmId(c.id)}
                  >
                    <Trash2 size={13} />
                  </Button>
                  <button
                    type="button"
                    onClick={() => toggleExpand(c.id)}
                    className="cursor-pointer p-1 rounded hover:bg-gray-100"
                  >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50 text-left text-xs text-gray-500">
                        <th className="px-4 py-2">{t('overview.member')}</th>
                        <th className="px-4 py-2">{t('payment.amount')}</th>
                        <th className="px-4 py-2">{t('collective.status')}</th>
                        <th className="px-4 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {c.assignments.map((a) => (
                        <tr key={a.id} className={`border-b last:border-0 ${a.excluded ? 'opacity-50' : ''}`}>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              <AvatarImg pic={members.find((m) => m.id === a.memberId)?.pic} nickname={a.member.nickname} />
                              <span>{a.member.nickname}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2 tabular-nums">{fmt(a.amount)}</td>
                          <td className="px-4 py-2">
                            {a.excluded && <span className="text-gray-400 text-xs">{t('collective.excluded')}</span>}
                            {!a.excluded && a.paidAt && <span className="text-green-700 text-xs font-medium">{t('collective.paidOn')} {fmtDate(a.paidAt)}</span>}
                            {!a.excluded && !a.paidAt && <span className="text-amber-600 text-xs">{t('collective.pending')}</span>}
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex gap-1 justify-end">
                              {!a.excluded && !a.paidAt && !c.closed && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-green-700 hover:bg-green-50 text-xs"
                                  onClick={() => patchAssignment(c.id, a.memberId, 'pay')}
                                >
                                  <Check size={12} />
                                  {t('collective.markPaid')}
                                </Button>
                              )}
                              {!a.excluded && a.paidAt && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-amber-700 hover:bg-amber-50 text-xs"
                                  onClick={() => patchAssignment(c.id, a.memberId, 'unpay')}
                                >
                                  {t('collective.markUnpaid')}
                                </Button>
                              )}
                              {!a.excluded ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-gray-500 hover:bg-gray-100 text-xs"
                                  onClick={() => patchAssignment(c.id, a.memberId, 'exclude')}
                                >
                                  {t('collective.exclude')}
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-gray-500 hover:bg-gray-100 text-xs"
                                  onClick={() => patchAssignment(c.id, a.memberId, 'include')}
                                >
                                  {t('collective.include')}
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirmId !== null && (
        <Modal onClose={() => setDeleteConfirmId(null)} title={t('collective.deleteConfirmTitle')}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">{t('collective.deleteConfirm')}</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>{t('cancel')}</Button>
              <Button
                variant="destructive"
                onClick={() => { deleteCollective(deleteConfirmId); setDeleteConfirmId(null); }}
              >
                <Trash2 size={14} />
                {t('collective.deleteConfirmOk')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Log Tab ──────────────────────────────────────────────────────────────────

function LogTab({
  t, members, guests, transactions, setTransactions,
}: {
  readonly t: (k: string, v?: Record<string, string | number | Date>) => string;
  readonly members: MemberSummary[];
  readonly guests: GuestSummary[];
  readonly transactions: Transaction[];
  readonly setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
}) {
  const [filterMember, setFilterMember] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(0);
  const [deletePendingId, setDeletePendingId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showClearLog, setShowClearLog] = useState(false);
  const [clearLogInput, setClearLogInput] = useState('');
  const [clearingLog, setClearingLog] = useState(false);

  // filterMember values: '' = all, '0' = club purchases, 'g:N' = guest id N, 'N' = member id N
  async function loadMore() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterMember.startsWith('g:')) {
        params.set('guestId', filterMember.slice(2));
      } else if (filterMember) {
        params.set('memberId', filterMember);
      }
      if (filterFrom) params.set('from', filterFrom);
      if (filterTo) params.set('to', filterTo);
      const res = await fetch(`/api/finance/transactions?${params.toString()}`);
      if (!res.ok) throw new Error('Request failed');
      const data = await res.json() as { transactions: Transaction[] };
      setTransactions(data.transactions);
    } catch {
      toast.error(t('log.loadError'));
    } finally {
      setLoading(false);
    }
  }

  function toggleOne(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function confirmBulkDelete() {
    setBulkDeleting(true);
    const ids = [...selectedIds];
    try {
      const res = await fetch('/api/finance/transactions/bulk-delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        toast.error(body.error ?? t('log.deleteError'));
        return;
      }
      setTransactions((prev) => prev.filter((tx) => !selectedIds.has(tx.id)));
      setSelectedIds(new Set());
      toast.success(t('log.bulkDeleted', { count: ids.length }));
    } catch {
      toast.error(t('log.deleteError'));
    } finally {
      setBulkDeleting(false);
      setShowBulkDelete(false);
    }
  }

  async function confirmDeleteTx() {
    if (deletePendingId === null) return;
    try {
      const res = await fetch(`/api/finance/transactions/${deletePendingId}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        toast.error(body.error ?? t('log.deleteError'));
        return;
      }
      setTransactions((prev) => prev.filter((tx) => tx.id !== deletePendingId));
      toast.success(t('log.deleted'));
    } catch {
      toast.error(t('log.deleteError'));
    } finally {
      setDeletePendingId(null);
    }
  }

  async function clearLog() {
    setClearingLog(true);
    try {
      const res = await fetch('/api/finance/log/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'clear log' }),
      });
      if (!res.ok) throw new Error('Request failed');
      toast.success(t('log.clearSuccess'));
      globalThis.location.reload();
    } catch {
      toast.error(t('log.clearError'));
    } finally {
      setClearingLog(false);
      setShowClearLog(false);
      setClearLogInput('');
    }
  }

  function matchesMember(tx: Transaction): boolean {
    if (filterMember.startsWith('g:')) return tx.guestId === Number(filterMember.slice(2));
    if (filterMember === '0') return tx.memberId === null && tx.guestId === null;
    if (filterMember) return String(tx.memberId) === filterMember;
    return true;
  }

  function matchesSearch(tx: Transaction): boolean {
    if (!filterSearch) return true;
    const q = filterSearch.toLowerCase();
    const memberName = tx.member?.nickname ?? tx.guest?.nickname ?? '';
    const haystack = [
      memberName,
      fmtDate(tx.date),
      t(`txType.${tx.type}`),
      fmt(tx.amount),
      tx.note,
      tx.sessionDate ? fmtDate(tx.sessionDate) : '',
    ].join(' ').toLowerCase();
    return haystack.includes(q);
  }

  // Client-side filtering on loaded data
  const filtered = transactions.filter((tx) => {
    if (!matchesMember(tx)) return false;
    if (filterFrom && tx.date < filterFrom) return false;
    if (filterTo && tx.date > filterTo + 'T23:59:59') return false;
    if (!matchesSearch(tx)) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const paginated = filtered.slice(safePage * pageSize, (safePage + 1) * pageSize);
  const txToDelete = deletePendingId !== null ? transactions.find((x) => x.id === deletePendingId) : null;
  const allPageSelected = paginated.length > 0 && paginated.every((tx) => selectedIds.has(tx.id));
  const somePageSelected = paginated.some((tx) => selectedIds.has(tx.id));

  function toggleSelectAll() {
    if (allPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginated.forEach((tx) => next.delete(tx.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginated.forEach((tx) => next.add(tx.id));
        return next;
      });
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label htmlFor="log-member">{t('overview.member')}</Label>
          <select
            id="log-member"
            className="rounded border border-gray-300 px-3 py-2 text-sm bg-white"
            value={filterMember}
            onChange={(e) => { setFilterMember(e.target.value); setPage(0); }}
          >
            <option value="">{t('log.allMembers')}</option>
            <option value="0">{t('log.clubPurchases')}</option>
            <optgroup label={t('overview.member')}>
              {members.map((m) => (
                <option key={m.id} value={String(m.id)}>{m.nickname}</option>
              ))}
            </optgroup>
            {guests.length > 0 && (
              <optgroup label={t('overview.guest')}>
                {guests.map((g) => (
                  <option key={g.id} value={`g:${g.id}`}>{g.nickname}</option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="log-search">{t('log.search')}</Label>
          <Input
            id="log-search"
            type="text"
            value={filterSearch}
            onChange={(e) => { setFilterSearch(e.target.value); setPage(0); }}
            placeholder={t('log.search')}
            className="bg-white w-64"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="log-from">{t('log.from')}</Label>
          <Input
            id="log-from"
            type="date"
            value={filterFrom}
            onChange={(e) => { setFilterFrom(e.target.value); setPage(0); }}
            className="bg-white"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="log-to">{t('log.to')}</Label>
          <Input
            id="log-to"
            type="date"
            value={filterTo}
            onChange={(e) => { setFilterTo(e.target.value); setPage(0); }}
            className="bg-white"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="log-pagesize">{t('log.perPage')}</Label>
          <select
            id="log-pagesize"
            className="rounded border border-gray-300 px-3 py-2 text-sm bg-white"
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
          >
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={250}>250</option>
          </select>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={loadMore}
          disabled={loading}
          className="gap-1"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          {t('log.refresh')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => { setShowClearLog(true); setClearLogInput(''); }}
          className="gap-1 ml-auto text-red-600 border-red-200 hover:bg-red-50"
        >
          <Trash2 size={13} />
          {t('log.clearButton')}
        </Button>
      </div>

      {/* Bulk delete action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-red-50 border border-red-200">
          <span className="text-sm text-red-700 font-medium flex-1">
            {t('log.bulkDeleteButton', { count: selectedIds.size })}
          </span>
          <Button
            size="sm"
            variant="destructive"
            className="gap-1"
            onClick={() => setShowBulkDelete(true)}
          >
            <Trash2 size={13} />
            {t('log.deleteConfirmOk')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={() => setSelectedIds(new Set())}
          >
            {t('cancel')}
          </Button>
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400 italic py-4">{t('log.empty')}</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  <th className="px-3 py-3">
                    <input
                      type="checkbox"
                      className="cursor-pointer"
                      checked={allPageSelected}
                      ref={(el) => { if (el) el.indeterminate = somePageSelected && !allPageSelected; }}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="px-4 py-3">{t('log.date')}</th>
                  <th className="px-4 py-3">{t('overview.member')}</th>
                  <th className="px-4 py-3">{t('log.type')}</th>
                  <th className="px-4 py-3 text-right">{t('payment.amount')}</th>
                  <th className="px-4 py-3">{t('payment.note')}</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((tx) => (
                  <tr key={tx.id} className={`border-b last:border-0 hover:bg-gray-50 ${selectedIds.has(tx.id) ? 'bg-red-50' : ''}`}>
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        className="cursor-pointer"
                        checked={selectedIds.has(tx.id)}
                        onChange={() => toggleOne(tx.id)}
                      />
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{fmtDate(tx.date)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        {(tx.memberId !== null || tx.guestId !== null) && (
                          <AvatarImg
                            pic={tx.memberId !== null ? members.find((m) => m.id === tx.memberId)?.pic : undefined}
                            nickname={tx.member?.nickname ?? tx.guest?.nickname ?? ''}
                          />
                        )}
                        <span className="font-medium">{tx.member?.nickname ?? tx.guest?.nickname ?? t('log.clubLabel')}</span>
                      </div>
                    </td>
                    <TxTypeCell type={tx.type} sessionDate={tx.sessionDate} amount={tx.amount} />
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      <span className={tx.amount >= 0 ? 'text-green-700' : 'text-red-700'}>
                        {tx.amount >= 0 ? '+' : ''}{fmt(tx.amount)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 max-w-[200px]">
                      <span className="truncate block">{tx.note}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                        onClick={() => setDeletePendingId(tx.id)}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                {safePage * pageSize + 1}–{Math.min((safePage + 1) * pageSize, filtered.length)}
                <span> / </span>
                {filtered.length}
              </span>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage(0)}
                  disabled={safePage === 0}
                  className="px-2"
                >
                  {'«'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                  className="px-2"
                >
                  {'‹'}
                </Button>
                <span className="flex items-center px-3 font-medium">
                  {safePage + 1} / {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={safePage >= totalPages - 1}
                  className="px-2"
                >
                  {'›'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage(totalPages - 1)}
                  disabled={safePage >= totalPages - 1}
                  className="px-2"
                >
                  {'»'}
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete confirmation modal */}
      {deletePendingId !== null && (
        <Modal onClose={() => setDeletePendingId(null)} title={t('log.deleteConfirmTitle')}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">{t('log.deleteConfirm')}</p>
            {txToDelete && (
              <div className="rounded-lg border bg-gray-50 px-4 py-3 text-sm space-y-1">
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">{t('log.date')}</span>
                  <span className="font-medium">{fmtDate(txToDelete.date)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">{t('overview.member')}</span>
                  <span className="font-medium">{txToDelete.member?.nickname ?? txToDelete.guest?.nickname ?? t('log.clubLabel')}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">{t('log.type')}</span>
                  <TxTypeBadge type={txToDelete.type} t={t} />
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">{t('payment.amount')}</span>
                  <span className={`font-semibold tabular-nums ${txToDelete.amount >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {txToDelete.amount >= 0 ? '+' : ''}{fmt(txToDelete.amount)}
                  </span>
                </div>
                {txToDelete.note && (
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">{t('payment.note')}</span>
                    <span className="text-gray-700 text-right">{txToDelete.note}</span>
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeletePendingId(null)}>{t('cancel')}</Button>
              <Button variant="destructive" onClick={confirmDeleteTx}>
                <Trash2 size={14} />
                {t('log.deleteConfirmOk')}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Bulk delete confirmation modal */}
      {showBulkDelete && (
        <Modal onClose={() => setShowBulkDelete(false)} title={t('log.deleteConfirmTitle')}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">{t('log.bulkDeleteConfirm', { count: selectedIds.size })}</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowBulkDelete(false)}>{t('cancel')}</Button>
              <Button variant="destructive" disabled={bulkDeleting} onClick={confirmBulkDelete}>
                <Trash2 size={14} />
                {t('log.deleteConfirmOk')}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Clear log confirmation modal */}
      {showClearLog && (
        <Modal onClose={() => { setShowClearLog(false); setClearLogInput(''); }} title={t('log.clearTitle')}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">{t('log.clearConfirmText')}</p>
            <div className="space-y-1">
              <Label htmlFor="clear-log-input">{t('log.clearTypeToConfirm')}</Label>
              <Input
                id="clear-log-input"
                type="text"
                placeholder="clear log"
                value={clearLogInput}
                onChange={(e) => setClearLogInput(e.target.value)}
                className="bg-white font-mono"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setShowClearLog(false); setClearLogInput(''); }}>{t('cancel')}</Button>
              <Button
                variant="destructive"
                disabled={clearLogInput !== 'clear log' || clearingLog}
                onClick={clearLog}
              >
                <Trash2 size={14} />
                {t('log.clearConfirmOk')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Payment Info Tab ─────────────────────────────────────────────────────────

function PaymentInfoTab({
  t, paymentInfo, setPaymentInfo,
}: {
  readonly t: (k: string, v?: Record<string, string | number | Date>) => string;
  readonly paymentInfo: ClubPaymentInfo;
  readonly setPaymentInfo: React.Dispatch<React.SetStateAction<ClubPaymentInfo>>;
}) {
  const [accountHolder, setAccountHolder] = useState(paymentInfo.accountHolder);
  const [iban, setIban] = useState(paymentInfo.iban);
  const [bic, setBic] = useState(paymentInfo.bic);
  const [paypal, setPaypal] = useState(paymentInfo.paypal);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch('/api/club/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountHolder, iban, bic, paypal }),
      });
      if (!res.ok) throw new Error('Request failed');
      const updated = await res.json() as ClubPaymentInfo;
      setPaymentInfo(updated);
      toast.success(t('paymentInfo.saved'));
    } catch {
      toast.error(t('paymentInfo.error'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      <p className="text-sm text-gray-500">{t('paymentInfo.hint')}</p>
      <div className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="pi-holder">{t('paymentInfo.accountHolder')}</Label>
          <Input
            id="pi-holder"
            type="text"
            value={accountHolder}
            onChange={(e) => setAccountHolder(e.target.value)}
            className="bg-white"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pi-iban">IBAN</Label>
          <Input
            id="pi-iban"
            type="text"
            value={iban}
            onChange={(e) => setIban(e.target.value)}
            className="bg-white font-mono"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pi-bic">BIC</Label>
          <Input
            id="pi-bic"
            type="text"
            value={bic}
            onChange={(e) => setBic(e.target.value)}
            className="bg-white font-mono"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pi-paypal">{t('paymentInfo.paypalLabel')}</Label>
          <Input
            id="pi-paypal"
            type="text"
            placeholder="username or https://paypal.me/..."
            value={paypal}
            onChange={(e) => setPaypal(e.target.value)}
            className="bg-white"
          />
          <p className="text-xs text-gray-400">{t('paymentInfo.paypalHint')}</p>
        </div>
      </div>
      <Button
        onClick={save}
        disabled={saving}
        style={{ background: 'var(--kn-primary,#005982)' }}
        className="text-white gap-1"
      >
        <Check size={14} />
        {t('paymentInfo.save')}
      </Button>
    </div>
  );
}

// ─── Session Payment Modal ────────────────────────────────────────────────────

interface SessionInfo {
  sessionGroup: number;
  date: string;
  attendeeCount: number;
}

interface SessionAttendees {
  sessionGroup: number;
  date: string | null;
  members: { id: number; nickname: string }[];
  guests: { id: number; nickname: string }[];
}

function SessionPaymentModal({
  t, members: allMembers, guests: allGuests, onClose, onSuccess,
}: {
  readonly t: (k: string, v?: Record<string, string | number | Date>) => string;
  readonly members: MemberSummary[];
  readonly guests: GuestSummary[];
  readonly onClose: () => void;
  readonly onSuccess: () => void;
}) {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [attendees, setAttendees] = useState<SessionAttendees | null>(null);
  const [loadingAttendees, setLoadingAttendees] = useState(false);
  const [totalAmount, setTotalAmount] = useState('');
  const [note, setNote] = useState('');
  const [includedMemberIds, setIncludedMemberIds] = useState<Set<number>>(new Set());
  const [includedGuestIds, setIncludedGuestIds] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  // Load sessions on mount
  useEffect(() => {
    fetch('/api/finance/session-payment')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load sessions');
        return res.json() as Promise<{ sessions: SessionInfo[] }>;
      })
      .then((data) => setSessions(data.sessions))
      .catch(() => toast.error(t('sessionPayment.loadError')))
      .finally(() => setLoadingSessions(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSessionChange(sessionGroup: number) {
    setSelectedSession(sessionGroup);
    setAttendees(null);
    setIncludedMemberIds(new Set());
    setIncludedGuestIds(new Set());
    setLoadingAttendees(true);
    try {
      const res = await fetch(`/api/finance/session-payment?sessionGroup=${sessionGroup}`);
      if (!res.ok) throw new Error('Failed to load attendees');
      const data = await res.json() as SessionAttendees;
      setAttendees(data);
      setIncludedMemberIds(new Set(data.members.map((m) => m.id)));
      setIncludedGuestIds(new Set(data.guests.map((g) => g.id)));
    } catch {
      toast.error(t('sessionPayment.loadError'));
    } finally {
      setLoadingAttendees(false);
    }
  }

  async function submit() {
    const amount = Number.parseFloat(totalAmount.replace(',', '.'));
    if (Number.isNaN(amount) || amount <= 0) {
      toast.error(t('error.invalidAmount'));
      return;
    }
    const totalParticipants = includedMemberIds.size + includedGuestIds.size;
    if (totalParticipants === 0) {
      toast.error(t('sessionPayment.noAttendees'));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/finance/session-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionGroup: selectedSession,
          totalAmount: amount,
          note,
          includedMemberIds: Array.from(includedMemberIds),
          includedGuestIds: Array.from(includedGuestIds),
        }),
      });
      if (!res.ok) throw new Error('Request failed');
      toast.success(t('sessionPayment.success'));
      onSuccess();
    } catch {
      toast.error(t('sessionPayment.error'));
    } finally {
      setSubmitting(false);
    }
  }

  const parsedAmount = Number.parseFloat(totalAmount.replace(',', '.'));
  const checkedCount = includedMemberIds.size + includedGuestIds.size;
  const perPerson = !Number.isNaN(parsedAmount) && parsedAmount > 0 && checkedCount > 0
    ? Math.round((parsedAmount / checkedCount) * 100) / 100
    : null;

  return (
    <Modal onClose={onClose} title={t('sessionPayment.title')} wide>
      <div className="space-y-4">
        {/* Session selector */}
        <div className="space-y-1">
          <Label htmlFor="sp-session">{t('sessionPayment.selectSession')}</Label>
          {loadingSessions ? (
            <p className="text-sm text-gray-400 italic">…</p>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-gray-400 italic">{t('sessionPayment.noSessions')}</p>
          ) : (
            <select
              id="sp-session"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm bg-white"
              value={selectedSession ?? ''}
              onChange={(e) => {
                const val = Number.parseInt(e.target.value);
                if (!Number.isNaN(val)) handleSessionChange(val);
              }}
            >
              <option value="">{t('sessionPayment.selectSessionPlaceholder')}</option>
              {sessions.map((s) => (
                <option key={s.sessionGroup} value={s.sessionGroup}>
                  {`${fmtDate(s.date)} — ${s.attendeeCount} ${t('sessionPayment.attendees')}`}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Amount inputs */}
        <div className="flex gap-4 items-end">
          <div className="space-y-1 flex-1">
            <Label htmlFor="sp-amount">{t('sessionPayment.totalAmount')} (€)</Label>
            <Input
              id="sp-amount"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              className="bg-white"
            />
          </div>
          {perPerson !== null && (
            <div className="text-sm text-gray-500 pb-2 shrink-0">
              <span className="text-xs text-gray-400">{t('sessionPayment.perPerson')}: </span>
              <span className="font-semibold tabular-nums text-red-700">−{fmt(perPerson)}</span>
            </div>
          )}
        </div>

        {/* Note */}
        <div className="space-y-1">
          <Label htmlFor="sp-note">{t('payment.note')}</Label>
          <Input
            id="sp-note"
            type="text"
            placeholder={t('payment.notePlaceholder')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="bg-white"
          />
        </div>

        {/* Attendees */}
        {loadingAttendees && (
          <p className="text-sm text-gray-400 italic">…</p>
        )}
        {!loadingAttendees && attendees && (
          <div className="space-y-2">
            <Label>{t('sessionPayment.attendees')}</Label>
            {attendees.members.length === 0 && attendees.guests.length === 0 ? (
              <p className="text-sm text-gray-400 italic">{t('sessionPayment.noAttendees')}</p>
            ) : (
              <div className="rounded border divide-y max-h-56 overflow-y-auto text-sm bg-white">
                {attendees.members.length > 0 && (
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                    {t('sessionPayment.members')}
                  </div>
                )}
                {attendees.members.map((m) => (
                  <label key={m.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={includedMemberIds.has(m.id)}
                      onChange={(e) => {
                        setIncludedMemberIds((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(m.id); else next.delete(m.id);
                          return next;
                        });
                      }}
                    />
                    <AvatarImg pic={allMembers.find((x) => x.id === m.id)?.pic} nickname={m.nickname} />
                    <span>{m.nickname}</span>
                  </label>
                ))}
                {attendees.guests.length > 0 && (
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                    {t('sessionPayment.guests')}
                  </div>
                )}
                {attendees.guests.map((g) => (
                  <label key={g.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={includedGuestIds.has(g.id)}
                      onChange={(e) => {
                        setIncludedGuestIds((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(g.id); else next.delete(g.id);
                          return next;
                        });
                      }}
                    />
                    <AvatarImg nickname={g.nickname} />
                    <span>{g.nickname}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" onClick={onClose}>{t('cancel')}</Button>
          <Button
            onClick={submit}
            disabled={submitting || selectedSession === null || checkedCount === 0}
            style={{ background: 'var(--kn-primary,#005982)' }}
            className="text-white gap-1"
          >
            <Check size={14} />
            {t('sessionPayment.confirm')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Sources Tab ──────────────────────────────────────────────────────────────

function SourcesTab({
  t, moneySources, setMoneySources, totalCredit,
}: {
  readonly t: (k: string, v?: Record<string, string | number | Date>) => string;
  readonly moneySources: MoneySource[];
  readonly setMoneySources: React.Dispatch<React.SetStateAction<MoneySource[]>>;
  readonly totalCredit: number;
}) {
  const tCommon = useTranslations('common');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newValue, setNewValue] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [deleteSourceId, setDeleteSourceId] = useState<number | null>(null);
  const [deleteLogId, setDeleteLogId] = useState<{ sourceId: number; logId: number } | null>(null);
  const [addingLogFor, setAddingLogFor] = useState<number | null>(null);
  const [logValueInput, setLogValueInput] = useState('');

  function toggleExpand(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const sourcesTotal = moneySources.reduce((s, src) => s + src.value, 0);
  const difference = Math.round((sourcesTotal - totalCredit) * 100) / 100;

  async function createSource() {
    if (!newName.trim()) { toast.error(t('sources.errorSave')); return; }
    const val = Number.parseFloat(newValue.replace(',', '.')) || 0;
    try {
      const res = await fetch('/api/finance/money-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), value: val }),
      });
      if (!res.ok) throw new Error();
      const created = await res.json() as MoneySource;
      setMoneySources((prev) => [...prev, created]);
      setCreating(false);
      setNewName('');
      setNewValue('');
      toast.success(t('sources.saveSuccess'));
    } catch {
      toast.error(t('sources.errorSave'));
    }
  }

  async function deleteSource(id: number) {
    try {
      const res = await fetch(`/api/finance/money-sources/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setMoneySources((prev) => prev.filter((s) => s.id !== id));
      toast.success(t('sources.deleteSuccess'));
    } catch {
      toast.error(t('sources.errorDelete'));
    }
  }

  async function addLogEntry(sourceId: number) {
    const val = Number.parseFloat(logValueInput.replace(',', '.'));
    if (Number.isNaN(val)) { toast.error(t('sources.errorSave')); return; }
    try {
      const res = await fetch(`/api/finance/money-sources/${sourceId}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: val }),
      });
      if (!res.ok) throw new Error();
      const entry = await res.json() as MoneySourceLog;
      setMoneySources((prev) => prev.map((s) => {
        if (s.id !== sourceId) return s;
        return { ...s, value: val, log: [entry, ...s.log] };
      }));
      setAddingLogFor(null);
      setLogValueInput('');
      toast.success(t('sources.saveSuccess'));
    } catch {
      toast.error(t('sources.errorSave'));
    }
  }

  async function deleteLogEntry(sourceId: number, logId: number) {
    try {
      const res = await fetch(`/api/finance/money-sources/${sourceId}/log/${logId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setMoneySources((prev) => prev.map((s) => {
        if (s.id !== sourceId) return s;
        return { ...s, log: s.log.filter((l) => l.id !== logId) };
      }));
      toast.success(t('sources.deleteSuccess'));
    } catch {
      toast.error(t('sources.errorDelete'));
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-gray-50 p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">{t('sources.sourcesTotal')}</div>
          <div className="text-xl font-bold tabular-nums">{fmt(sourcesTotal)}</div>
        </div>
        <div className="rounded-lg border bg-gray-50 p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">{t('sources.balance')}</div>
          <div className="text-xl font-bold text-green-700 tabular-nums">+{fmt(totalCredit)}</div>
        </div>
        <div className={`rounded-lg border p-4 text-center ${difference === 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="text-xs text-gray-500 mb-1">{t('sources.difference')}</div>
          <div className={`text-xl font-bold tabular-nums ${difference === 0 ? 'text-green-700' : 'text-red-700'}`}>
            {difference > 0 ? '+' : ''}{fmt(difference)}
          </div>
        </div>
      </div>

      {/* Add source button */}
      {!creating && (
        <Button
          size="sm"
          onClick={() => setCreating(true)}
          style={{ background: 'var(--kn-primary,#005982)' }}
          className="text-white gap-1.5"
        >
          <Plus size={14} />
          <span>{t('sources.addSource')}</span>
        </Button>
      )}

      {/* Create form */}
      {creating && (
        <div className="rounded-lg border p-4 space-y-3 bg-gray-50">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{t('sources.sourceName')}</Label>
              <Input className="bg-white" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>{t('sources.sourceValue')}</Label>
              <Input className="bg-white" value={newValue} onChange={(e) => setNewValue(e.target.value)} inputMode="decimal" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={createSource}
              style={{ background: 'var(--kn-primary,#005982)' }}
              className="text-white gap-1.5"
            >
              <Check size={14} />
              <span>{tCommon('save')}</span>
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setCreating(false); setNewName(''); setNewValue(''); }}>
              {t('cancel')}
            </Button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {moneySources.length === 0 && !creating && (
        <p className="text-sm text-gray-400 italic">{t('sources.empty')}</p>
      )}

      {/* Sources list */}
      <div className="space-y-3">
        {moneySources.map((src) => {
          const isExpanded = expanded.has(src.id);
          return (
            <div key={src.id} className="rounded-lg border">
              <div className="flex items-center gap-3 px-4 py-3">
                <button
                  type="button"
                  className="flex-1 text-left cursor-pointer"
                  onClick={() => toggleExpand(src.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-sm">{src.name}</span>
                    <span className="text-sm tabular-nums font-medium">{fmt(src.value)}</span>
                  </div>
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                    onClick={() => setDeleteSourceId(src.id)}
                  >
                    <Trash2 size={13} />
                  </Button>
                  <button
                    type="button"
                    onClick={() => toggleExpand(src.id)}
                    className="cursor-pointer p-1 rounded hover:bg-gray-100"
                  >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t p-4 space-y-3">
                  {addingLogFor === src.id ? (
                    <div className="flex items-end gap-2">
                      <div className="space-y-1 flex-1">
                        <Label>{t('sources.logValue')}</Label>
                        <Input
                          className="bg-white"
                          value={logValueInput}
                          onChange={(e) => setLogValueInput(e.target.value)}
                          inputMode="decimal"
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={() => addLogEntry(src.id)}
                        style={{ background: 'var(--kn-primary,#005982)' }}
                        className="text-white"
                      >
                        <Check size={14} />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setAddingLogFor(null); setLogValueInput(''); }}
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setAddingLogFor(src.id); setLogValueInput(String(src.value)); }}
                      className="gap-1.5"
                    >
                      <Plus size={13} />
                      <span>{t('sources.addLogEntry')}</span>
                    </Button>
                  )}

                  {src.log.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">{t('sources.logEmpty')}</p>
                  ) : (
                    <table className="w-full text-sm">
                      <tbody>
                        {src.log.map((entry) => (
                          <tr key={entry.id} className="border-b last:border-0">
                            <td className="py-1.5 text-gray-500 text-xs">{fmtDate(entry.createdAt)}</td>
                            <td className="py-1.5 tabular-nums font-medium">{fmt(entry.value)}</td>
                            <td className="py-1.5 text-right">
                              <button
                                type="button"
                                className="cursor-pointer p-1 text-red-400 hover:text-red-600 rounded hover:bg-red-50"
                                onClick={() => setDeleteLogId({ sourceId: src.id, logId: entry.id })}
                              >
                                <Trash2 size={12} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Delete source confirmation modal */}
      {deleteSourceId !== null && (
        <Modal onClose={() => setDeleteSourceId(null)} title={t('sources.deleteSourceTitle')}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">{t('sources.deleteSourceConfirm')}</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteSourceId(null)}>{t('cancel')}</Button>
              <Button
                variant="destructive"
                onClick={() => { void deleteSource(deleteSourceId); setDeleteSourceId(null); }}
              >
                <Trash2 size={14} />
                <span>{t('sources.deleteSourceOk')}</span>
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete log entry confirmation modal */}
      {deleteLogId !== null && (
        <Modal onClose={() => setDeleteLogId(null)} title={t('sources.deleteLogTitle')}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">{t('sources.deleteLogConfirm')}</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteLogId(null)}>{t('cancel')}</Button>
              <Button
                variant="destructive"
                onClick={() => {
                  void deleteLogEntry(deleteLogId.sourceId, deleteLogId.logId);
                  setDeleteLogId(null);
                }}
              >
                <Trash2 size={14} />
                <span>{t('sources.deleteLogOk')}</span>
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Shared Modal ─────────────────────────────────────────────────────────────

function Modal({ children, title, onClose, wide }: { readonly children: React.ReactNode; readonly title: string; readonly onClose: () => void; readonly wide?: boolean }) {
  return createPortal(
    <div role="presentation" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      <div
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={`w-full rounded-xl bg-white shadow-xl p-6 space-y-4 ${wide ? 'max-w-2xl' : 'max-w-md'}`}
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
