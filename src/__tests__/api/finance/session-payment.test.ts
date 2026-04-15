jest.mock('@/lib/prisma', () => ({
  prisma: {
    result: { groupBy: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
    member: { findMany: jest.fn(), count: jest.fn() },
    guest: { findMany: jest.fn(), count: jest.fn() },
    financeTransaction: { createMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));
jest.mock('@/lib/auth', () => ({ getCurrentMember: jest.fn() }));

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/finance/session-payment/route';
import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockGetCurrentMember = getCurrentMember as jest.Mock;
const mockResultGroupBy = prisma.result.groupBy as jest.Mock;
const mockResultFindMany = prisma.result.findMany as jest.Mock;
const mockResultFindFirst = prisma.result.findFirst as jest.Mock;
const mockMemberFindMany = prisma.member.findMany as jest.Mock;
const mockMemberCount = prisma.member.count as jest.Mock;
const mockGuestFindMany = prisma.guest.findMany as jest.Mock;
const mockGuestCount = prisma.guest.count as jest.Mock;

const admin = { id: 1, clubId: 10, role: 'ADMIN' };
const user = { id: 2, clubId: 10, role: 'USER' };

function makeGetRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/finance/session-payment');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

function makePostRequest(body: object) {
  return new NextRequest('http://localhost/api/finance/session-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCurrentMember.mockResolvedValue(admin);
  mockResultGroupBy.mockResolvedValue([]);
  mockResultFindMany.mockResolvedValue([]);
  mockResultFindFirst.mockResolvedValue(null);
  mockMemberFindMany.mockResolvedValue([]);
  mockGuestFindMany.mockResolvedValue([]);
  (prisma.$transaction as jest.Mock).mockResolvedValue([]);
});

describe('GET /api/finance/session-payment', () => {
  it('returns 403 when not admin', async () => {
    mockGetCurrentMember.mockResolvedValue(user);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(403);
  });

  it('returns list of sessions', async () => {
    const date = new Date('2026-04-01T10:00:00Z');
    mockResultGroupBy.mockResolvedValue([{ sessionGroup: 42, _min: { date }, _count: { id: 5 } }]);

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json() as { sessions: { sessionGroup: number }[] };
    expect(body.sessions).toHaveLength(1);
    expect(body.sessions[0].sessionGroup).toBe(42);
  });

  it('returns 400 for invalid sessionGroup param', async () => {
    const res = await GET(makeGetRequest({ sessionGroup: 'abc' }));
    expect(res.status).toBe(400);
  });

  it('returns attendees for a specific session', async () => {
    mockResultFindMany
      .mockResolvedValueOnce([{ memberId: 1 }, { memberId: 2 }])
      .mockResolvedValueOnce([{ guestId: 5 }]);
    mockResultFindFirst.mockResolvedValue({ date: new Date('2026-04-01') });
    mockMemberFindMany.mockResolvedValue([{ id: 1, nickname: 'Alice' }, { id: 2, nickname: 'Bob' }]);
    mockGuestFindMany.mockResolvedValue([{ id: 5, nickname: 'Guest1' }]);

    const res = await GET(makeGetRequest({ sessionGroup: '42' }));
    expect(res.status).toBe(200);
    const body = await res.json() as { members: unknown[]; guests: unknown[] };
    expect(body.members).toHaveLength(2);
    expect(body.guests).toHaveLength(1);
  });

  it('returns empty members/guests when session has no results', async () => {
    mockResultFindMany.mockResolvedValue([]);
    mockResultFindFirst.mockResolvedValue(null);

    const res = await GET(makeGetRequest({ sessionGroup: '99' }));
    expect(res.status).toBe(200);
    const body = await res.json() as { members: unknown[]; guests: unknown[] };
    expect(body.members).toHaveLength(0);
    expect(body.guests).toHaveLength(0);
  });
});

describe('POST /api/finance/session-payment', () => {
  it('returns 403 when not admin', async () => {
    mockGetCurrentMember.mockResolvedValue(user);
    const res = await POST(makePostRequest({ sessionGroup: 1, totalAmount: 20, includedMemberIds: [1], includedGuestIds: [] }));
    expect(res.status).toBe(403);
  });

  it('returns 400 when no attendees selected', async () => {
    const res = await POST(makePostRequest({ sessionGroup: 1, totalAmount: 20, includedMemberIds: [], includedGuestIds: [] }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when totalAmount is invalid', async () => {
    const res = await POST(makePostRequest({ sessionGroup: 1, totalAmount: 0, includedMemberIds: [1], includedGuestIds: [] }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when member IDs do not belong to club', async () => {
    mockMemberCount.mockResolvedValue(0);
    mockGuestCount.mockResolvedValue(0);
    const res = await POST(makePostRequest({ sessionGroup: 1, totalAmount: 20, includedMemberIds: [99], includedGuestIds: [] }));
    expect(res.status).toBe(400);
  });

  it('creates transactions and returns txCount and perPerson', async () => {
    mockMemberCount.mockResolvedValue(2);
    mockGuestCount.mockResolvedValue(1);

    const res = await POST(makePostRequest({
      sessionGroup: 42,
      totalAmount: 30,
      includedMemberIds: [1, 2],
      includedGuestIds: [5],
    }));
    expect(res.status).toBe(200);
    const body = await res.json() as { txCount: number; perPerson: number };
    expect(body.txCount).toBe(3);
    expect(body.perPerson).toBe(-10);
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});
