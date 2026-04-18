jest.mock('@/lib/prisma', () => ({
  prisma: {
    financeTransaction: { create: jest.fn(), aggregate: jest.fn() },
    member: { update: jest.fn() },
    $transaction: jest.fn(),
  },
}));
jest.mock('@/lib/appAuth', () => ({ getAppMember: jest.fn() }));

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/app/finance/donate/route';
import { getAppMember } from '@/lib/appAuth';
import { prisma } from '@/lib/prisma';

const mockGetAppMember = getAppMember as jest.Mock;

const member = { id: 5, clubId: 10 };

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/app/finance/donate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token' },
    body: JSON.stringify(body),
  });
}

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
  mockGetAppMember.mockResolvedValue(member);
  (prisma.$transaction as jest.Mock).mockImplementation(
    async (cb: (tx: unknown) => Promise<unknown>) => cb(makeTxMock()),
  );
});

describe('POST /api/app/finance/donate', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetAppMember.mockResolvedValue(null);
    const res = await POST(makeRequest({ amount: 5 }));
    expect(res.status).toBe(401);
  });

  it('returns 400 for missing amount', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('returns 400 for zero amount', async () => {
    const res = await POST(makeRequest({ amount: 0 }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for negative amount', async () => {
    const res = await POST(makeRequest({ amount: -1 }));
    expect(res.status).toBe(400);
  });

  it('awards 100 KNC per €1 donated', async () => {
    let capturedUpdate: jest.Mock | undefined;
    (prisma.$transaction as jest.Mock).mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
      const tx = makeTxMock({ kncBalance: 250 });
      capturedUpdate = tx.member.update;
      return cb(tx);
    });

    await POST(makeRequest({ amount: 2.5 }));

    expect(capturedUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { kncBalance: { increment: 250 } },
        where: { id: member.id },
      }),
    );
  });

  it('creates a DONATION transaction with negated amount', async () => {
    let capturedCreate: jest.Mock | undefined;
    (prisma.$transaction as jest.Mock).mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
      const tx = makeTxMock();
      capturedCreate = tx.financeTransaction.create;
      return cb(tx);
    });

    await POST(makeRequest({ amount: 5 }));

    expect(capturedCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'DONATION',
          amount: -5,
          memberId: member.id,
          clubId: member.clubId,
        }),
      }),
    );
  });

  it('returns kncBalance and euroBalance on success', async () => {
    (prisma.$transaction as jest.Mock).mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
      return cb(makeTxMock({ kncBalance: 500, euroBalance: -5 }));
    });

    const res = await POST(makeRequest({ amount: 5 }));
    expect(res.status).toBe(200);
    const body = await res.json() as { kncBalance: number; euroBalance: number };
    expect(body.kncBalance).toBe(500);
    expect(body.euroBalance).toBe(-5);
  });

  it('scopes the transaction to the member\'s club', async () => {
    let capturedCreate: jest.Mock | undefined;
    (prisma.$transaction as jest.Mock).mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
      const tx = makeTxMock();
      capturedCreate = tx.financeTransaction.create;
      return cb(tx);
    });

    await POST(makeRequest({ amount: 1 }));

    expect(capturedCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ clubId: member.clubId }),
      }),
    );
  });
});
