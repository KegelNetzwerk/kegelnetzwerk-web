import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, createSession, setSessionCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { clubName, nickname, password } = await req.json();

  if (!clubName || !nickname || !password) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
  }

  // Find club by name
  const club = await prisma.club.findUnique({ where: { name: clubName } });
  if (!club) {
    return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
  }

  // Find member in that club by nickname
  const member = await prisma.member.findFirst({
    where: { clubId: club.id, nickname },
  });
  if (!member) {
    return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
  }

  const valid = await verifyPassword(password, member.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
  }

  const token = await createSession(member.id);
  await setSessionCookie(token);

  return NextResponse.json({ ok: true });
}
