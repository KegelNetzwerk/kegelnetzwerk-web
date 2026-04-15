import { NextRequest, NextResponse } from 'next/server';
import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

// PATCH /api/finance/members/[id]/inactive — set member active/inactive (admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentMember = await getCurrentMember();
  if (!currentMember || currentMember.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const memberId = Number.parseInt(id);
  const body = await req.json() as { isInactive: boolean };

  const target = await prisma.member.findUnique({
    where: { id: memberId },
    select: { clubId: true },
  });

  if (!target || target.clubId !== currentMember.clubId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const updated = await prisma.member.update({
    where: { id: memberId },
    data: { isInactive: body.isInactive },
    select: { id: true, isInactive: true },
  });

  return NextResponse.json(updated);
}
