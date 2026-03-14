import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentMember } from '@/lib/auth';

const CANCEL_DEADLINE_SECONDS = 432000; // 5 days

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const eventId = parseInt(id, 10);
  const { cancel } = await req.json(); // true = cancel attendance, false = re-accept

  const event = await prisma.event.findFirst({
    where: { id: eventId, clubId: member.clubId },
  });
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Check deadline
  const deadlineTs = event.date.getTime() - CANCEL_DEADLINE_SECONDS * 1000;
  if (Date.now() > deadlineTs) {
    return NextResponse.json({ error: 'Past deadline.' }, { status: 400 });
  }

  if (cancel) {
    await prisma.eventCancellation.upsert({
      where: { eventId_memberId: { eventId, memberId: member.id } },
      create: { eventId, memberId: member.id },
      update: {},
    });
  } else {
    await prisma.eventCancellation.deleteMany({
      where: { eventId, memberId: member.id },
    });
  }

  return NextResponse.json({ ok: true });
}
