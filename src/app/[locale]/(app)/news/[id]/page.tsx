import { redirect, notFound } from 'next/navigation';
import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import NewsClient from '../NewsClient';

export default async function NewsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await getCurrentMember();
  if (!member) redirect('/login');

  const item = await prisma.news.findUnique({
    where: { id: Number.parseInt(id, 10) },
    include: {
      author: { select: { id: true, nickname: true } },
      comments: {
        include: { author: { select: { nickname: true, pic: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!item || item.clubId !== member.clubId) notFound();

  const serialized = {
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
  };

  return (
    <NewsClient
      initialItems={[serialized]}
      initialTotal={1}
      pageSize={1}
      currentMemberId={member.id}
      isAdmin={member.role === 'ADMIN'}
    />
  );
}
