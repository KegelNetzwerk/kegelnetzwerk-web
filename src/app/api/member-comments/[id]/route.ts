import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentMember } from '@/lib/auth';

// DELETE /api/member-comments/[id] — delete a comment
// Allowed: comment author, profile owner, or admin
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const viewer = await getCurrentMember();
  if (!viewer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const commentId = parseInt(id, 10);

  const comment = await prisma.memberComment.findUnique({ where: { id: commentId } });
  if (!comment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const isOwnComment = comment.authorMemberId === viewer.id;
  const isProfileOwner = comment.profileMemberId === viewer.id;
  const isAdmin = viewer.role === 'ADMIN';

  if (!isOwnComment && !isProfileOwner && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.memberComment.delete({ where: { id: commentId } });
  return NextResponse.json({ ok: true });
}
