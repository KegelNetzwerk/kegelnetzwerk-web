jest.mock('@/lib/prisma', () => ({
  prisma: { $transaction: jest.fn() },
}));

import { processDonation } from '@/lib/donate';
import { prisma } from '@/lib/prisma';

function makeTxMock(overrides?: { kncBalance?: number; euroBalance?: number }) {
  return {
    financeTransaction: {
      create: jest.fn().mockResolvedValue({ id: 1 }),
      aggregate: jest.fn().mockResolvedValue({ _sum: { amount: overrides?.euroBalance ?? -5 } }),
    },
    member: {
      update: jest.fn().mockResolvedValue({ kncBalance: overrides?.kncBalance ?? 500 }),
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  (prisma.$transaction as jest.Mock).mockImplementation(
    async (cb: (tx: unknown) => Promise<unknown>) => cb(makeTxMock()),
  );
});

describe('processDonation', () => {
  it('creates a DONATION transaction with negated amount', async () => {
    let capturedCreate: jest.Mock | undefined;
    (prisma.$transaction as jest.Mock).mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
      const tx = makeTxMock();
      capturedCreate = tx.financeTransaction.create;
      return cb(tx);
    });

    await processDonation(5, 10, 3);

    expect(capturedCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'DONATION', amount: -3, memberId: 5, clubId: 10 }),
      }),
    );
  });

  it('increments kncBalance by amount * 100', async () => {
    let capturedUpdate: jest.Mock | undefined;
    (prisma.$transaction as jest.Mock).mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
      const tx = makeTxMock({ kncBalance: 250 });
      capturedUpdate = tx.member.update;
      return cb(tx);
    });

    await processDonation(5, 10, 2.5);

    expect(capturedUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 5 },
        data: { kncBalance: { increment: 250 } },
      }),
    );
  });

  it('returns kncBalance and rounded euroBalance', async () => {
    (prisma.$transaction as jest.Mock).mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
      return cb(makeTxMock({ kncBalance: 300, euroBalance: -3 }));
    });

    const result = await processDonation(5, 10, 3);

    expect(result.kncBalance).toBe(300);
    expect(result.euroBalance).toBe(-3);
  });

  it('scopes transaction to the correct clubId', async () => {
    let capturedCreate: jest.Mock | undefined;
    (prisma.$transaction as jest.Mock).mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
      const tx = makeTxMock();
      capturedCreate = tx.financeTransaction.create;
      return cb(tx);
    });

    await processDonation(5, 99, 1);

    expect(capturedCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ clubId: 99 }) }),
    );
  });
});
