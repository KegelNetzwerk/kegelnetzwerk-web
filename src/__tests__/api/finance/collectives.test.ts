jest.mock('@/lib/prisma', () => ({
  prisma: {
    collectiveCharge: { findMany: jest.fn(), create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
    collectiveChargeAssignment: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    financeTransaction: { create: jest.fn(), deleteMany: jest.fn() },
    member: { findMany: jest.fn(), findUnique: jest.fn() },
    $transaction: jest.fn(),
  },
}));
jest.mock('@/lib/auth', () => ({ getCurrentMember: jest.fn() }));

import { NextRequest } from 'next/server';
import { GET as getCollectives, POST as postCollective } from '@/app/api/finance/collectives/route';
import { PUT, DELETE } from '@/app/api/finance/collectives/[id]/route';
import { GET as getAssignments, PATCH, POST as postAssignment } from '@/app/api/finance/collectives/[id]/assignments/route';
import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockGetCurrentMember = getCurrentMember as jest.Mock;
const mockCollectiveFindMany = prisma.collectiveCharge.findMany as jest.Mock;
const mockCollectiveCreate = prisma.collectiveCharge.create as jest.Mock;
const mockCollectiveFindUnique = prisma.collectiveCharge.findUnique as jest.Mock;
const mockCollectiveUpdate = prisma.collectiveCharge.update as jest.Mock;
const mockCollectiveDelete = prisma.collectiveCharge.delete as jest.Mock;
const mockAssignmentFindMany = prisma.collectiveChargeAssignment.findMany as jest.Mock;
const mockAssignmentFindUnique = prisma.collectiveChargeAssignment.findUnique as jest.Mock;
const mockAssignmentCreate = prisma.collectiveChargeAssignment.create as jest.Mock;
const mockMemberFindMany = prisma.member.findMany as jest.Mock;
const mockMemberFindUnique = prisma.member.findUnique as jest.Mock;

const admin = { id: 1, clubId: 10, role: 'ADMIN' };
const user = { id: 2, clubId: 10, role: 'USER' };

function makeRequest(method: string, url: string, body?: object) {
  return new NextRequest(url, {
    method,
    ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
  });
}

function idContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCurrentMember.mockResolvedValue(admin);
  (prisma.$transaction as jest.Mock).mockResolvedValue([]);
});

describe('GET /api/finance/collectives', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetCurrentMember.mockResolvedValue(null);
    const res = await getCollectives();
    expect(res.status).toBe(401);
  });

  it('returns collectives for club', async () => {
    mockCollectiveFindMany.mockResolvedValue([{ id: 1 }]);
    const res = await getCollectives();
    expect(res.status).toBe(200);
    const body = await res.json() as unknown[];
    expect(body).toHaveLength(1);
  });
});

describe('POST /api/finance/collectives', () => {
  it('returns 403 when not admin', async () => {
    mockGetCurrentMember.mockResolvedValue(user);
    const res = await postCollective(makeRequest('POST', 'http://localhost/api/finance/collectives', { name: 'Test', defaultAmount: 10 }));
    expect(res.status).toBe(403);
  });

  it('returns 400 when name is missing', async () => {
    const res = await postCollective(makeRequest('POST', 'http://localhost/api/finance/collectives', { defaultAmount: 10 }));
    expect(res.status).toBe(400);
  });

  it('creates collective with assignments for all members', async () => {
    mockMemberFindMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    mockCollectiveCreate.mockResolvedValue({ id: 5, name: 'Party' });
    const res = await postCollective(makeRequest('POST', 'http://localhost/api/finance/collectives', { name: 'Party', defaultAmount: 5 }));
    expect(res.status).toBe(200);
    expect(mockCollectiveCreate).toHaveBeenCalled();
  });
});

describe('PUT /api/finance/collectives/[id]', () => {
  it('returns 403 when not admin', async () => {
    mockGetCurrentMember.mockResolvedValue(user);
    const res = await PUT(makeRequest('PUT', 'http://localhost/api/finance/collectives/1', { name: 'Updated' }), idContext('1'));
    expect(res.status).toBe(403);
  });

  it('returns 404 when collective not found', async () => {
    mockCollectiveFindUnique.mockResolvedValue(null);
    const res = await PUT(makeRequest('PUT', 'http://localhost/api/finance/collectives/999', { name: 'X' }), idContext('999'));
    expect(res.status).toBe(404);
  });

  it('updates collective', async () => {
    mockCollectiveFindUnique.mockResolvedValue({ clubId: 10 });
    mockCollectiveUpdate.mockResolvedValue({ id: 1, name: 'Updated' });
    const res = await PUT(makeRequest('PUT', 'http://localhost/api/finance/collectives/1', { name: 'Updated' }), idContext('1'));
    expect(res.status).toBe(200);
  });
});

describe('DELETE /api/finance/collectives/[id]', () => {
  it('returns 403 when not admin', async () => {
    mockGetCurrentMember.mockResolvedValue(user);
    const res = await DELETE(makeRequest('DELETE', 'http://localhost/api/finance/collectives/1'), idContext('1'));
    expect(res.status).toBe(403);
  });

  it('deletes collective and returns ok', async () => {
    mockCollectiveFindUnique.mockResolvedValue({ clubId: 10 });
    mockCollectiveDelete.mockResolvedValue({});
    const res = await DELETE(makeRequest('DELETE', 'http://localhost/api/finance/collectives/1'), idContext('1'));
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean };
    expect(body.ok).toBe(true);
  });
});

