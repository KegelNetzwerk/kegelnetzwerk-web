import { redirect } from 'next/navigation';
import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import NewsClient from './NewsClient';

const PAGE_SIZE = 5;

export default async function NewsPage() {
  const member = await getCurrentMember();
  if (!member) redirect('/login');

  const [items, total] = await Promise.all([
    prisma.news.findMany({
      where: { clubId: member.clubId },
      include: {
        author: { select: { nickname: true } },
        comments: {
          include: { author: { select: { nickname: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE,
    }),
    prisma.news.count({ where: { clubId: member.clubId } }),
  ]);

  // Serialize dates to strings for client
  const serialized = items.map((item) => ({
    ...item,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    comments: item.comments.map((c) => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt.toISOString(),
      author: c.author,
      isOwn: c.authorId === member.id,
    })),
  }));

  return (
    <NewsClient
      initialItems={serialized}
      initialTotal={total}
      pageSize={PAGE_SIZE}
      currentMemberId={member.id}
      isAdmin={member.role === 'ADMIN'}
    />
  );
}
