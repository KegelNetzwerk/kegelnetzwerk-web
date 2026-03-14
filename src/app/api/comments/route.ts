import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentMember } from '@/lib/auth';
import { CommentType } from '@prisma/client';

export async function POST(req: NextRequest) {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { referenceId, type, content } = await req.json();

  if (!content?.trim()) {
    return NextResponse.json({ error: 'Content is required.' }, { status: 400 });
  }

  if (!['NEWS', 'VOTE', 'EVENT'].includes(type)) {
    return NextResponse.json({ error: 'Invalid type.' }, { status: 400 });
  }

  const data: Parameters<typeof prisma.comment.create>[0]['data'] = {
    authorId: member.id,
    content: content.trim(),
    type: type as CommentType,
    referenceId,
  };

  // Set the specific FK for cascade deletes
  if (type === 'NEWS') data.newsId = referenceId;
  if (type === 'VOTE') data.voteId = referenceId;
  if (type === 'EVENT') data.eventId = referenceId;

  const comment = await prisma.comment.create({
    data,
    include: { author: { select: { nickname: true } } },
  });

  return NextResponse.json({
    id: comment.id,
    content: comment.content,
    createdAt: comment.createdAt.toISOString(),
    author: comment.author,
    isOwn: true,
  });
}
