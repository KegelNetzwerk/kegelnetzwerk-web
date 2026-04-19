jest.mock('@/lib/prisma', () => ({
  prisma: {
    moneySource: { findFirst: jest.fn(), create: jest.fn(), delete: jest.fn(), update: jest.fn() },
    moneySourceLog: { findFirst: jest.fn(), create: jest.fn(), delete: jest.fn() },
    $transaction: jest.fn(),
  },
}));
jest.mock('@/lib/auth', () => ({ getCurrentMember: jest.fn() }));

import { NextRequest } from 'next/server';
import { POST as postSource } from '@/app/api/finance/money-sources/route';
import { DELETE as deleteSource } from '@/app/api/finance/money-sources/[id]/route';
import { POST as postLog } from '@/app/api/finance/money-sources/[id]/log/route';
import { DELETE as deleteLog } from '@/app/api/finance/money-sources/[id]/log/[logId]/route';
import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockGetCurrentMember = getCurrentMember as jest.Mock;
const mockMoneySourceFindFirst = prisma.moneySource.findFirst as jest.Mock;
const mockMoneySourceDelete = prisma.moneySource.delete as jest.Mock;
const mockMoneySourceLogFindFirst = prisma.moneySourceLog.findFirst as jest.Mock;
const mockMoneySourceLogDelete = prisma.moneySourceLog.delete as jest.Mock;
const mockTransaction = prisma.$transaction as jest.Mock;

const admin = { id: 1, clubId: 10, role: 'ADMIN' };
const existingSource = { id: 5, clubId: 10, name: 'Spardose', value: 100 };
const createdLog = { id: 99, moneySourceId: 5, value: 120, createdAt: new Date().toISOString() };

