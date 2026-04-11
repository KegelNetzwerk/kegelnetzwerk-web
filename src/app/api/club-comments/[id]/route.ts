import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentMember } from '@/lib/auth';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await getCurrentMember();
  if (!viewer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const commentId = Number.parseInt((await params).id, 10);
  if (isNaN(commentId)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const comment = await prisma.clubComment.findUnique({
    where: { id: commentId },
    select: { authorMemberId: true, clubId: true },
  });
  if (!comment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const isOwnComment = viewer.id === comment.authorMemberId;
  const isClubAdmin = viewer.role === 'ADMIN' && viewer.clubId === comment.clubId;

  if (!isOwnComment && !isClubAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.clubComment.delete({ where: { id: commentId } });
  return NextResponse.json({ ok: true });
}
