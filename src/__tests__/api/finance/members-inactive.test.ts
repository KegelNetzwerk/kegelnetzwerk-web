jest.mock('@/lib/prisma', () => ({
  prisma: {
    member: { findUnique: jest.fn(), update: jest.fn() },
  },
}));
jest.mock('@/lib/auth', () => ({ getCurrentMember: jest.fn() }));

import { NextRequest } from 'next/server';
import { PATCH } from '@/app/api/finance/members/[id]/inactive/route';
import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockGetCurrentMember = getCurrentMember as jest.Mock;
const mockFindUnique = prisma.member.findUnique as jest.Mock;
const mockUpdate = prisma.member.update as jest.Mock;

const admin = { id: 1, clubId: 10, role: 'ADMIN' };

function makeRequest(id: string, body: object) {
  return new NextRequest(`http://localhost/api/finance/members/${id}/inactive`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCurrentMember.mockResolvedValue(admin);
  mockFindUnique.mockResolvedValue({ clubId: 10 });
  mockUpdate.mockResolvedValue({ id: 2, isInactive: true });
});

describe('PATCH /api/finance/members/[id]/inactive', () => {
  it('returns 403 when not authenticated', async () => {
    mockGetCurrentMember.mockResolvedValue(null);
    const res = await PATCH(makeRequest('2', { isInactive: true }), makeParams('2'));
    expect(res.status).toBe(403);
  });

  it('returns 403 when not admin', async () => {
    mockGetCurrentMember.mockResolvedValue({ ...admin, role: 'USER' });
    const res = await PATCH(makeRequest('2', { isInactive: true }), makeParams('2'));
    expect(res.status).toBe(403);
  });

  it('returns 404 when member not found', async () => {
    mockFindUnique.mockResolvedValue(null);
    const res = await PATCH(makeRequest('99', { isInactive: true }), makeParams('99'));
    expect(res.status).toBe(404);
  });

  it('returns 404 when member belongs to different club', async () => {
    mockFindUnique.mockResolvedValue({ clubId: 99 });
    const res = await PATCH(makeRequest('2', { isInactive: true }), makeParams('2'));
    expect(res.status).toBe(404);
  });

  it('sets member inactive and returns updated member', async () => {
    const res = await PATCH(makeRequest('2', { isInactive: true }), makeParams('2'));
    expect(res.status).toBe(200);
    const body = await res.json() as { id: number; isInactive: boolean };
    expect(body.isInactive).toBe(true);
  });

  it('sets member active (isInactive: false)', async () => {
    mockUpdate.mockResolvedValue({ id: 2, isInactive: false });
    const res = await PATCH(makeRequest('2', { isInactive: false }), makeParams('2'));
    expect(res.status).toBe(200);
    const body = await res.json() as { isInactive: boolean };
    expect(body.isInactive).toBe(false);
  });

  it('calls update with correct data', async () => {
    await PATCH(makeRequest('2', { isInactive: true }), makeParams('2'));
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 2 },
      data: { isInactive: true },
    }));
  });
});
