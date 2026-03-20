import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentMember } from '@/lib/auth';
import { verifyTurnstile } from '@/lib/turnstile';

// POST /api/club-comments — create a comment on a club profile (guests allowed)
export async function POST(req: NextRequest) {
  const viewer = await getCurrentMember();

  const { clubId, content, guestName, captchaToken } = await req.json();

  if (!content?.trim()) {
    return NextResponse.json({ error: 'tooShort' }, { status: 400 });
  }

  if (!viewer) {
    if (!guestName?.trim()) {
      return NextResponse.json({ error: 'guestNameRequired' }, { status: 400 });
    }
    if (!captchaToken || !(await verifyTurnstile(captchaToken))) {
      return NextResponse.json({ error: 'captchaFailed' }, { status: 400 });
    }
  }

  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { id: true },
  });
  if (!club) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const comment = await prisma.clubComment.create({
    data: {
      clubId,
      authorMemberId: viewer?.id ?? null,
      guestName: viewer ? '' : guestName.trim(),
      content: content.trim(),
    },
    include: {
      authorMember: { select: { nickname: true, pic: true, club: { select: { name: true, farbe2: true } } } },
    },
  });

  const isClubAdmin = viewer?.role === 'ADMIN' && viewer.clubId === clubId;
  const isOwnComment = viewer != null && viewer.id === comment.authorMemberId;

  return NextResponse.json({
    id: comment.id,
    content: comment.content,
    createdAt: comment.createdAt.toISOString(),
    authorName: comment.authorMember?.nickname ?? comment.guestName,
    authorPic: comment.authorMember?.pic ?? null,
    canDelete: isOwnComment || isClubAdmin,
    authorClubName: comment.authorMember?.club.name ?? null,
    authorClubColor: comment.authorMember?.club.farbe2 ?? null,
  });
}
