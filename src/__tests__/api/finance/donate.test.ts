jest.mock('@/lib/donate', () => ({ processDonation: jest.fn() }));
jest.mock('@/lib/auth', () => ({ getCurrentMember: jest.fn() }));

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/finance/donate/route';
import { getCurrentMember } from '@/lib/auth';
import { processDonation } from '@/lib/donate';

const mockGetCurrentMember = getCurrentMember as jest.Mock;
const mockProcessDonation = processDonation as jest.Mock;

const member = { id: 5, clubId: 10, role: 'MEMBER' };

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/finance/donate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCurrentMember.mockResolvedValue(member);
  mockProcessDonation.mockResolvedValue({ kncBalance: 500, euroBalance: -5 });
});

describe('POST /api/finance/donate', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetCurrentMember.mockResolvedValue(null);
    const res = await POST(makeRequest({ amount: 5 }));
    expect(res.status).toBe(401);
    expect(mockProcessDonation).not.toHaveBeenCalled();
  });

  it('returns 400 for missing amount', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    expect(mockProcessDonation).not.toHaveBeenCalled();
  });

  it('returns 400 for zero amount', async () => {
    const res = await POST(makeRequest({ amount: 0 }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for negative amount', async () => {
    const res = await POST(makeRequest({ amount: -5 }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for non-numeric string', async () => {
    const res = await POST(makeRequest({ amount: 'abc' }));
    expect(res.status).toBe(400);
  });

  it('calls processDonation with member id, clubId, and amount', async () => {
    await POST(makeRequest({ amount: 5 }));
    expect(mockProcessDonation).toHaveBeenCalledWith(member.id, member.clubId, 5);
  });

  it('returns the result from processDonation', async () => {
    mockProcessDonation.mockResolvedValue({ kncBalance: 300, euroBalance: -3 });
    const res = await POST(makeRequest({ amount: 3 }));
    expect(res.status).toBe(200);
    const body = await res.json() as { kncBalance: number; euroBalance: number };
    expect(body.kncBalance).toBe(300);
    expect(body.euroBalance).toBe(-3);
  });
});
