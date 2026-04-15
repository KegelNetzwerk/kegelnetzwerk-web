jest.mock('@/lib/prisma', () => ({
  prisma: {
    member: { findMany: jest.fn() },
    financeTransaction: { createMany: jest.fn() },
  },
}));
jest.mock('@/lib/auth', () => ({ getCurrentMember: jest.fn() }));

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/finance/transactions/bulk/route';
import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockGetCurrentMember = getCurrentMember as jest.Mock;
const mockFindMany = prisma.member.findMany as jest.Mock;
const mockCreateMany = prisma.financeTransaction.createMany as jest.Mock;

const admin = { id: 1, clubId: 10, role: 'ADMIN' };

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/finance/transactions/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCurrentMember.mockResolvedValue(admin);
});

describe('POST /api/finance/transactions/bulk', () => {
  it('returns 403 when not admin', async () => {
    mockGetCurrentMember.mockResolvedValue({ ...admin, role: 'USER' });
    const res = await POST(makeRequest({ type: 'MANUAL', amount: 5 }));
    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid type', async () => {
    const res = await POST(makeRequest({ type: 'INVALID', amount: 5 }));
    expect(res.status).toBe(400);
  });

  it('creates transactions for all members in club', async () => {
    mockFindMany.mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }]);
    mockCreateMany.mockResolvedValue({ count: 3 });

    const res = await POST(makeRequest({ type: 'MANUAL', amount: 5 }));
    expect(res.status).toBe(200);
    const body = await res.json() as { count: number };
    expect(body.count).toBe(3);
    expect(mockCreateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.arrayContaining([
        expect.objectContaining({ memberId: 1, amount: 5 }),
      ]),
    }));
  });

  it('excludes specified memberIds', async () => {
    mockFindMany.mockResolvedValue([{ id: 2 }]);
    mockCreateMany.mockResolvedValue({ count: 1 });

    await POST(makeRequest({ type: 'MANUAL', amount: 5, excludedMemberIds: [1] }));
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: { notIn: [1] } }),
    }));
  });
});
