import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentMember } from '@/lib/auth';
import { Role } from '@prisma/client';

type Params = { params: Promise<{ id: string }> };

// DELETE /api/app/guests/[id] — admin only
export async function DELETE(_req: NextRequest, { params }: Params) {
  const current = await getCurrentMember();
  if (!current || current.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const guestId = Number.parseInt(id, 10);
  if (isNaN(guestId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const guest = await prisma.guest.findUnique({ where: { id: guestId } });
  if (!guest || guest.clubId !== current.clubId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Results cascade-delete via schema (onDelete: Cascade on guestId FK)
  await prisma.guest.delete({ where: { id: guestId } });

  return NextResponse.json({ ok: true });
}