function makeSourceRequest(method: string, body?: object) {
  return new NextRequest('http://localhost/api/finance/money-sources', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function makeIdRequest(method: string, id: string, body?: object) {
  return new NextRequest(`http://localhost/api/finance/money-sources/${id}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeLogParams(id: string, logId: string) {
  return { params: Promise.resolve({ id, logId }) };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCurrentMember.mockResolvedValue(admin);
  mockMoneySourceFindFirst.mockResolvedValue({ id: 5 });
  mockMoneySourceDelete.mockResolvedValue({});
  mockMoneySourceLogFindFirst.mockResolvedValue({ id: 99 });
  mockMoneySourceLogDelete.mockResolvedValue({});
  mockTransaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
    const txMock = {
      moneySource: {
        create: jest.fn().mockResolvedValue({ ...existingSource, value: 0 }),
        update: jest.fn().mockResolvedValue(existingSource),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ ...existingSource, log: [] }),
      },
      moneySourceLog: {
        create: jest.fn().mockResolvedValue(createdLog),
      },
    };
    return cb(txMock);
  });
});

// ---------------------------------------------------------------------------
describe('POST /api/finance/money-sources', () => {
  it('returns 403 when not admin', async () => {
    mockGetCurrentMember.mockResolvedValue({ ...admin, role: 'USER' });
    const res = await postSource(makeSourceRequest('POST', { name: 'Kasse' }));
    expect(res.status).toBe(403);
  });

  it('returns 400 when name is missing', async () => {
    const res = await postSource(makeSourceRequest('POST', {}));
    expect(res.status).toBe(400);
  });

  it('returns 400 when name is empty string', async () => {
    const res = await postSource(makeSourceRequest('POST', { name: '  ' }));
    expect(res.status).toBe(400);
  });

  it('creates source with value 0 when no value provided', async () => {
    const res = await postSource(makeSourceRequest('POST', { name: 'Kasse' }));
    expect(res.status).toBe(200);
    expect(mockTransaction).toHaveBeenCalled();
  });

  it('creates source with initial value and log entry', async () => {
    mockTransaction.mockImplementationOnce(async (cb: (tx: unknown) => Promise<unknown>) => {
      const txMock = {
        moneySource: {
          create: jest.fn().mockResolvedValue({ ...existingSource, value: 50 }),
          findUniqueOrThrow: jest.fn().mockResolvedValue({ ...existingSource, value: 50, log: [createdLog] }),
        },
        moneySourceLog: { create: jest.fn().mockResolvedValue(createdLog) },
      };
      return cb(txMock);
    });
    const res = await postSource(makeSourceRequest('POST', { name: 'Kasse', value: 50 }));
    expect(res.status).toBe(200);
  });

  it('ignores NaN value and defaults to 0', async () => {
    const res = await postSource(makeSourceRequest('POST', { name: 'Kasse', value: Number.NaN }));
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
describe('DELETE /api/finance/money-sources/[id]', () => {
  it('returns 403 when not admin', async () => {
    mockGetCurrentMember.mockResolvedValue({ ...admin, role: 'USER' });
    const res = await deleteSource(makeIdRequest('DELETE', '5'), makeParams('5'));
    expect(res.status).toBe(403);
  });

  it('returns 404 when source not found or wrong club', async () => {
    mockMoneySourceFindFirst.mockResolvedValue(null);
    const res = await deleteSource(makeIdRequest('DELETE', '5'), makeParams('5'));
    expect(res.status).toBe(404);
  });

  it('deletes source and returns ok', async () => {
    const res = await deleteSource(makeIdRequest('DELETE', '5'), makeParams('5'));
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean };
    expect(body.ok).toBe(true);
    expect(mockMoneySourceDelete).toHaveBeenCalledWith({ where: { id: 5 } });
  });
});

// ---------------------------------------------------------------------------
describe('POST /api/finance/money-sources/[id]/log', () => {
  it('returns 403 when not admin', async () => {
    mockGetCurrentMember.mockResolvedValue({ ...admin, role: 'USER' });
    const res = await postLog(makeIdRequest('POST', '5', { value: 120 }), makeParams('5'));
    expect(res.status).toBe(403);
  });

  it('returns 404 when source not found', async () => {
    mockMoneySourceFindFirst.mockResolvedValue(null);
    const res = await postLog(makeIdRequest('POST', '5', { value: 120 }), makeParams('5'));
    expect(res.status).toBe(404);
  });

  it('returns 400 when value is missing', async () => {
    const res = await postLog(makeIdRequest('POST', '5', {}), makeParams('5'));
    expect(res.status).toBe(400);
  });

  it('returns 400 when value is not a number', async () => {
    const res = await postLog(makeIdRequest('POST', '5', { value: 'abc' }), makeParams('5'));
    expect(res.status).toBe(400);
  });

  it('creates log entry and updates source value', async () => {
    const res = await postLog(makeIdRequest('POST', '5', { value: 120 }), makeParams('5'));
    expect(res.status).toBe(200);
    const body = await res.json() as { id: number; value: number };
    expect(body.id).toBe(99);
    expect(body.value).toBe(120);
    expect(mockTransaction).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
describe('DELETE /api/finance/money-sources/[id]/log/[logId]', () => {
  it('returns 403 when not admin', async () => {
    mockGetCurrentMember.mockResolvedValue({ ...admin, role: 'USER' });
    const res = await deleteLog(makeIdRequest('DELETE', '5'), makeLogParams('5', '99'));
    expect(res.status).toBe(403);
  });

  it('returns 404 when log entry not found', async () => {
    mockMoneySourceLogFindFirst.mockResolvedValue(null);
    const res = await deleteLog(makeIdRequest('DELETE', '5'), makeLogParams('5', '99'));
    expect(res.status).toBe(404);
  });

  it('deletes log entry and returns ok', async () => {
    const res = await deleteLog(makeIdRequest('DELETE', '5'), makeLogParams('5', '99'));
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean };
    expect(body.ok).toBe(true);
    expect(mockMoneySourceLogDelete).toHaveBeenCalledWith({ where: { id: 99 } });
  });

  it('verifies ownership via clubId on findFirst', async () => {
    await deleteLog(makeIdRequest('DELETE', '5'), makeLogParams('5', '99'));
    expect(mockMoneySourceLogFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        moneySource: { clubId: admin.clubId },
      }),
    }));
  });
});
