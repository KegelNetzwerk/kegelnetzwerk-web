import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import FinancePageClient from './FinancePageClient';

export default async function FinancePage() {
  const member = await getCurrentMember();
  if (!member) redirect('/login');

  const [balanceResult, transactions, allMembers] = await Promise.all([
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
  ]);

  const balance = Math.round(((balanceResult._sum.amount ?? 0) * 100)) / 100;

  return (
    <FinancePageClient
      memberId={member.id}
      memberNickname={member.nickname}
      isAdmin={member.role === Role.ADMIN}
      initialBalance={balance}
      initialTransactions={JSON.parse(JSON.stringify(transactions))}
      allMembers={allMembers}
    />
  );
}
