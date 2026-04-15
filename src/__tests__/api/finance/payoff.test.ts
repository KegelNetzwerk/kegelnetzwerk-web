jest.mock('@/lib/prisma', () => ({
  prisma: {
    clubFinanceSettings: { findUnique: jest.fn(), upsert: jest.fn() },
    result: { findMany: jest.fn() },
    member: { findMany: jest.fn() },
    regularMemberPayment: { findMany: jest.fn() },
    payoffEvent: { create: jest.fn() },
    financeTransaction: { createMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));
jest.mock('@/lib/auth', () => ({ getCurrentMember: jest.fn() }));

import { GET, POST } from '@/app/api/finance/payoff/route';
import { NextRequest } from 'next/server';
import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockGetCurrentMember = getCurrentMember as jest.Mock;
const mockSettingsFindUnique = prisma.clubFinanceSettings.findUnique as jest.Mock;
const mockResultFindMany = prisma.result.findMany as jest.Mock;
const mockMemberFindMany = prisma.member.findMany as jest.Mock;
const mockRegularPayments = prisma.regularMemberPayment.findMany as jest.Mock;

const admin = { id: 1, clubId: 10, role: 'ADMIN' };
const user = { id: 2, clubId: 10, role: 'USER' };

const mockSettings = {
  clubId: 10, feeAmount: 5, feeFrequency: 'MONTHLY', guestFeeAmount: 0,
  lastPayoffAt: null, autoPayoffEnabled: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCurrentMember.mockResolvedValue(admin);
  mockSettingsFindUnique.mockResolvedValue(mockSettings);
  mockResultFindMany.mockResolvedValue([]);
  mockMemberFindMany.mockResolvedValue([]);
  mockRegularPayments.mockResolvedValue([]);
});

describe('GET /api/finance/payoff', () => {
  it('returns 403 when not admin', async () => {
    mockGetCurrentMember.mockResolvedValue(user);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it('returns payoff preview data', async () => {
    mockMemberFindMany.mockResolvedValue([{ id: 1, nickname: 'Alice' }]);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json() as { feeAmount: number; memberCount: number };
    expect(body.feeAmount).toBe(5);
    expect(body.memberCount).toBe(1);
  });

  it('includes penalty totals by member', async () => {
    mockResultFindMany.mockResolvedValue([
      { memberId: 1, member: { id: 1, nickname: 'Alice' }, value: 2, part: { value: 2, factor: 1, bonus: 0 } },
    ]);
    mockMemberFindMany.mockResolvedValue([{ id: 1, nickname: 'Alice' }]);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json() as { penaltiesByMember: { memberId: number; penaltyTotal: number }[] };
    expect(body.penaltiesByMember).toHaveLength(1);
    expect(body.penaltiesByMember[0].penaltyTotal).toBe(2);
  });

  it('uses null fromDate when settings is null', async () => {
    mockSettingsFindUnique.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json() as { fromDate: null; feeAmount: number };
    expect(body.fromDate).toBeNull();
    expect(body.feeAmount).toBe(0);
  });
});

describe('POST /api/finance/payoff', () => {
  function makeRequest(body: object = {}) {
    return new NextRequest('http://localhost/api/finance/payoff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  beforeEach(() => {
    // Mock the $transaction to call the callback and return its result
    (prisma.$transaction as jest.Mock).mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
      const txMock = {
        payoffEvent: {
          create: jest.fn().mockResolvedValue({ id: 99 }),
        },
        financeTransaction: {
          createMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        clubFinanceSettings: {
          upsert: jest.fn().mockResolvedValue({}),
        },
      };
      return cb(txMock);
    });
  });

  it('returns 403 when not admin', async () => {
    mockGetCurrentMember.mockResolvedValue(user);
    const res = await POST(makeRequest());
    expect(res.status).toBe(403);
  });

  it('executes payoff and returns result', async () => {
    mockMemberFindMany.mockResolvedValue([{ id: 1 }]);
    const res = await POST(makeRequest({ note: 'Test payoff' }));
    expect(res.status).toBe(200);
    const body = await res.json() as { payoffEventId: number; txCount: number };
    expect(body.payoffEventId).toBe(99);
  });

  it('creates penalty transactions for members with results', async () => {
    mockResultFindMany.mockResolvedValueOnce([
      { memberId: 1, value: 2, part: { value: 2, factor: 1, bonus: 0 } },
    ]).mockResolvedValue([]);
    mockMemberFindMany.mockResolvedValue([{ id: 1 }]);

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('counts regular income payments', async () => {
    mockMemberFindMany.mockResolvedValue([{ id: 1 }]);
    mockRegularPayments.mockResolvedValue([{ memberId: 1, amount: 10, note: 'Sponsoring' }]);
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
  });
});
