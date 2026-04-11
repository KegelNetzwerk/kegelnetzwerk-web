import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentMember } from '@/lib/auth';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const commentId = Number.parseInt(id, 10);

  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Only the author or an admin can delete
  if (comment.authorId !== member.id && member.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.comment.delete({ where: { id: commentId } });
  return NextResponse.json({ ok: true });
}
