import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { enrichWithSessionDates } from '@/lib/finance-utils';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import FinanceAdminClient from './FinanceAdminClient';

export default async function AdminFinancePage() {
  const member = await getCurrentMember();
  if (!member || member.role !== Role.ADMIN) redirect('/');

  const [settings, club, members, guests, collectives, regularPayments, recentTx, moneySources] = await Promise.all([
    prisma.clubFinanceSettings.findUnique({ where: { clubId: member.clubId } }),
    prisma.club.findUnique({
      where: { id: member.clubId },
      select: { accountHolder: true, iban: true, bic: true, paypal: true },
    }),
    prisma.member.findMany({
      where: { clubId: member.clubId },
      select: { id: true, nickname: true, pic: true, isInactive: true },
      orderBy: { nickname: 'asc' },
    }),
    prisma.guest.findMany({
      where: { clubId: member.clubId },
      select: { id: true, nickname: true },
      orderBy: { nickname: 'asc' },
    }),
    prisma.collectiveCharge.findMany({
      where: { clubId: member.clubId },
      orderBy: { createdAt: 'desc' },
      include: {
        assignments: {
          include: { member: { select: { id: true, nickname: true } } },
          orderBy: { member: { nickname: 'asc' } },
        },
      },
    }),
    prisma.regularMemberPayment.findMany({
      where: { clubId: member.clubId },
      include: { member: { select: { id: true, nickname: true } } },
      orderBy: [{ member: { nickname: 'asc' } }, { id: 'asc' }],
    }),
    prisma.financeTransaction.findMany({
      where: { clubId: member.clubId },
      orderBy: { date: 'desc' },
      take: 100,
      include: {
        member: { select: { id: true, nickname: true } },
        guest: { select: { id: true, nickname: true } },
      },
    }),
    prisma.moneySource.findMany({
      where: { clubId: member.clubId },
      orderBy: { createdAt: 'asc' },
      include: { log: { orderBy: { createdAt: 'desc' } } },
    }),
  ]);

  // Compute balances per member
  const balanceRows = await prisma.financeTransaction.groupBy({
    by: ['memberId'],
    where: { clubId: member.clubId, memberId: { not: null } },
    _sum: { amount: true },
  });
  const balanceMap = new Map(balanceRows.map((r) => [r.memberId, r._sum.amount ?? 0]));

  const membersWithBalance = members.map((m) => ({
    ...m,
    balance: Math.round((balanceMap.get(m.id) ?? 0) * 100) / 100,
  }));

  // Compute balances per guest
  const guestBalanceRows = await prisma.financeTransaction.groupBy({
    by: ['guestId'],
    where: { clubId: member.clubId, guestId: { not: null } },
    _sum: { amount: true },
  });
  const guestBalanceMap = new Map(guestBalanceRows.map((r) => [r.guestId, r._sum.amount ?? 0]));

  const guestsWithBalance = guests.map((g) => ({
    ...g,
    balance: Math.round((guestBalanceMap.get(g.id) ?? 0) * 100) / 100,
  }));

  // Determine if a payoff is due
  const now = new Date();
  let payoffDue = false;
  if (settings?.autoPayoffEnabled && settings.lastPayoffAt) {
    const next = getNextPayoffDate(settings.lastPayoffAt, settings.autoPayoffFrequency, settings.autoPayoffDayOfMonth);
    payoffDue = next <= now;
  } else if (settings?.autoPayoffEnabled && !settings.lastPayoffAt) {
    payoffDue = true;
  }

  const recentTxEnriched = await enrichWithSessionDates(recentTx, member.clubId);

  const settingsSerialized = JSON.parse(JSON.stringify(settings ?? { // NOSONAR
    feeAmount: 0, feeFrequency: 'NONE', guestFeeAmount: 0,
    autoPayoffEnabled: false, autoPayoffFrequency: 'MONTHLY',
    autoPayoffDayOfMonth: 1, lastPayoffAt: null,
  }));
  const collectivesSerialized = JSON.parse(JSON.stringify(collectives)); // NOSONAR
  const regularPaymentsSerialized = JSON.parse(JSON.stringify(regularPayments)); // NOSONAR
  const recentTxSerialized = JSON.parse(JSON.stringify(recentTxEnriched)); // NOSONAR
  const moneySourcesSerialized = JSON.parse(JSON.stringify(moneySources)); // NOSONAR

  return (
    <FinanceAdminClient
      settings={settingsSerialized}
      members={membersWithBalance}
      guests={guestsWithBalance}
      collectives={collectivesSerialized}
      regularPayments={regularPaymentsSerialized}
      recentTransactions={recentTxSerialized}
      payoffDue={payoffDue}
      clubPaymentInfo={club ?? { accountHolder: '', iban: '', bic: '', paypal: '' }}
      moneySources={moneySourcesSerialized}
    />
  );
}

function getNextPayoffDate(last: Date, frequency: string, dayOfMonth: number): Date {
  const d = new Date(last);
  if (frequency === 'WEEKLY') {
    d.setDate(d.getDate() + 7);
  } else if (frequency === 'MONTHLY') {
    d.setMonth(d.getMonth() + 1);
    d.setDate(Math.min(dayOfMonth, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  } else if (frequency === 'QUARTERLY') {
    d.setMonth(d.getMonth() + 3);
    d.setDate(Math.min(dayOfMonth, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  } else if (frequency === 'YEARLY') {
    d.setFullYear(d.getFullYear() + 1);
    d.setDate(Math.min(dayOfMonth, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  }
  return d;
}
