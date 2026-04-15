jest.mock('@/lib/prisma', () => ({
  prisma: {
    member: { findMany: jest.fn() },
    financeTransaction: { groupBy: jest.fn(), createMany: jest.fn() },
  },
}));
jest.mock('@/lib/auth', () => ({ getCurrentMember: jest.fn() }));

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/finance/reset/route';
import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockGetCurrentMember = getCurrentMember as jest.Mock;
const mockFindMany = prisma.member.findMany as jest.Mock;
const mockGroupBy = prisma.financeTransaction.groupBy as jest.Mock;
const mockCreateMany = prisma.financeTransaction.createMany as jest.Mock;

const admin = { id: 1, clubId: 10, role: 'ADMIN' };

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/finance/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCurrentMember.mockResolvedValue(admin);
});

describe('POST /api/finance/reset', () => {
  it('returns 403 when not admin', async () => {
    mockGetCurrentMember.mockResolvedValue({ ...admin, role: 'USER' });
    const res = await POST(makeRequest({ confirm: true }));
    expect(res.status).toBe(403);
  });

  it('returns 400 when confirm is missing', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('creates reset transactions for members with non-zero balances', async () => {
    mockFindMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    mockGroupBy.mockResolvedValue([
      { memberId: 1, _sum: { amount: 10 } },
      { memberId: 2, _sum: { amount: 0 } },
    ]);
    mockCreateMany.mockResolvedValue({ count: 1 });

    const res = await POST(makeRequest({ confirm: true }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.resetCount).toBe(1);
    expect(mockCreateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.arrayContaining([
        expect.objectContaining({ memberId: 1, amount: -10 }),
      ]),
    }));
  });

  it('skips createMany when all balances are zero', async () => {
    mockFindMany.mockResolvedValue([{ id: 1 }]);
    mockGroupBy.mockResolvedValue([{ memberId: 1, _sum: { amount: 0 } }]);

    const res = await POST(makeRequest({ confirm: true }));
    expect(res.status).toBe(200);
    expect(mockCreateMany).not.toHaveBeenCalled();
  });

  it('uses provided memberIds instead of fetching all', async () => {
    mockGroupBy.mockResolvedValue([{ memberId: 5, _sum: { amount: -3 } }]);
    mockCreateMany.mockResolvedValue({ count: 1 });

    await POST(makeRequest({ confirm: true, memberIds: [5] }));
    expect(mockFindMany).not.toHaveBeenCalled();
    expect(mockGroupBy).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ memberId: { in: [5] } }),
    }));
  });
});
