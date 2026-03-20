import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentMember } from '@/lib/auth';
import { verifyTurnstile } from '@/lib/turnstile';

// POST /api/member-comments — create a comment on a member profile (guests allowed)
export async function POST(req: NextRequest) {
  const viewer = await getCurrentMember();

  const { profileMemberId, content, guestName, captchaToken } = await req.json();

  if (!content?.trim()) {
    return NextResponse.json({ error: 'tooShort' }, { status: 400 });
  }

  // Guests must provide a name and pass the captcha
  if (!viewer) {
    if (!guestName?.trim()) {
      return NextResponse.json({ error: 'guestNameRequired' }, { status: 400 });
    }
    if (!captchaToken || !(await verifyTurnstile(captchaToken))) {
      return NextResponse.json({ error: 'captchaFailed' }, { status: 400 });
    }
  }

  const profileMember = await prisma.member.findUnique({
    where: { id: profileMemberId },
    select: { id: true },
  });
  if (!profileMember) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const comment = await prisma.memberComment.create({
    data: {
      profileMemberId,
      authorMemberId: viewer?.id ?? null,
      guestName: viewer ? '' : guestName.trim(),
      content: content.trim(),
    },
    include: {
      authorMember: { select: { nickname: true, pic: true, club: { select: { name: true, farbe2: true } } } },
    },
  });

  const isProfileOwner = viewer?.id === profileMemberId;
  const isOwnComment = viewer != null && viewer.id === comment.authorMemberId;

  return NextResponse.json({
    id: comment.id,
    content: comment.content,
    createdAt: comment.createdAt.toISOString(),
    authorName: comment.authorMember?.nickname ?? comment.guestName,
    authorPic: comment.authorMember?.pic ?? null,
    canDelete: isOwnComment || isProfileOwner || viewer?.role === 'ADMIN',
    authorClubName: comment.authorMember?.club.name ?? null,
    authorClubColor: comment.authorMember?.club.farbe2 ?? null,
  });
}
