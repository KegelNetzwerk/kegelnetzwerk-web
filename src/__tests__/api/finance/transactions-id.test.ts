jest.mock('@/lib/prisma', () => ({
  prisma: {
    financeTransaction: { findUnique: jest.fn(), delete: jest.fn() },
  },
}));
jest.mock('@/lib/auth', () => ({ getCurrentMember: jest.fn() }));

import { NextRequest } from 'next/server';
import { DELETE } from '@/app/api/finance/transactions/[id]/route';
import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockGetCurrentMember = getCurrentMember as jest.Mock;
const mockFindUnique = prisma.financeTransaction.findUnique as jest.Mock;
const mockDelete = prisma.financeTransaction.delete as jest.Mock;

const admin = { id: 1, clubId: 10, role: 'ADMIN' };

function makeRequest(id: string) {
  return {
    req: new NextRequest(`http://localhost/api/finance/transactions/${id}`, { method: 'DELETE' }),
    context: { params: Promise.resolve({ id }) },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCurrentMember.mockResolvedValue(admin);
});

describe('DELETE /api/finance/transactions/[id]', () => {
  it('returns 403 when not admin', async () => {
    mockGetCurrentMember.mockResolvedValue({ ...admin, role: 'USER' });
    const { req, context } = makeRequest('1');
    const res = await DELETE(req, context);
    expect(res.status).toBe(403);
  });

  it('returns 404 when transaction not found', async () => {
    mockFindUnique.mockResolvedValue(null);
    const { req, context } = makeRequest('999');
    const res = await DELETE(req, context);
    expect(res.status).toBe(404);
  });

  it('returns 404 when transaction belongs to different club', async () => {
    mockFindUnique.mockResolvedValue({ clubId: 99, payoffEventId: null });
    const { req, context } = makeRequest('1');
    const res = await DELETE(req, context);
    expect(res.status).toBe(404);
  });

  it('returns 409 when transaction is part of payoff event', async () => {
    mockFindUnique.mockResolvedValue({ clubId: 10, payoffEventId: 5 });
    const { req, context } = makeRequest('1');
    const res = await DELETE(req, context);
    expect(res.status).toBe(409);
  });

  it('deletes transaction and returns ok', async () => {
    mockFindUnique.mockResolvedValue({ clubId: 10, payoffEventId: null });
    mockDelete.mockResolvedValue({});
    const { req, context } = makeRequest('1');
    const res = await DELETE(req, context);
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean };
    expect(body.ok).toBe(true);
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});
