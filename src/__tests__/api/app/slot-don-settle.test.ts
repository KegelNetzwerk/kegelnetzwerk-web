jest.mock('@/lib/prisma', () => ({
  prisma: {
    member: { findUnique: jest.fn(), update: jest.fn() },
  },
}));
jest.mock('@/lib/appAuth', () => ({ getAppMember: jest.fn() }));

import { NextRequest } from 'next/server';
import { OPTIONS, POST } from '@/app/api/app/slot/don-settle/route';
import { getAppMember } from '@/lib/appAuth';
import { prisma } from '@/lib/prisma';

const mockGetAppMember = getAppMember as jest.Mock;
const mockFindUnique = prisma.member.findUnique as jest.Mock;
const mockUpdate = prisma.member.update as jest.Mock;

const member = { id: 7, clubId: 3 };

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/app/slot/don-settle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetAppMember.mockResolvedValue(member);
  mockFindUnique.mockResolvedValue({ kncBalance: 0 });
  mockUpdate.mockResolvedValue({ kncBalance: 10 });
});

describe('OPTIONS /api/app/slot/don-settle', () => {
  it('returns 204', async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(204);
  });
});

describe('POST /api/app/slot/don-settle', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetAppMember.mockResolvedValue(null);
    const res = await POST(makeRequest({ originalWin: 10, finalWin: 0 }));
    expect(res.status).toBe(401);
  });

  it('returns 400 for negative originalWin', async () => {
    const res = await POST(makeRequest({ originalWin: -1, finalWin: 0 }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for non-integer originalWin', async () => {
    const res = await POST(makeRequest({ originalWin: 1.5, finalWin: 0 }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for negative finalWin', async () => {
    const res = await POST(makeRequest({ originalWin: 10, finalWin: -1 }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for non-integer finalWin', async () => {
    const res = await POST(makeRequest({ originalWin: 10, finalWin: 1.5 }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when finalWin does not match DON pattern (not 0 or 2^n * originalWin)', async () => {
    const res = await POST(makeRequest({ originalWin: 10, finalWin: 10 }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for finalWin = 3 * originalWin', async () => {
    const res = await POST(makeRequest({ originalWin: 10, finalWin: 30 }));
    expect(res.status).toBe(400);
  });

  it('returns 200 and queries balance when originalWin=0 and finalWin=0 (adjustment=0)', async () => {
    mockFindUnique.mockResolvedValue({ kncBalance: 42 });
    const res = await POST(makeRequest({ originalWin: 0, finalWin: 0 }));
    expect(res.status).toBe(200);
    const body = await res.json() as { kncBalance: number };
    expect(body.kncBalance).toBe(42);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('returns 0 kncBalance when member not found on adjustment=0', async () => {
    mockFindUnique.mockResolvedValue(null);
    const res = await POST(makeRequest({ originalWin: 0, finalWin: 0 }));
    expect(res.status).toBe(200);
    const body = await res.json() as { kncBalance: number };
    expect(body.kncBalance).toBe(0);
  });

  it('deducts balance when player loses (finalWin=0)', async () => {
    mockUpdate.mockResolvedValue({ kncBalance: 90 });
    const res = await POST(makeRequest({ originalWin: 10, finalWin: 0 })); // adjustment = -10
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { kncBalance: { increment: -10 } } }),
    );
    const body = await res.json() as { kncBalance: number };
    expect(body.kncBalance).toBe(90);
  });

  it('credits balance when player doubles (finalWin = 2 * originalWin)', async () => {
    mockUpdate.mockResolvedValue({ kncBalance: 110 });
    const res = await POST(makeRequest({ originalWin: 10, finalWin: 20 })); // adjustment = +10
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { kncBalance: { increment: 10 } } }),
    );
    const body = await res.json() as { kncBalance: number };
    expect(body.kncBalance).toBe(110);
  });

  it('accepts 5 successive doublings (finalWin = 32 * originalWin)', async () => {
    mockUpdate.mockResolvedValue({ kncBalance: 500 });
    const res = await POST(makeRequest({ originalWin: 10, finalWin: 320 })); // adjustment = +310
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { kncBalance: { increment: 310 } } }),
    );
  });
});
