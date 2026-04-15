import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { enrichWithSessionDates } from '@/lib/finance-utils';
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

  const transactionsEnriched = await enrichWithSessionDates(transactions, member.clubId);

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
