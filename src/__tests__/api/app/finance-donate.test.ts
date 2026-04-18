jest.mock('@/lib/donate', () => ({ processDonation: jest.fn() }));
jest.mock('@/lib/appAuth', () => ({ getAppMember: jest.fn() }));

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/app/finance/donate/route';
import { getAppMember } from '@/lib/appAuth';
import { processDonation } from '@/lib/donate';

const mockGetAppMember = getAppMember as jest.Mock;
const mockProcessDonation = processDonation as jest.Mock;

const member = { id: 5, clubId: 10 };

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/app/finance/donate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetAppMember.mockResolvedValue(member);
  mockProcessDonation.mockResolvedValue({ kncBalance: 500, euroBalance: -5 });
});

describe('POST /api/app/finance/donate', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetAppMember.mockResolvedValue(null);
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
    const res = await POST(makeRequest({ amount: -1 }));
    expect(res.status).toBe(400);
  });

  it('calls processDonation with member id, clubId, and amount', async () => {
    await POST(makeRequest({ amount: 5 }));
    expect(mockProcessDonation).toHaveBeenCalledWith(member.id, member.clubId, 5);
  });

  it('returns the result from processDonation', async () => {
    mockProcessDonation.mockResolvedValue({ kncBalance: 500, euroBalance: -5 });
    const res = await POST(makeRequest({ amount: 5 }));
    expect(res.status).toBe(200);
    const body = await res.json() as { kncBalance: number; euroBalance: number };
    expect(body.kncBalance).toBe(500);
    expect(body.euroBalance).toBe(-5);
  });
});
