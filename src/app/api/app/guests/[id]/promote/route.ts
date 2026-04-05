import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentMember, hashPassword } from '@/lib/auth';
import { sendEmail, inviteEmailHtml } from '@/lib/email';
import { Role } from '@prisma/client';

interface PromoteBody {
  email: string;
  password: string;
  role?: 'MEMBER' | 'ADMIN';
  sendInvite?: boolean;
}

// POST /api/app/guests/[id]/promote
// Promotes a guest to a full member, re-attributing all their results.
// Auth: web session, admin only.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const current = await getCurrentMember();
  if (!current || current.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const guestId = parseInt(id, 10);
  if (isNaN(guestId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  let body: PromoteBody;
  try {
    body = await req.json();
    if (!body.email?.trim()) throw new Error('email required');
    if (!body.password || body.password.length < 4) throw new Error('password too short');
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  const guest = await prisma.guest.findUnique({
    where: { id: guestId },
  });
  if (!guest || guest.clubId !== current.clubId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const role = body.role === 'ADMIN' ? Role.ADMIN : Role.MEMBER;
  const passwordHash = await hashPassword(body.password);

  // Check nickname/email uniqueness within club
  const conflict = await prisma.member.findFirst({
    where: {
      clubId: current.clubId,
      OR: [{ nickname: guest.nickname }, { email: body.email.trim() }],
    },
  });
  if (conflict) {
    return NextResponse.json({ error: 'nicknameTaken' }, { status: 409 });
  }

  // Create member, re-attribute results, delete guest — all in one transaction
  const newMember = await prisma.$transaction(async (tx) => {
    const member = await tx.member.create({
      data: {
        clubId: current.clubId,
        nickname: guest.nickname,
        firstName: guest.firstName,
        lastName: guest.lastName,
        email: body.email.trim(),
        passwordHash,
        role,
        phone: '',
      },
    });

    await tx.result.updateMany({
      where: { guestId, clubId: current.clubId },
      data: { memberId: member.id, guestId: null },
    });

    await tx.guest.delete({ where: { id: guestId } });

    return member;
  });

  if (body.sendInvite) {
    await sendEmail({
      to: body.email.trim(),
      subject: `Einladung zu ${current.club.name} auf KegelNetzwerk`,
      html: inviteEmailHtml(current.club.name, guest.nickname, body.password),
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, memberId: newMember.id }, { status: 201 });
}
