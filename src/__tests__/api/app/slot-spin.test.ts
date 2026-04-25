jest.mock('@/lib/prisma', () => ({
  prisma: { $transaction: jest.fn() },
}));
jest.mock('@/lib/appAuth', () => ({ getAppMember: jest.fn() }));
jest.mock('@/lib/slotEngine', () => ({ spin: jest.fn() }));

import { NextRequest } from 'next/server';
import { OPTIONS, POST } from '@/app/api/app/slot/spin/route';
import { getAppMember } from '@/lib/appAuth';
import { prisma } from '@/lib/prisma';
import { spin } from '@/lib/slotEngine';

const mockGetAppMember = getAppMember as jest.Mock;
const mockTransaction = prisma.$transaction as jest.Mock;
const mockSpin = spin as jest.Mock;

const member = { id: 7, clubId: 3 };

const mockTx = {
  member: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

const defaultSpinResult = {
  reels: [['pin', 'pin', 'pin'], ['pin', 'pin', 'pin'], ['pin', 'pin', 'pin'], ['pin', 'pin', 'pin'], ['pin', 'pin', 'pin']],
  originalReels: [['pin', 'pin', 'pin'], ['pin', 'pin', 'pin'], ['pin', 'pin', 'pin'], ['pin', 'pin', 'pin'], ['pin', 'pin', 'pin']],
  win: 80,
  featureTriggered: false,
  expansionApplied: false,
  expandingSymbol: undefined,
};

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/app/slot/spin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetAppMember.mockResolvedValue(member);
  mockSpin.mockReturnValue(defaultSpinResult);
  mockTx.member.findUnique.mockResolvedValue({ kncBalance: 1000 });
  mockTx.member.update.mockResolvedValue({ kncBalance: 971 }); // 1000 - (10*1) + 80
  mockTransaction.mockImplementation(async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx));
});

describe('OPTIONS /api/app/slot/spin', () => {
  it('returns 204', async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(204);
  });
});

describe('POST /api/app/slot/spin', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetAppMember.mockResolvedValue(null);
    const res = await POST(makeRequest({ lines: 1, bet: 1 }));
    expect(res.status).toBe(401);
  });

  it('returns 400 for lines = 0', async () => {
    const res = await POST(makeRequest({ lines: 0, bet: 1 }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for lines > 10', async () => {
    const res = await POST(makeRequest({ lines: 11, bet: 1 }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for non-integer lines', async () => {
    const res = await POST(makeRequest({ lines: 1.5, bet: 1 }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid bet amount', async () => {
    const res = await POST(makeRequest({ lines: 1, bet: 3 }));
    expect(res.status).toBe(400);
  });

  it('returns 200 with spin result on valid normal spin', async () => {
    mockTx.member.update.mockResolvedValue({ kncBalance: 79 }); // 0 - 1*1 + 80
    const res = await POST(makeRequest({ lines: 1, bet: 1 }));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.win).toBe(80);
    expect(body.kncBalance).toBe(79);
    expect(body.featureTriggered).toBe(false);
    expect(body.expansionApplied).toBe(false);
  });

  it('does not check balance for free spins', async () => {
    const res = await POST(makeRequest({ lines: 1, bet: 1, freeSpins: true }));
    expect(res.status).toBe(200);
    expect(mockTx.member.findUnique).not.toHaveBeenCalled();
  });

  it('passes expandingSymbol to spin on free spin', async () => {
    await POST(makeRequest({ lines: 1, bet: 1, freeSpins: true, expandingSymbol: 'pin' }));
    expect(mockSpin).toHaveBeenCalledWith(1, 1, 'pin');
  });

  it('does not pass expandingSymbol to spin on normal spin', async () => {
    await POST(makeRequest({ lines: 1, bet: 1, freeSpins: false, expandingSymbol: 'pin' }));
    expect(mockSpin).toHaveBeenCalledWith(1, 1, undefined);
  });

  it('returns 402 when balance is insufficient', async () => {
    mockTx.member.findUnique.mockResolvedValue({ kncBalance: 0 });
    const res = await POST(makeRequest({ lines: 1, bet: 10 }));
    expect(res.status).toBe(402);
  });

  it('returns 402 when member record not found in transaction', async () => {
    mockTx.member.findUnique.mockResolvedValue(null);
    const res = await POST(makeRequest({ lines: 1, bet: 1 }));
    expect(res.status).toBe(402);
  });

  it('rethrows unexpected transaction errors', async () => {
    mockTransaction.mockRejectedValue(new Error('DB is down'));
    await expect(POST(makeRequest({ lines: 1, bet: 1 }))).rejects.toThrow('DB is down');
  });

  it('does not include expandingSymbol in free spin response', async () => {
    mockSpin.mockReturnValue({ ...defaultSpinResult, featureTriggered: true, expandingSymbol: 'trophy' });
    const res = await POST(makeRequest({ lines: 1, bet: 1, freeSpins: true }));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.expandingSymbol).toBeUndefined();
  });

  it('includes expandingSymbol in response for normal spin when feature triggers', async () => {
    mockSpin.mockReturnValue({ ...defaultSpinResult, featureTriggered: true, expandingSymbol: 'trophy' });
    const res = await POST(makeRequest({ lines: 1, bet: 1 }));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.expandingSymbol).toBe('trophy');
  });

  it('accepts all valid bet amounts', async () => {
    for (const bet of [1, 2, 5, 10]) {
      const res = await POST(makeRequest({ lines: 1, bet }));
      expect(res.status).toBe(200);
    }
  });
});
