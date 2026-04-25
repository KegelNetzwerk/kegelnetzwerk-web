jest.mock('@/lib/auth', () => ({ getCurrentMember: jest.fn() }));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    member: {
      updateMany: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/knc/adjust-all/route';
import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockGetCurrentMember = getCurrentMember as jest.Mock;
const mockUpdateMany = prisma.member.updateMany as jest.Mock;
const mockFindMany = prisma.member.findMany as jest.Mock;

const admin = { id: 1, clubId: 10, role: 'ADMIN' };
const updatedMembers = [
  { id: 2, kncBalance: 150 },
  { id: 3, kncBalance: 250 },
];

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/knc/adjust-all', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCurrentMember.mockResolvedValue(admin);
  mockUpdateMany.mockResolvedValue({ count: 2 });
  mockFindMany.mockResolvedValue(updatedMembers);
});

describe('POST /api/knc/adjust-all', () => {
  it('returns 403 when not authenticated', async () => {
    mockGetCurrentMember.mockResolvedValue(null);
    const res = await POST(makeRequest({ delta: 50 }));
    expect(res.status).toBe(403);
  });

  it('returns 403 when authenticated as non-admin', async () => {
    mockGetCurrentMember.mockResolvedValue({ ...admin, role: 'MEMBER' });
    const res = await POST(makeRequest({ delta: 50 }));
    expect(res.status).toBe(403);
  });

  it('returns 400 when delta is missing', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('returns 400 when delta is zero', async () => {
    const res = await POST(makeRequest({ delta: 0 }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when delta is Infinity', async () => {
    const res = await POST(makeRequest({ delta: Infinity }));
    expect(res.status).toBe(400);
  });

  it('calls updateMany scoped to clubId and returns all updated members', async () => {
    const res = await POST(makeRequest({ delta: 50 }));
    expect(res.status).toBe(200);
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { clubId: admin.clubId },
      data: { kncBalance: { increment: 50 } },
    });
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { clubId: admin.clubId },
      select: { id: true, kncBalance: true },
    });
    const body = await res.json() as { id: number; kncBalance: number }[];
    expect(body).toEqual(updatedMembers);
  });

  it('applies a negative delta to all members', async () => {
    await POST(makeRequest({ delta: -100 }));
    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { kncBalance: { increment: -100 } } }),
    );
  });
});
