import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAppMember } from '@/lib/appAuth';

// GET /api/app/events
// Returns upcoming events with cancel deadline for push notification scheduling
export async function GET(req: NextRequest) {
  const member = await getAppMember(req);
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const club = await prisma.club.findUnique({
    where: { id: member.clubId },
    select: { cancelDaysBeforeEvent: true },
  });
  const cancelDays = club?.cancelDaysBeforeEvent ?? 5;

  const events = await prisma.event.findMany({
    where: {
      clubId: member.clubId,
      date: { gte: new Date() },
    },
    orderBy: { date: 'asc' },
    select: {
      id: true,
      subject: true,
      date: true,
      cancellations: {
        where: { memberId: member.id },
        select: { id: true },
      },
    },
  });

  const result = events.map((e) => {
    const deadlineMs = e.date.getTime() - cancelDays * 24 * 60 * 60 * 1000;
    return {
      id: e.id,
      subject: e.subject,
      date: e.date.toISOString(),
      cancelDeadline: new Date(deadlineMs).toISOString(),
      hasCancelled: e.cancellations.length > 0,
    };
  });

  return NextResponse.json(result);
}
