jest.mock('@/lib/prisma', () => ({
  prisma: {
    clubFinanceSettings: { findUnique: jest.fn(), upsert: jest.fn() },
  },
}));
jest.mock('@/lib/auth', () => ({ getCurrentMember: jest.fn() }));

import { NextRequest } from 'next/server';
import { GET, PUT } from '@/app/api/finance/settings/route';
import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockGetCurrentMember = getCurrentMember as jest.Mock;
const mockFindUnique = prisma.clubFinanceSettings.findUnique as jest.Mock;
const mockUpsert = prisma.clubFinanceSettings.upsert as jest.Mock;

const admin = { id: 1, clubId: 10, role: 'ADMIN' };
const user  = { id: 2, clubId: 10, role: 'USER' };

const mockSettings = {
  clubId: 10, feeAmount: 5, feeFrequency: 'MONTHLY', guestFeeAmount: 3,
  autoPayoffEnabled: true, autoPayoffFrequency: 'MONTHLY', autoPayoffDayOfMonth: 1, lastPayoffAt: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCurrentMember.mockResolvedValue(admin);
});

describe('GET /api/finance/settings', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetCurrentMember.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns settings when found', async () => {
    mockFindUnique.mockResolvedValue(mockSettings);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.feeAmount).toBe(5);
  });

  it('returns defaults when settings not found', async () => {
    mockFindUnique.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.feeAmount).toBe(0);
    expect(body.feeFrequency).toBe('NONE');
  });
});

describe('PUT /api/finance/settings', () => {
  function makePutRequest(body: object) {
    return new NextRequest('http://localhost/api/finance/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  it('returns 403 when not admin', async () => {
    mockGetCurrentMember.mockResolvedValue(user);
    const res = await PUT(makePutRequest({ feeAmount: 5 }));
    expect(res.status).toBe(403);
  });

  it('upserts and returns settings', async () => {
    mockUpsert.mockResolvedValue(mockSettings);
    const res = await PUT(makePutRequest({ feeAmount: 5, feeFrequency: 'MONTHLY', autoPayoffDayOfMonth: 15 }));
    expect(res.status).toBe(200);
    expect(mockUpsert).toHaveBeenCalled();
  });

  it('clamps autoPayoffDayOfMonth to valid range', async () => {
    mockUpsert.mockResolvedValue(mockSettings);
    await PUT(makePutRequest({ autoPayoffDayOfMonth: 50 }));
    const upsertCall = mockUpsert.mock.calls[0][0];
    expect(upsertCall.create.autoPayoffDayOfMonth).toBe(28);
    expect(upsertCall.update.autoPayoffDayOfMonth).toBe(28);
  });

  it('falls back to NONE for invalid feeFrequency', async () => {
    mockUpsert.mockResolvedValue(mockSettings);
    await PUT(makePutRequest({ feeFrequency: 'INVALID' }));
    const upsertCall = mockUpsert.mock.calls[0][0];
    expect(upsertCall.create.feeFrequency).toBe('NONE');
  });
});
