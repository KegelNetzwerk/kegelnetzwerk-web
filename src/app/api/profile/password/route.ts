import { NextRequest, NextResponse } from 'next/server';
import { getCurrentMember, hashPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PUT /api/profile/password — change own password
export async function PUT(req: NextRequest) {
  const current = await getCurrentMember();
  if (!current) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { password } = await req.json();
  if (!password || password.length < 4) {
    return NextResponse.json({ error: 'weakPassword' }, { status: 422 });
  }

  await prisma.member.update({
    where: { id: current.id },
    data: { passwordHash: await hashPassword(password) },
  });

  return NextResponse.json({ ok: true });
}
