import { NextRequest, NextResponse } from 'next/server';
import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

// PUT /api/finance/collectives/[id] — update a collective charge (admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const member = await getCurrentMember();
  if (!member || member.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const collectiveId = Number.parseInt(id);

  const existing = await prisma.collectiveCharge.findUnique({
    where: { id: collectiveId },
    select: { clubId: true },
  });
  if (!existing || existing.clubId !== member.clubId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json() as { name?: string; note?: string; closed?: boolean };

  const updated = await prisma.collectiveCharge.update({
    where: { id: collectiveId },
    data: {
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      ...(body.note !== undefined ? { note: body.note } : {}),
      ...(body.closed !== undefined ? { closed: body.closed } : {}),
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/finance/collectives/[id] — delete a collective charge (admin only)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const member = await getCurrentMember();
  if (!member || member.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const collectiveId = Number.parseInt(id);

  const existing = await prisma.collectiveCharge.findUnique({
    where: { id: collectiveId },
    select: { clubId: true },
  });
  if (!existing || existing.clubId !== member.clubId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.collectiveCharge.delete({ where: { id: collectiveId } });
  return NextResponse.json({ ok: true });
}
