import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, LogIn } from 'lucide-react';
import MemberComments, { MemberCommentData } from '@/components/MemberComments';

export default async function PublicMemberProfilePage({
  params,
}: {
  params: Promise<{ clubName: string; id: string }>;
}) {
  const { clubName, id } = await params;
  const memberId = parseInt(id, 10);
  if (isNaN(memberId)) notFound();

  const decodedClubName = decodeURIComponent(clubName);

  const [viewer, locale, t] = await Promise.all([
    getCurrentMember(),
    getLocale(),
    getTranslations('memberProfile'),
  ]);

  const club = await prisma.club.findUnique({
    where: { name: decodedClubName },
    select: { id: true, name: true },
  });
  if (!club) notFound();

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      clubId: true,
      nickname: true,
      firstName: true,
      pic: true,
      // No lastName, birthday, email, phone — public profile only
    },
  });

  if (!member || member.clubId !== club.id) notFound();

  const hasPic = member.pic && member.pic !== 'none';

  // Fetch comments
  const rawComments = await prisma.memberComment.findMany({
    where: { profileMemberId: memberId },
    orderBy: { createdAt: 'desc' },
    include: { authorMember: { select: { nickname: true, pic: true, club: { select: { name: true, farbe2: true } } } } },
  });

  // On the public route: viewers can only delete their own comments (profile owner is not logged in here by default)
  const isProfileOwner = viewer?.id === memberId;
  const comments: MemberCommentData[] = rawComments.map((c) => ({
    id: c.id,
    content: c.content,
    createdAt: c.createdAt.toISOString(),
    authorName: c.authorMember?.nickname ?? c.guestName,
    authorPic: c.authorMember?.pic ?? null,
    canDelete:
      (viewer != null && viewer.id === c.authorMemberId) ||
      isProfileOwner ||
      viewer?.role === 'ADMIN',
    authorClubName: c.authorMember?.club.name ?? null,
    authorClubColor: c.authorMember?.club.farbe2 ?? null,
  }));

  const clubHref = `/${locale}/clubs/${encodeURIComponent(decodedClubName)}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={clubHref} className="text-muted-foreground hover:text-foreground cursor-pointer">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
      </div>

      <div className="flex items-center gap-6">
        {hasPic ? (
          <div className="relative h-48 w-48 shrink-0 overflow-hidden rounded-full border">
            <Image src={member.pic!} alt={member.nickname} fill className="object-cover" />
          </div>
        ) : (
          <div className="flex h-48 w-48 shrink-0 items-center justify-center rounded-full border bg-muted text-6xl font-semibold text-muted-foreground">
            {member.nickname.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <p className="text-2xl font-bold">{member.nickname}</p>
          {member.firstName && (
            <p className="text-muted-foreground text-lg">{member.firstName}</p>
          )}
        </div>
      </div>

      {/* Hint to log in for full contact info */}
      {!viewer && (
        <Link
          href={`/${locale}/login`}
          className="inline-flex items-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
        >
          <LogIn size={15} />
          {t('loginToSeeMore')}
        </Link>
      )}

      <MemberComments
        profileMemberId={memberId}
        initialComments={comments}
        isLoggedIn={viewer != null}
      />
    </div>
  );
}
