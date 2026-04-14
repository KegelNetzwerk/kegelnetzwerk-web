jest.mock('@/lib/prisma', () => ({
  prisma: {
    financeTransaction: { deleteMany: jest.fn() },
    payoffEvent: { deleteMany: jest.fn() },
    clubFinanceSettings: { updateMany: jest.fn() },
    collectiveChargeAssignment: { updateMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));
jest.mock('@/lib/auth', () => ({ getCurrentMember: jest.fn() }));

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/finance/log/clear/route';
import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockGetCurrentMember = getCurrentMember as jest.Mock;

const admin = { id: 1, clubId: 10, role: 'ADMIN', nickname: 'Admin' };

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/finance/log/clear', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCurrentMember.mockResolvedValue(admin);
  (prisma.$transaction as jest.Mock).mockResolvedValue([]);
});

describe('POST /api/finance/log/clear', () => {
  it('returns 403 when not authenticated', async () => {
    mockGetCurrentMember.mockResolvedValue(null);
    const res = await POST(makeRequest({ confirm: 'clear log' }));
    expect(res.status).toBe(403);
  });

  it('returns 403 when not admin', async () => {
    mockGetCurrentMember.mockResolvedValue({ ...admin, role: 'USER' });
    const res = await POST(makeRequest({ confirm: 'clear log' }));
    expect(res.status).toBe(403);
  });

  it('returns 400 when confirm is missing', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it('returns 400 when confirm value is wrong', async () => {
    const res = await POST(makeRequest({ confirm: 'wrong' }));
    expect(res.status).toBe(400);
  });

  it('returns 200 and runs transaction on valid confirm', async () => {
    const res = await POST(makeRequest({ confirm: 'clear log' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});
