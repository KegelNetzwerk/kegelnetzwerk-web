jest.mock('@/lib/auth', () => ({ getCurrentMember: jest.fn() }));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    member: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/knc/adjust/route';
import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockGetCurrentMember = getCurrentMember as jest.Mock;
const mockFindFirst = prisma.member.findFirst as jest.Mock;
const mockUpdate = prisma.member.update as jest.Mock;

const admin = { id: 1, clubId: 10, role: 'ADMIN' };
const target = { id: 2, clubId: 10, nickname: 'Hans' };

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/knc/adjust', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCurrentMember.mockResolvedValue(admin);
  mockFindFirst.mockResolvedValue(target);
  mockUpdate.mockResolvedValue({ id: 2, kncBalance: 150 });
});

describe('POST /api/knc/adjust', () => {
  it('returns 403 when not authenticated', async () => {
    mockGetCurrentMember.mockResolvedValue(null);
    const res = await POST(makeRequest({ memberId: 2, delta: 50 }));
    expect(res.status).toBe(403);
  });

  it('returns 403 when authenticated as non-admin', async () => {
    mockGetCurrentMember.mockResolvedValue({ ...admin, role: 'MEMBER' });
    const res = await POST(makeRequest({ memberId: 2, delta: 50 }));
    expect(res.status).toBe(403);
  });

  it('returns 400 when memberId is missing', async () => {
    const res = await POST(makeRequest({ delta: 50 }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when delta is missing', async () => {
    const res = await POST(makeRequest({ memberId: 2 }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when delta is zero', async () => {
    const res = await POST(makeRequest({ memberId: 2, delta: 0 }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when delta is Infinity', async () => {
    const res = await POST(makeRequest({ memberId: 2, delta: Infinity }));
    expect(res.status).toBe(400);
  });

  it('returns 404 when member not found in club', async () => {
    mockFindFirst.mockResolvedValue(null);
    const res = await POST(makeRequest({ memberId: 99, delta: 50 }));
    expect(res.status).toBe(404);
  });

  it('increments kncBalance and returns updated member', async () => {
    const res = await POST(makeRequest({ memberId: 2, delta: 50 }));
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 2 },
      data: { kncBalance: { increment: 50 } },
      select: { id: true, kncBalance: true },
    });
    const body = await res.json() as { id: number; kncBalance: number };
    expect(body.kncBalance).toBe(150);
  });

  it('decrements kncBalance with a negative delta', async () => {
    mockUpdate.mockResolvedValue({ id: 2, kncBalance: 50 });
    const res = await POST(makeRequest({ memberId: 2, delta: -50 }));
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { kncBalance: { increment: -50 } } }),
    );
  });
});
