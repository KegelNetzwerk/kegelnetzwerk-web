import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import FinancePageClient from './FinancePageClient';

export default async function FinancePage() {
  const member = await getCurrentMember();
  if (!member) redirect('/login');

  const [balanceResult, transactions, allMembers, club] = await Promise.all([
    prisma.financeTransaction.aggregate({
      where: { memberId: member.id },
      _sum: { amount: true },
    }),
    prisma.financeTransaction.findMany({
      where: { memberId: member.id },
      orderBy: { date: 'desc' },
      take: 50,
    }),
    // Admins can view any member's history
    member.role === Role.ADMIN
      ? prisma.member.findMany({
          where: { clubId: member.clubId },
          select: { id: true, nickname: true },
          orderBy: { nickname: 'asc' },
        })
      : Promise.resolve([] as { id: number; nickname: string }[]),
    prisma.club.findUnique({
      where: { id: member.clubId },
      select: { accountHolder: true, iban: true, bic: true, paypal: true },
    }),
  ]);

  const balance = Math.round(((balanceResult._sum.amount ?? 0) * 100)) / 100;

  // Enrich SESSION_PAYMENT transactions with session date from Result table
  const sessionGroups = [...new Set(
    transactions
      .filter((tx) => tx.type === 'SESSION_PAYMENT' && tx.sessionGroup !== null)
      .map((tx) => tx.sessionGroup as number),
  )];
  const sessionDateMap: Record<number, string> = {};
  if (sessionGroups.length > 0) {
    const sessionDates = await prisma.result.groupBy({
      by: ['sessionGroup'],
      where: { clubId: member.clubId, sessionGroup: { in: sessionGroups } },
      _min: { date: true },
    });
    for (const s of sessionDates) {
      if (s._min.date) sessionDateMap[s.sessionGroup] = s._min.date.toISOString();
    }
  }
  const transactionsEnriched = transactions.map((tx) => ({
    ...tx,
    sessionDate: tx.sessionGroup !== null ? (sessionDateMap[tx.sessionGroup] ?? null) : null,
  }));

  return (
    <FinancePageClient
      memberId={member.id}
      memberNickname={member.nickname}
      isAdmin={member.role === Role.ADMIN}
      initialBalance={balance}
      initialTransactions={JSON.parse(JSON.stringify(transactionsEnriched))} // NOSONAR
      allMembers={allMembers}
      clubPaymentInfo={club ?? { accountHolder: '', iban: '', bic: '', paypal: '' }}
    />
  );
}