describe('GET /api/finance/collectives/[id]/assignments', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetCurrentMember.mockResolvedValue(null);
    const res = await getAssignments(makeRequest('GET', 'http://localhost/api/finance/collectives/1/assignments'), idContext('1'));
    expect(res.status).toBe(401);
  });

  it('returns 404 when collective not in club', async () => {
    mockCollectiveFindUnique.mockResolvedValue({ clubId: 99 });
    const res = await getAssignments(makeRequest('GET', 'http://localhost/api/finance/collectives/1/assignments'), idContext('1'));
    expect(res.status).toBe(404);
  });

  it('returns assignments for collective', async () => {
    mockCollectiveFindUnique.mockResolvedValue({ clubId: 10 });
    mockAssignmentFindMany.mockResolvedValue([{ id: 1, memberId: 2 }]);
    const res = await getAssignments(makeRequest('GET', 'http://localhost/api/finance/collectives/1/assignments'), idContext('1'));
    expect(res.status).toBe(200);
    const body = await res.json() as unknown[];
    expect(body).toHaveLength(1);
  });
});

describe('PATCH /api/finance/collectives/[id]/assignments', () => {
  it('returns 403 when not admin', async () => {
    mockGetCurrentMember.mockResolvedValue(user);
    const res = await PATCH(
      makeRequest('PATCH', 'http://localhost/api/finance/collectives/1/assignments', { memberId: 2, action: 'pay' }),
      idContext('1'),
    );
    expect(res.status).toBe(403);
  });

  it('returns 404 when assignment not found', async () => {
    mockCollectiveFindUnique.mockResolvedValue({ clubId: 10, defaultAmount: 5 });
    mockAssignmentFindUnique.mockResolvedValueOnce(null);
    const res = await PATCH(
      makeRequest('PATCH', 'http://localhost/api/finance/collectives/1/assignments', { memberId: 99, action: 'pay' }),
      idContext('1'),
    );
    expect(res.status).toBe(404);
  });

  it('returns 409 when already paid', async () => {
    mockCollectiveFindUnique.mockResolvedValue({ clubId: 10, defaultAmount: 5 });
    mockAssignmentFindUnique.mockResolvedValueOnce({ paidAt: new Date(), amount: 5 });
    const res = await PATCH(
      makeRequest('PATCH', 'http://localhost/api/finance/collectives/1/assignments', { memberId: 2, action: 'pay' }),
      idContext('1'),
    );
    expect(res.status).toBe(409);
  });

  it('pays assignment and creates transaction', async () => {
    mockCollectiveFindUnique.mockResolvedValue({ clubId: 10, defaultAmount: 5 });
    mockAssignmentFindUnique
      .mockResolvedValueOnce({ paidAt: null, amount: 5 })
      .mockResolvedValueOnce({ paidAt: new Date(), amount: 5, member: { id: 2, nickname: 'Bob' } });

    const res = await PATCH(
      makeRequest('PATCH', 'http://localhost/api/finance/collectives/1/assignments', { memberId: 2, action: 'pay' }),
      idContext('1'),
    );
    expect(res.status).toBe(200);
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('excludes member from collective', async () => {
    mockCollectiveFindUnique.mockResolvedValue({ clubId: 10, defaultAmount: 5 });
    mockAssignmentFindUnique
      .mockResolvedValueOnce({ paidAt: null, amount: 5 })
      .mockResolvedValueOnce({ excluded: true });
    (prisma.collectiveChargeAssignment.update as jest.Mock).mockResolvedValue({});

    const res = await PATCH(
      makeRequest('PATCH', 'http://localhost/api/finance/collectives/1/assignments', { memberId: 2, action: 'exclude' }),
      idContext('1'),
    );
    expect(res.status).toBe(200);
  });
});

describe('POST /api/finance/collectives/[id]/assignments', () => {
  it('returns 404 when member not in club', async () => {
    mockCollectiveFindUnique.mockResolvedValue({ clubId: 10, defaultAmount: 5 });
    mockMemberFindUnique.mockResolvedValue({ clubId: 99 });
    const res = await postAssignment(
      makeRequest('POST', 'http://localhost/api/finance/collectives/1/assignments', { memberId: 5 }),
      idContext('1'),
    );
    expect(res.status).toBe(404);
  });

  it('creates assignment and returns it', async () => {
    mockCollectiveFindUnique.mockResolvedValue({ clubId: 10, defaultAmount: 5 });
    mockMemberFindUnique.mockResolvedValue({ clubId: 10 });
    mockAssignmentCreate.mockResolvedValue({ id: 1, memberId: 2 });
    const res = await postAssignment(
      makeRequest('POST', 'http://localhost/api/finance/collectives/1/assignments', { memberId: 2 }),
      idContext('1'),
    );
    expect(res.status).toBe(200);
  });
});
