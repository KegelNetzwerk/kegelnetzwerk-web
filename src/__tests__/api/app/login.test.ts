import { NextRequest } from 'next/server';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    club: { findFirst: jest.fn() },
    member: { findFirst: jest.fn() },
  },
}));
jest.mock('@/lib/auth', () => ({
  verifyPassword: jest.fn(),
  createSession: jest.fn(),
}));

import { POST } from '@/app/api/app/login/route';
import { prisma } from '@/lib/prisma';
import { verifyPassword, createSession } from '@/lib/auth';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockVerify = verifyPassword as jest.Mock;
const mockCreateSession = createSession as jest.Mock;

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/app/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const mockClub = { id: 1, name: 'TestClub', farbe1: '005982', farbe2: 'ffffff', farbe3: 'cccccc', bg1: 0 };
const mockMember = { id: 10, clubId: 1, nickname: 'TestUser', role: 'MEMBER', passwordHash: 'hash' };

beforeEach(() => {
  jest.clearAllMocks();
  mockCreateSession.mockResolvedValue('app-token');
});

describe('POST /api/app/login', () => {
  it('returns 400 when fields are missing', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('returns 401 when club is not found', async () => {
    (mockPrisma.club.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await POST(makeRequest({ clubName: 'unknown', nickname: 'u', password: 'p' }));
    expect(res.status).toBe(401);
  });

  it('returns 401 when member is not found', async () => {
    (mockPrisma.club.findFirst as jest.Mock).mockResolvedValue(mockClub);
    (mockPrisma.member.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await POST(makeRequest({ clubName: 'TestClub', nickname: 'unknown', password: 'p' }));
    expect(res.status).toBe(401);
  });

  it('returns 401 when password is invalid', async () => {
    (mockPrisma.club.findFirst as jest.Mock).mockResolvedValue(mockClub);
    (mockPrisma.member.findFirst as jest.Mock).mockResolvedValue(mockMember);
    mockVerify.mockResolvedValue(false);
    const res = await POST(makeRequest({ clubName: 'TestClub', nickname: 'TestUser', password: 'wrong' }));
    expect(res.status).toBe(401);
  });

  it('returns 200 with member data on valid credentials', async () => {
    (mockPrisma.club.findFirst as jest.Mock).mockResolvedValue(mockClub);
    (mockPrisma.member.findFirst as jest.Mock).mockResolvedValue(mockMember);
    mockVerify.mockResolvedValue(true);
    const res = await POST(makeRequest({ clubName: 'TestClub', nickname: 'TestUser', password: 'correct' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.memberId).toBe(mockMember.id);
    expect(body.token).toBe('app-token');
    expect(body.nickname).toBe('TestUser');
    expect(body.role).toBe('MEMBER');
    expect(body.farbe1).toBe('005982');
  });

  it('looks up club case-insensitively', async () => {
    (mockPrisma.club.findFirst as jest.Mock).mockResolvedValue(mockClub);
    (mockPrisma.member.findFirst as jest.Mock).mockResolvedValue(mockMember);
    mockVerify.mockResolvedValue(true);
    await POST(makeRequest({ clubName: 'testclub', nickname: 'TestUser', password: 'correct' }));
    expect(mockPrisma.club.findFirst).toHaveBeenCalledWith({
      where: { name: { equals: 'testclub', mode: 'insensitive' } },
    });
  });

  it('looks up member case-insensitively', async () => {
    (mockPrisma.club.findFirst as jest.Mock).mockResolvedValue(mockClub);
    (mockPrisma.member.findFirst as jest.Mock).mockResolvedValue(mockMember);
    mockVerify.mockResolvedValue(true);
    await POST(makeRequest({ clubName: 'TestClub', nickname: 'TESTUSER', password: 'correct' }));
    expect(mockPrisma.member.findFirst).toHaveBeenCalledWith({
      where: { clubId: mockClub.id, nickname: { equals: 'TESTUSER', mode: 'insensitive' } },
    });
  });

  it('returns 500 on unexpected error', async () => {
    (mockPrisma.club.findFirst as jest.Mock).mockRejectedValue(new Error('db error'));
    const res = await POST(makeRequest({ clubName: 'TestClub', nickname: 'u', password: 'p' }));
    expect(res.status).toBe(500);
  });
});
