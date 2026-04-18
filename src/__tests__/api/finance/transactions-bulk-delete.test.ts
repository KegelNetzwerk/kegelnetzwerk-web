jest.mock('@/lib/prisma', () => ({
  prisma: {
    financeTransaction: { deleteMany: jest.fn() },
  },
}));
jest.mock('@/lib/auth', () => ({ getCurrentMember: jest.fn() }));

import { NextRequest } from 'next/server';
import { DELETE } from '@/app/api/finance/transactions/bulk-delete/route';
import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockGetCurrentMember = getCurrentMember as jest.Mock;
const mockDeleteMany = prisma.financeTransaction.deleteMany as jest.Mock;

const admin = { id: 1, clubId: 10, role: 'ADMIN' };

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/finance/transactions/bulk-delete', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCurrentMember.mockResolvedValue(admin);
  mockDeleteMany.mockResolvedValue({ count: 2 });
});

describe('DELETE /api/finance/transactions/bulk-delete', () => {
  it('returns 403 when not authenticated', async () => {
    mockGetCurrentMember.mockResolvedValue(null);
    const res = await DELETE(makeRequest({ ids: [1, 2] }));
    expect(res.status).toBe(403);
  });

  it('returns 403 when not admin', async () => {
    mockGetCurrentMember.mockResolvedValue({ ...admin, role: 'USER' });
    const res = await DELETE(makeRequest({ ids: [1, 2] }));
    expect(res.status).toBe(403);
  });

  it('returns 400 when ids is not an array', async () => {
    const res = await DELETE(makeRequest({ ids: 'invalid' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when ids array is empty', async () => {
    const res = await DELETE(makeRequest({ ids: [] }));
    expect(res.status).toBe(400);
  });

  it('deletes transactions and returns count', async () => {
    const res = await DELETE(makeRequest({ ids: [1, 2] }));
    expect(res.status).toBe(200);
    const body = await res.json() as { count: number };
    expect(body.count).toBe(2);
  });

  it('filters by clubId to prevent cross-club deletion', async () => {
    await DELETE(makeRequest({ ids: [1, 2] }));
    expect(mockDeleteMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ clubId: admin.clubId }),
    }));
  });

  it('passes all ids to deleteMany', async () => {
    await DELETE(makeRequest({ ids: [5, 6, 7] }));
    expect(mockDeleteMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: { in: [5, 6, 7] } }),
    }));
  });
});
