import { prisma } from './prisma';

export interface DonationResult {
  kncBalance: number;
  euroBalance: number;
}

// Deducts amount from member's Euro balance and awards 100 KNC per €1.
// Wrapped in a single Prisma transaction for atomicity.
export async function processDonation(memberId: number, clubId: number, amount: number): Promise<DonationResult> {
  const [updatedMember, aggregate] = await prisma.$transaction(async (tx) => {
    await tx.financeTransaction.create({
      data: {
        clubId,
        memberId,
        type: 'DONATION',
        amount: -amount,
        note: '',
        date: new Date(),
      },
    });

    const updated = await tx.member.update({
      where: { id: memberId },
      data: { kncBalance: { increment: amount * 100 } },
      select: { kncBalance: true },
    });

    const agg = await tx.financeTransaction.aggregate({
      _sum: { amount: true },
      where: { memberId, clubId },
    });

    return [updated, agg];
  });

  return {
    kncBalance: updatedMember.kncBalance,
    euroBalance: Math.round((aggregate._sum.amount ?? 0) * 100) / 100,
  };
}
