import { NextRequest } from 'next/server';

// --- mocks must be declared before imports ---
jest.mock('@/lib/prisma', () => ({
  prisma: {
    club: { findFirst: jest.fn() },
    member: { findFirst: jest.fn() },
  },
}));
jest.mock('@/lib/auth', () => ({
  verifyPassword: jest.fn(),
  createSession: jest.fn(),
  setSessionCookie: jest.fn(),
}));

import { POST } from '@/app/api/auth/login/route';
import { prisma } from '@/lib/prisma';
import { verifyPassword, createSession, setSessionCookie } from '@/lib/auth';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockVerify = verifyPassword as jest.Mock;
const mockCreateSession = createSession as jest.Mock;
const mockSetCookie = setSessionCookie as jest.Mock;

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const mockClub = { id: 1, name: 'TestClub' };
const mockMember = { id: 10, clubId: 1, nickname: 'TestUser', passwordHash: 'hash' };

beforeEach(() => {
  jest.clearAllMocks();
  mockCreateSession.mockResolvedValue('session-token');
  mockSetCookie.mockResolvedValue(undefined);
});

describe('POST /api/auth/login', () => {
  it('returns 400 when fields are missing', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it('returns 400 when clubName is missing', async () => {
    const res = await POST(makeRequest({ nickname: 'u', password: 'p' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when nickname is missing', async () => {
    const res = await POST(makeRequest({ clubName: 'c', password: 'p' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when password is missing', async () => {
    const res = await POST(makeRequest({ clubName: 'c', nickname: 'u' }));
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

  it('returns 200 with ok:true on valid credentials', async () => {
    (mockPrisma.club.findFirst as jest.Mock).mockResolvedValue(mockClub);
    (mockPrisma.member.findFirst as jest.Mock).mockResolvedValue(mockMember);
    mockVerify.mockResolvedValue(true);
    const res = await POST(makeRequest({ clubName: 'TestClub', nickname: 'TestUser', password: 'correct' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it('looks up club case-insensitively', async () => {
    (mockPrisma.club.findFirst as jest.Mock).mockResolvedValue(mockClub);
    (mockPrisma.member.findFirst as jest.Mock).mockResolvedValue(mockMember);
    mockVerify.mockResolvedValue(true);
    await POST(makeRequest({ clubName: 'TESTCLUB', nickname: 'TestUser', password: 'correct' }));
    expect(mockPrisma.club.findFirst).toHaveBeenCalledWith({
      where: { name: { equals: 'TESTCLUB', mode: 'insensitive' } },
    });
  });

  it('looks up member case-insensitively', async () => {
    (mockPrisma.club.findFirst as jest.Mock).mockResolvedValue(mockClub);
    (mockPrisma.member.findFirst as jest.Mock).mockResolvedValue(mockMember);
    mockVerify.mockResolvedValue(true);
    await POST(makeRequest({ clubName: 'TestClub', nickname: 'testuser', password: 'correct' }));
    expect(mockPrisma.member.findFirst).toHaveBeenCalledWith({
      where: { clubId: mockClub.id, nickname: { equals: 'testuser', mode: 'insensitive' } },
    });
  });

  it('creates a session and sets cookie on success', async () => {
    (mockPrisma.club.findFirst as jest.Mock).mockResolvedValue(mockClub);
    (mockPrisma.member.findFirst as jest.Mock).mockResolvedValue(mockMember);
    mockVerify.mockResolvedValue(true);
    await POST(makeRequest({ clubName: 'TestClub', nickname: 'TestUser', password: 'correct' }));
    expect(mockCreateSession).toHaveBeenCalledWith(mockMember.id);
    expect(mockSetCookie).toHaveBeenCalledWith('session-token');
  });
});
