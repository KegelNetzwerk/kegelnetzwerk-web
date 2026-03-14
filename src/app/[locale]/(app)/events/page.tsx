import { redirect } from 'next/navigation';
import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import EventsClient from './EventsClient';

const PAGE_SIZE = 5;
const CANCEL_DEADLINE_SECONDS = 432000;

export default async function EventsPage() {
  const member = await getCurrentMember();
  if (!member) redirect('/login');

  const now = new Date();

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where: { clubId: member.clubId, date: { gte: now } },
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
      orderBy: { date: 'asc' },
      take: PAGE_SIZE,
    }),
    prisma.event.count({ where: { clubId: member.clubId, date: { gte: now } } }),
  ]);

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

  return (
    <EventsClient
      initialItems={serialized}
      initialTotal={total}
      pageSize={PAGE_SIZE}
      isAdmin={member.role === 'ADMIN'}
    />
  );
}
