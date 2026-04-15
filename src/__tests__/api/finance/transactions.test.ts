jest.mock('@/lib/prisma', () => ({
  prisma: {
    financeTransaction: { count: jest.fn(), findMany: jest.fn(), create: jest.fn() },
    member: { findUnique: jest.fn() },
    result: { groupBy: jest.fn() },
  },
}));
jest.mock('@/lib/auth', () => ({ getCurrentMember: jest.fn() }));

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/finance/transactions/route';
import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockGetCurrentMember = getCurrentMember as jest.Mock;
const mockCount = prisma.financeTransaction.count as jest.Mock;
const mockFindMany = prisma.financeTransaction.findMany as jest.Mock;
const mockCreate = prisma.financeTransaction.create as jest.Mock;
const mockMemberFindUnique = prisma.member.findUnique as jest.Mock;
const mockResultGroupBy = prisma.result.groupBy as jest.Mock;

const admin = { id: 1, clubId: 10, role: 'ADMIN' };
const user = { id: 2, clubId: 10, role: 'USER' };

function makeGetRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/finance/transactions');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

function makePostRequest(body: object) {
  return new NextRequest('http://localhost/api/finance/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCurrentMember.mockResolvedValue(admin);
  mockCount.mockResolvedValue(0);
  mockFindMany.mockResolvedValue([]);
  mockResultGroupBy.mockResolvedValue([]);
});

describe('GET /api/finance/transactions', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetCurrentMember.mockResolvedValue(null);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  it('returns transactions for the authenticated member', async () => {
    mockGetCurrentMember.mockResolvedValue(user);
    const tx = { id: 1, type: 'PENALTY', amount: -5, sessionGroup: null };
    mockCount.mockResolvedValue(1);
    mockFindMany.mockResolvedValue([tx]);

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json() as { transactions: { id: number }[] };
    expect(body.transactions).toHaveLength(1);
  });

  it('allows admin to view another member', async () => {
    const res = await GET(makeGetRequest({ memberId: '5' }));
    expect(res.status).toBe(200);
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ memberId: 5 }),
    }));
  });

  it('enriches SESSION_PAYMENT transactions with sessionDate', async () => {
    const date = new Date('2026-04-01T10:00:00Z');
    mockFindMany.mockResolvedValue([{ id: 1, type: 'SESSION_PAYMENT', sessionGroup: 42 }]);
    mockResultGroupBy.mockResolvedValue([{ sessionGroup: 42, _min: { date } }]);

    const res = await GET(makeGetRequest({ memberId: '1' }));
    expect(res.status).toBe(200);
    const body = await res.json() as { transactions: { sessionDate: string }[] };
    expect(body.transactions[0].sessionDate).toBe(date.toISOString());
  });

  it('returns sessionDate null for non-SESSION_PAYMENT', async () => {
    mockFindMany.mockResolvedValue([{ id: 2, type: 'PENALTY', sessionGroup: null }]);
    const res = await GET(makeGetRequest());
    const body = await res.json() as { transactions: { sessionDate: unknown }[] };
    expect(body.transactions[0].sessionDate).toBeNull();
    expect(mockResultGroupBy).not.toHaveBeenCalled();
  });
});

describe('POST /api/finance/transactions', () => {
  it('returns 403 when not admin', async () => {
    mockGetCurrentMember.mockResolvedValue(user);
    const res = await POST(makePostRequest({ type: 'MANUAL', amount: 10, memberId: 2 }));
    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid type', async () => {
    const res = await POST(makePostRequest({ type: 'INVALID', amount: 10, memberId: 2 }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when memberId missing for non-CLUB_PURCHASE', async () => {
    const res = await POST(makePostRequest({ type: 'MANUAL', amount: 10 }));
    expect(res.status).toBe(400);
  });

  it('returns 404 when member not in club', async () => {
    mockMemberFindUnique.mockResolvedValue({ clubId: 99 });
    const res = await POST(makePostRequest({ type: 'MANUAL', amount: 10, memberId: 5 }));
    expect(res.status).toBe(404);
  });

  it('creates transaction and returns it', async () => {
    mockMemberFindUnique.mockResolvedValue({ clubId: 10 });
    const created = { id: 100, type: 'MANUAL', amount: 10 };
    mockCreate.mockResolvedValue(created);

    const res = await POST(makePostRequest({ type: 'MANUAL', amount: 10, memberId: 2 }));
    expect(res.status).toBe(200);
    const body = await res.json() as { id: number };
    expect(body.id).toBe(100);
  });
});
