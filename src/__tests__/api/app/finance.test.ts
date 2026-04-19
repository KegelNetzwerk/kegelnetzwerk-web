jest.mock('@/lib/prisma', () => ({
  prisma: {
    financeTransaction: { aggregate: jest.fn() },
    club: { findUnique: jest.fn() },
    member: { findUnique: jest.fn() },
  },
}));
jest.mock('@/lib/appAuth', () => ({ getAppMember: jest.fn() }));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/app/finance/route';
import { getAppMember } from '@/lib/appAuth';
import { prisma } from '@/lib/prisma';

const mockGetAppMember = getAppMember as jest.Mock;
const mockAggregate = prisma.financeTransaction.aggregate as jest.Mock;
const mockClubFindUnique = prisma.club.findUnique as jest.Mock;
const mockMemberFindUnique = prisma.member.findUnique as jest.Mock;

const member = { id: 5, clubId: 10 };

function makeRequest() {
  return new NextRequest('http://localhost/api/app/finance', {
    headers: { Authorization: 'Bearer token' },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetAppMember.mockResolvedValue(member);
  mockAggregate.mockResolvedValue({ _sum: { amount: 25.5 } });
  mockClubFindUnique.mockResolvedValue({ paypal: 'club@paypal.com' });
  mockMemberFindUnique.mockResolvedValue({ kncBalance: 100 });
});

describe('GET /api/app/finance', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetAppMember.mockResolvedValue(null);
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it('returns balance, paypal, and kncBalance', async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json() as { balance: number; paypal: string; kncBalance: number };
    expect(body.balance).toBe(25.5);
    expect(body.paypal).toBe('club@paypal.com');
    expect(body.kncBalance).toBe(100);
  });

  it('returns balance 0 when aggregate sum is null', async () => {
    mockAggregate.mockResolvedValue({ _sum: { amount: null } });
    const res = await GET(makeRequest());
    const body = await res.json() as { balance: number };
    expect(body.balance).toBe(0);
  });

  it('returns paypal null when club has no paypal', async () => {
    mockClubFindUnique.mockResolvedValue({ paypal: null });
    const res = await GET(makeRequest());
    const body = await res.json() as { paypal: null };
    expect(body.paypal).toBeNull();
  });

  it('returns paypal null when club not found', async () => {
    mockClubFindUnique.mockResolvedValue(null);
    const res = await GET(makeRequest());
    const body = await res.json() as { paypal: null };
    expect(body.paypal).toBeNull();
  });

  it('returns kncBalance 0 when member not found', async () => {
    mockMemberFindUnique.mockResolvedValue(null);
    const res = await GET(makeRequest());
    const body = await res.json() as { kncBalance: number };
    expect(body.kncBalance).toBe(0);
  });

  it('rounds balance to 2 decimal places', async () => {
    mockAggregate.mockResolvedValue({ _sum: { amount: 10.12345 } });
    const res = await GET(makeRequest());
    const body = await res.json() as { balance: number };
    expect(body.balance).toBe(10.12);
  });
});
