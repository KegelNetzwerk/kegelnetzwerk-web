import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAppMember } from '@/lib/appAuth';

// POST /api/app/push-token
// Body: { token: string }
// Stores or updates the Expo push token for the authenticated member
export async function POST(req: NextRequest) {
  const member = await getAppMember(req);
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { token } = await req.json();
  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  await prisma.pushToken.upsert({
    where: { memberId: member.id },
    update: { token },
    create: { memberId: member.id, token },
  });

  return NextResponse.json({ ok: true });
}
