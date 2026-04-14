jest.mock('@/lib/prisma', () => ({
  prisma: {
    regularMemberPayment: { findMany: jest.fn(), create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
    member: { findUnique: jest.fn() },
  },
}));
jest.mock('@/lib/auth', () => ({ getCurrentMember: jest.fn() }));

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/finance/regular-payments/route';
import { PUT, DELETE } from '@/app/api/finance/regular-payments/[id]/route';
import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockGetCurrentMember = getCurrentMember as jest.Mock;
const mockFindMany = prisma.regularMemberPayment.findMany as jest.Mock;
const mockCreate = prisma.regularMemberPayment.create as jest.Mock;
const mockFindUnique = prisma.regularMemberPayment.findUnique as jest.Mock;
const mockUpdate = prisma.regularMemberPayment.update as jest.Mock;
const mockDelete = prisma.regularMemberPayment.delete as jest.Mock;
const mockMemberFindUnique = prisma.member.findUnique as jest.Mock;

const admin = { id: 1, clubId: 10, role: 'ADMIN' };
const user = { id: 2, clubId: 10, role: 'USER' };

function makePostRequest(body: object) {
  return new NextRequest('http://localhost/api/finance/regular-payments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makePutRequest(id: string, body: object) {
  return {
    req: new NextRequest(`http://localhost/api/finance/regular-payments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    context: { params: Promise.resolve({ id }) },
  };
}

function makeDeleteRequest(id: string) {
  return {
    req: new NextRequest(`http://localhost/api/finance/regular-payments/${id}`, { method: 'DELETE' }),
    context: { params: Promise.resolve({ id }) },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCurrentMember.mockResolvedValue(admin);
});

describe('GET /api/finance/regular-payments', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetCurrentMember.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns all payments for admin', async () => {
    mockFindMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json() as unknown[];
    expect(body).toHaveLength(2);
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { clubId: 10 },
    }));
  });

  it('returns only own payments for user', async () => {
    mockGetCurrentMember.mockResolvedValue(user);
    mockFindMany.mockResolvedValue([{ id: 3 }]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { memberId: 2 },
    }));
  });
});

describe('POST /api/finance/regular-payments', () => {
  it('returns 403 when not admin', async () => {
    mockGetCurrentMember.mockResolvedValue(user);
    const res = await POST(makePostRequest({ memberId: 2, amount: 5, frequency: 'MONTHLY' }));
    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid frequency', async () => {
    const res = await POST(makePostRequest({ memberId: 2, amount: 5, frequency: 'INVALID' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for NONE frequency', async () => {
    const res = await POST(makePostRequest({ memberId: 2, amount: 5, frequency: 'NONE' }));
    expect(res.status).toBe(400);
  });

  it('returns 404 when member not in club', async () => {
    mockMemberFindUnique.mockResolvedValue({ clubId: 99 });
    const res = await POST(makePostRequest({ memberId: 5, amount: 5, frequency: 'MONTHLY' }));
    expect(res.status).toBe(404);
  });

  it('creates and returns payment', async () => {
    mockMemberFindUnique.mockResolvedValue({ clubId: 10 });
    mockCreate.mockResolvedValue({ id: 1, amount: 5 });
    const res = await POST(makePostRequest({ memberId: 2, amount: 5, frequency: 'MONTHLY' }));
    expect(res.status).toBe(200);
    const body = await res.json() as { id: number };
    expect(body.id).toBe(1);
  });
});

describe('PUT /api/finance/regular-payments/[id]', () => {
  it('returns 403 when not admin', async () => {
    mockGetCurrentMember.mockResolvedValue(user);
    const { req, context } = makePutRequest('1', { amount: 10 });
    const res = await PUT(req, context);
    expect(res.status).toBe(403);
  });

  it('returns 404 when payment not found', async () => {
    mockFindUnique.mockResolvedValue(null);
    const { req, context } = makePutRequest('999', { amount: 10 });
    const res = await PUT(req, context);
    expect(res.status).toBe(404);
  });

  it('updates and returns payment', async () => {
    mockFindUnique.mockResolvedValue({ clubId: 10 });
    mockUpdate.mockResolvedValue({ id: 1, amount: 10 });
    const { req, context } = makePutRequest('1', { amount: 10 });
    const res = await PUT(req, context);
    expect(res.status).toBe(200);
  });
});

describe('DELETE /api/finance/regular-payments/[id]', () => {
  it('returns 403 when not admin', async () => {
    mockGetCurrentMember.mockResolvedValue(user);
    const { req, context } = makeDeleteRequest('1');
    const res = await DELETE(req, context);
    expect(res.status).toBe(403);
  });

  it('deletes payment and returns ok', async () => {
    mockFindUnique.mockResolvedValue({ clubId: 10 });
    mockDelete.mockResolvedValue({});
    const { req, context } = makeDeleteRequest('1');
    const res = await DELETE(req, context);
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean };
    expect(body.ok).toBe(true);
  });
});
