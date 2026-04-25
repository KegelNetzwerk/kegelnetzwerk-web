jest.mock('@/lib/auth', () => ({ getCurrentMember: jest.fn() }));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    member: {
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/knc/reset/route';
import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockGetCurrentMember = getCurrentMember as jest.Mock;
const mockFindFirst = prisma.member.findFirst as jest.Mock;
const mockUpdate = prisma.member.update as jest.Mock;
const mockUpdateMany = prisma.member.updateMany as jest.Mock;

const admin = { id: 1, clubId: 10, role: 'ADMIN' };
const target = { id: 2, clubId: 10, nickname: 'Hans' };

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/knc/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCurrentMember.mockResolvedValue(admin);
  mockFindFirst.mockResolvedValue(target);
  mockUpdate.mockResolvedValue({ id: 2, kncBalance: 0 });
  mockUpdateMany.mockResolvedValue({ count: 5 });
});

describe('POST /api/knc/reset', () => {
  it('returns 403 when not authenticated', async () => {
    mockGetCurrentMember.mockResolvedValue(null);
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(403);
  });

  it('returns 403 when authenticated as non-admin', async () => {
    mockGetCurrentMember.mockResolvedValue({ ...admin, role: 'MEMBER' });
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(403);
  });

  describe('single member reset', () => {
    it('returns 404 when member not found in club', async () => {
      mockFindFirst.mockResolvedValue(null);
      const res = await POST(makeRequest({ memberId: 99 }));
      expect(res.status).toBe(404);
    });

    it('resets one member and returns resetCount 1', async () => {
      const res = await POST(makeRequest({ memberId: 2 }));
      expect(res.status).toBe(200);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { kncBalance: 0 },
      });
      const body = await res.json() as { resetCount: number };
      expect(body.resetCount).toBe(1);
    });

    it('does not call updateMany when memberId is provided', async () => {
      await POST(makeRequest({ memberId: 2 }));
      expect(mockUpdateMany).not.toHaveBeenCalled();
    });
  });

  describe('reset all members', () => {
    it('resets all club members and returns resetCount', async () => {
      const res = await POST(makeRequest({}));
      expect(res.status).toBe(200);
      expect(mockUpdateMany).toHaveBeenCalledWith({
        where: { clubId: admin.clubId },
        data: { kncBalance: 0 },
      });
      const body = await res.json() as { resetCount: number };
      expect(body.resetCount).toBe(5);
    });

    it('does not call single-member update when no memberId provided', async () => {
      await POST(makeRequest({}));
      expect(mockUpdate).not.toHaveBeenCalled();
      expect(mockFindFirst).not.toHaveBeenCalled();
    });
  });
});
