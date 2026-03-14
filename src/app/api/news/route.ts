import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentMember } from '@/lib/auth';
import { sendEmail } from '@/lib/email';

const PAGE_SIZE = 5;

export async function GET(req: NextRequest) {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);
  const newsId = searchParams.get('id');

  const where = {
    clubId: member.clubId,
    ...(newsId ? { id: parseInt(newsId, 10) } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.news.findMany({
      where,
      include: {
        author: { select: { nickname: true } },
        comments: {
          include: { author: { select: { nickname: true } } },
          orderBy: { createdAt: 'asc' as const },
        },
      },
      orderBy: { createdAt: 'desc' as const },
      take: newsId ? 1 : PAGE_SIZE,
      skip: newsId ? 0 : offset,
    }),
    newsId ? Promise.resolve(1) : prisma.news.count({ where }),
  ]);

  return NextResponse.json({ items, total, pageSize: PAGE_SIZE });
}

export async function POST(req: NextRequest) {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { title, content, internal, sendNotification } = await req.json();

  if (!title || title.length < 3) {
    return NextResponse.json({ error: 'Title too short.' }, { status: 400 });
  }
  if (!content || content.length < 3) {
    return NextResponse.json({ error: 'Content too short.' }, { status: 400 });
  }

  const news = await prisma.news.create({
    data: {
      clubId: member.clubId,
      authorId: member.id,
      title,
      content,
      internal: !!internal,
      emailNotified: !!sendNotification,
    },
    include: { author: { select: { nickname: true } } },
  });

  // Send email notification if requested
  if (sendNotification) {
    const clubMembers = await prisma.member.findMany({
      where: { clubId: member.clubId, email: { not: '' } },
      select: { email: true },
    });

    const emailPromises = clubMembers.map((m) =>
      sendEmail({
        to: m.email,
        subject: `KegelNetzwerk – ${title}`,
        html: `<h2>${title}</h2>${content}`,
      }).catch(() => {})
    );

    await Promise.all(emailPromises);
  }

  return NextResponse.json(news, { status: 201 });
}
