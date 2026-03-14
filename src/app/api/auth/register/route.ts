import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import crypto from 'crypto';

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

export async function POST(req: NextRequest) {
  const { clubName, nickname, email, password, inviteCode } = await req.json();

  if (!clubName || !nickname || !email || !password || !inviteCode) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
  }

  if (password.length < 4) {
    return NextResponse.json({ error: 'Password must be at least 4 characters.' }, { status: 400 });
  }

  // Check invite code
  const hashedCode = hashCode(inviteCode);
  const code = await prisma.registrationCode.findUnique({ where: { code: hashedCode } });
  if (!code) {
    return NextResponse.json({ error: 'Invalid invite code.' }, { status: 400 });
  }

  // Check club name uniqueness
  const existing = await prisma.club.findUnique({ where: { name: clubName } });
  if (existing) {
    return NextResponse.json({ error: 'Club name already taken.' }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);

  // Create club and first admin member in a transaction
  await prisma.$transaction(async (tx) => {
    const club = await tx.club.create({
      data: { name: clubName, regCode: hashedCode },
    });
    await tx.member.create({
      data: {
        clubId: club.id,
        nickname,
        email,
        passwordHash,
        role: 'ADMIN',
      },
    });
  });

  return NextResponse.json({ ok: true });
}
