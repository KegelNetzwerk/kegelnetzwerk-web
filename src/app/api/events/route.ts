import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentMember } from '@/lib/auth';

const PAGE_SIZE = 5;

export async function GET(req: NextRequest) {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);
  const past = searchParams.get('past') === 'true';
  const eventId = searchParams.get('id');

  const now = new Date();

  const where = {
    clubId: member.clubId,
    date: past ? { lt: now } : { gte: now },
    ...(eventId ? { id: parseInt(eventId, 10) } : {}),
  };

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      include: {
        author: { select: { id: true, nickname: true } },
        cancellations: {
          include: { member: { select: { id: true, nickname: true } } },
        },
        comments: {
          include: { author: { select: { nickname: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { date: past ? 'desc' : 'asc' },
      take: eventId ? 1 : PAGE_SIZE,
      skip: eventId ? 0 : offset,
    }),
    eventId ? Promise.resolve(1) : prisma.event.count({ where }),
  ]);

  const CANCEL_DEADLINE_SECONDS = 432000; // 5 days

  const serialized = events.map((event) => {
    const myCancellation = event.cancellations.find((c) => c.memberId === member.id);
    const deadlineTs = event.date.getTime() - CANCEL_DEADLINE_SECONDS * 1000;
    const pastDeadline = Date.now() > deadlineTs;

    return {
      id: event.id,
      subject: event.subject,
      location: event.location,
      description: event.description,
      date: event.date.toISOString(),
      createdAt: event.createdAt.toISOString(),
      author: event.author,
      hasCancelled: !!myCancellation,
      pastDeadline,
      cancellations: event.cancellations.map((c) => ({
        memberId: c.memberId,
        nickname: c.member.nickname,
      })),
      comments: event.comments.map((c) => ({
        id: c.id,
        content: c.content,
        createdAt: c.createdAt.toISOString(),
        author: c.author,
        isOwn: c.authorId === member.id,
      })),
    };
  });

  return NextResponse.json({ items: serialized, total, pageSize: PAGE_SIZE });
}

export async function POST(req: NextRequest) {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { subject, location, description, date } = await req.json();

  if (!subject || subject.length < 3) {
    return NextResponse.json({ error: 'Subject too short.' }, { status: 400 });
  }

  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    return NextResponse.json({ error: 'Invalid date.' }, { status: 400 });
  }

  const event = await prisma.event.create({
    data: {
      clubId: member.clubId,
      authorId: member.id,
      subject,
      location: location ?? '',
      description: description ?? '',
      date: parsedDate,
    },
    include: { author: { select: { id: true, nickname: true } } },
  });

  return NextResponse.json(event, { status: 201 });
}
