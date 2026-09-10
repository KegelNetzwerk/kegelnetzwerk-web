import { NextRequest } from 'next/server';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    member: { findMany: jest.fn(), update: jest.fn() },
    secretSantaAssignment: { findMany: jest.fn(), upsert: jest.fn() },
    $transaction: jest.fn(),
  },
}));
jest.mock('@/lib/auth', () => ({ getCurrentMember: jest.fn() }));

import { POST } from '@/app/api/secret-santa/route';
import { prisma } from '@/lib/prisma';
import { getCurrentMember } from '@/lib/auth';

const mockGetCurrentMember = getCurrentMember as jest.Mock;
const mockMemberFindMany = prisma.member.findMany as jest.Mock;
const mockAssignmentFindMany = prisma.secretSantaAssignment.findMany as jest.Mock;
const mockTransaction = prisma.$transaction as jest.Mock;

const admin = { id: 1, clubId: 10, role: 'ADMIN' };
const nonAdmin = { id: 2, clubId: 10, role: 'MEMBER' };

function makeRequest() {
  return new NextRequest('http://localhost/api/secret-santa', { method: 'POST' });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAssignmentFindMany.mockResolvedValue([]);
  mockTransaction.mockResolvedValue(undefined);
});

describe('POST /api/secret-santa', () => {
  it('returns 403 when not admin', async () => {
    mockGetCurrentMember.mockResolvedValue(nonAdmin);
    const res = await POST(makeRequest());
    expect(res.status).toBe(403);
  });

  it('excludes inactive members from the member pool used for the draw', async () => {
    mockGetCurrentMember.mockResolvedValue(admin);
    mockMemberFindMany.mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }]);
    await POST(makeRequest());
    expect(mockMemberFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { clubId: admin.clubId, isInactive: false } })
    );
  });

  it('returns 422 when fewer than 2 active members remain', async () => {
    mockGetCurrentMember.mockResolvedValue(admin);
    mockMemberFindMany.mockResolvedValue([{ id: 1 }]);
    const res = await POST(makeRequest());
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toBe('notEnoughMembers');
  });

  it('draws and persists assignments for the active members', async () => {
    mockGetCurrentMember.mockResolvedValue(admin);
    mockMemberFindMany.mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }]);
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.count).toBe(3);
    expect(mockTransaction).toHaveBeenCalled();
  });
});
