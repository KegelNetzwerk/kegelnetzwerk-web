import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/auth';

// POST /api/app/login
// Body: { clubName, nickname, password }
// Returns: { memberId, clubId, nickname, role, token } or error
export async function POST(req: NextRequest) {
  try {
    const { clubName, nickname, password } = await req.json();
    if (!clubName || !nickname || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    const club = await prisma.club.findUnique({ where: { name: clubName } });
    if (!club) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

    const member = await prisma.member.findFirst({
      where: { clubId: club.id, nickname: { equals: nickname, mode: 'insensitive' } },
    });
    if (!member) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

    const valid = await verifyPassword(password, member.passwordHash);
    if (!valid) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

    // Create a session token for the mobile app
    const { createSession } = await import('@/lib/auth');
    const token = await createSession(member.id);

    return NextResponse.json({
      memberId: member.id,
      clubId: member.clubId,
      nickname: member.nickname,
      role: member.role,
      token,
      farbe1: club.farbe1,
      farbe2: club.farbe2,
      farbe3: club.farbe3,
      bg1: club.bg1,
    });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
