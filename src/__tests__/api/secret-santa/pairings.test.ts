import { NextRequest } from 'next/server';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    member: { findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    secretSantaAssignment: { upsert: jest.fn(), deleteMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));
jest.mock('@/lib/auth', () => ({ getCurrentMember: jest.fn() }));

import { GET, PATCH } from '@/app/api/secret-santa/pairings/route';
import { prisma } from '@/lib/prisma';
import { getCurrentMember } from '@/lib/auth';

const mockGetCurrentMember = getCurrentMember as jest.Mock;
const mockMemberFindMany = prisma.member.findMany as jest.Mock;
const mockMemberFindFirst = prisma.member.findFirst as jest.Mock;
const mockTransaction = prisma.$transaction as jest.Mock;

const admin = { id: 1, clubId: 10, role: 'ADMIN' };
const member = { id: 2, clubId: 10, role: 'MEMBER' };

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/secret-santa/pairings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockTransaction.mockResolvedValue(undefined);
});

describe('GET /api/secret-santa/pairings', () => {
  it('returns 403 when not admin', async () => {
    mockGetCurrentMember.mockResolvedValue(member);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it('returns club members with their current partner', async () => {
    mockGetCurrentMember.mockResolvedValue(admin);
    mockMemberFindMany.mockResolvedValue([
      { id: 2, nickname: 'Alice', pic: 'none', secretSantaPartner: { id: 3, nickname: 'Bob', pic: 'none' } },
    ]);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].secretSantaPartner.nickname).toBe('Bob');
    expect(mockMemberFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { clubId: admin.clubId } })
    );
  });
});

describe('PATCH /api/secret-santa/pairings', () => {
  it('returns 403 when not admin', async () => {
    mockGetCurrentMember.mockResolvedValue(member);
    const res = await PATCH(makeRequest({ giverId: 2, receiverId: 3 }));
    expect(res.status).toBe(403);
  });

  it('returns 422 for self-assignment', async () => {
    mockGetCurrentMember.mockResolvedValue(admin);
    const res = await PATCH(makeRequest({ giverId: 2, receiverId: 2 }));
    expect(res.status).toBe(422);
  });

  it('returns 400 for invalid input types', async () => {
    mockGetCurrentMember.mockResolvedValue(admin);
    const res = await PATCH(makeRequest({ giverId: 'x', receiverId: 3 }));
    expect(res.status).toBe(400);
  });

  it('returns 404 when giver or receiver is not in the club', async () => {
    mockGetCurrentMember.mockResolvedValue(admin);
    mockMemberFindFirst.mockResolvedValueOnce(null); // giver lookup fails
    const res = await PATCH(makeRequest({ giverId: 2, receiverId: 3 }));
    expect(res.status).toBe(404);
  });

  it('updates the pairing on success', async () => {
    mockGetCurrentMember.mockResolvedValue(admin);
    mockMemberFindFirst.mockResolvedValueOnce({ id: 2 }).mockResolvedValueOnce({ id: 3 });
    const res = await PATCH(makeRequest({ giverId: 2, receiverId: 3 }));
    expect(res.status).toBe(200);
    expect(mockTransaction).toHaveBeenCalled();
  });

  it('clears the pairing when receiverId is null', async () => {
    mockGetCurrentMember.mockResolvedValue(admin);
    mockMemberFindFirst.mockResolvedValueOnce({ id: 2 });
    const res = await PATCH(makeRequest({ giverId: 2, receiverId: null }));
    expect(res.status).toBe(200);
    expect(mockTransaction).toHaveBeenCalled();
  });
});
