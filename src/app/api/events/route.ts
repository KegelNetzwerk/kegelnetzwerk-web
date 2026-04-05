import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentMember } from '@/lib/auth';
import { ensureRecurringEvents, generateOccurrences } from '@/lib/recurrence';

const ALLOWED_PAGE_SIZES = [5, 10, 20];
const DEFAULT_PAGE_SIZE = 5;

export async function GET(req: NextRequest) {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Auto-expand recurring events before querying
  await ensureRecurringEvents(member.clubId);

  const { searchParams } = new URL(req.url);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);
  const past = searchParams.get('past') === 'true';
  const eventId = searchParams.get('id');
  const limitParam = parseInt(searchParams.get('limit') ?? String(DEFAULT_PAGE_SIZE), 10);
  const pageSize = ALLOWED_PAGE_SIZES.includes(limitParam) ? limitParam : DEFAULT_PAGE_SIZE;

  const now = new Date();

  const where = {
    clubId: member.clubId,
    date: past ? { lt: now } : { gte: now },
    ...(eventId ? { id: parseInt(eventId, 10) } : {}),
  };

  const [events, total, club] = await Promise.all([
    prisma.event.findMany({
      where,
      include: {
        author: { select: { id: true, nickname: true } },
        cancellations: {
          include: { member: { select: { id: true, nickname: true, pic: true } } },
        },
        comments: {
          include: { author: { select: { nickname: true, pic: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { date: past ? 'desc' : 'asc' },
      take: eventId ? 1 : pageSize,
      skip: eventId ? 0 : offset,
    }),
    eventId ? Promise.resolve(1) : prisma.event.count({ where }),
    prisma.club.findUnique({ where: { id: member.clubId }, select: { cancelDaysBeforeEvent: true } }),
  ]);

  const cancelDays = club?.cancelDaysBeforeEvent ?? 5;
  const CANCEL_DEADLINE_SECONDS = cancelDays * 24 * 60 * 60;

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
      cancelDeadline: new Date(deadlineTs).toISOString(),
      recurrenceRuleId: event.recurrenceRuleId,
      cancellations: event.cancellations.map((c) => ({
        memberId: c.memberId,
        nickname: c.member.nickname,
        pic: c.member.pic,
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

  return NextResponse.json({ items: serialized, total, pageSize });
}

export async function POST(req: NextRequest) {
  try {
    const member = await getCurrentMember();
    if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { subject, location, description, date, recurrenceType, intervalWeeks } = await req.json();

    if (!subject || subject.length < 3) {
      return NextResponse.json({ error: 'Subject too short.' }, { status: 400 });
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date.' }, { status: 400 });
    }

    // Non-recurring: create single event
    if (!recurrenceType || recurrenceType === 'NONE') {
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

    // Recurring: create rule then generate all instances up to 12 months
    const rule = await prisma.eventRecurrenceRule.create({
      data: {
        clubId: member.clubId,
        authorId: member.id,
        subject,
        location: location ?? '',
        description: description ?? '',
        type: recurrenceType,
        intervalWeeks: recurrenceType === 'EVERY_N_WEEKS' ? (intervalWeeks ?? 1) : null,
        startDate: parsedDate,
      },
    });

    const dates = generateOccurrences(parsedDate, recurrenceType, intervalWeeks ?? null);
    await prisma.event.createMany({
      data: dates.map((d) => ({
        clubId: member.clubId,
        authorId: member.id,
        subject,
        location: location ?? '',
        description: description ?? '',
        date: d,
        recurrenceRuleId: rule.id,
      })),
    });

    return NextResponse.json({ ok: true, ruleId: rule.id }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('POST /api/events error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
