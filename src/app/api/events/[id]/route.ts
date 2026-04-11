import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentMember } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const eventId = Number.parseInt(id, 10);

  const existing = await prisma.event.findFirst({
    where: { id: eventId, clubId: member.clubId },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { subject, location, description, date } = await req.json();

  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    return NextResponse.json({ error: 'Invalid date.' }, { status: 400 });
  }

  const updated = await prisma.event.update({
    where: { id: eventId },
    data: { subject, location: location ?? '', description: description ?? '', date: parsedDate },
    include: { author: { select: { id: true, nickname: true } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const eventId = Number.parseInt(id, 10);

  const existing = await prisma.event.findFirst({
    where: { id: eventId, clubId: member.clubId },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.event.delete({ where: { id: eventId } });
  return NextResponse.json({ ok: true });
}
