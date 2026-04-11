import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Pencil } from 'lucide-react';
import MemberComments, { MemberCommentData } from '@/components/MemberComments';
import { formatPhone } from '@/lib/format';

export default async function MemberProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { id } = await params;
  const { preview } = await searchParams;
  const memberId = Number.parseInt(id, 10);
  if (isNaN(memberId)) notFound();

  const [viewer, locale, t] = await Promise.all([
    getCurrentMember(),
    getLocale(),
    getTranslations('memberProfile'),
  ]);

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      clubId: true,
      nickname: true,
      firstName: true,
      lastName: true,
      birthday: true,
      email: true,
      phone: true,
      pic: true,
    },
  });

  if (!member) notFound();

  // Logged-in users from a different club cannot view this profile
  if (viewer && viewer.clubId !== member.clubId) notFound();

  const isRealOwner = viewer?.id === member.id;
  const guestPreview = isRealOwner && preview === 'guest';

  const sameClub = !guestPreview && viewer != null && viewer.clubId === member.clubId;
  const isOwnProfile = !guestPreview && isRealOwner;

  const birthdayFormatted =
    sameClub && member.birthday
      ? new Date(member.birthday).toLocaleDateString('de-DE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      : null;

  const hasPic = member.pic && member.pic !== 'none';

  // Fetch comments
  const rawComments = await prisma.memberComment.findMany({
    where: { profileMemberId: memberId },
    orderBy: { createdAt: 'desc' },
    include: { authorMember: { select: { nickname: true, pic: true, club: { select: { name: true, farbe2: true } } } } },
  });

  const comments: MemberCommentData[] = rawComments.map((c) => ({
    id: c.id,
    content: c.content,
    createdAt: c.createdAt.toISOString(),
    authorName: c.authorMember?.nickname ?? c.guestName,
    authorPic: c.authorMember?.pic ?? null,
    canDelete:
      (viewer != null && viewer.id === c.authorMemberId) ||
      isOwnProfile ||
      viewer?.role === 'ADMIN',
    authorClubName: c.authorMember?.club.name ?? null,
    authorClubColor: c.authorMember?.club.farbe2 ?? null,
  }));


  return (
    <div className="space-y-6">
      {guestPreview && (
        <div className="flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span>{t('guestPreviewBanner')}</span>
          <Link href={`/${locale}/profile`} className="font-medium underline hover:no-underline">
            {t('exitPreview')}
          </Link>
        </div>
      )}
      <div className="flex items-center gap-3">
        <Link href={`/${locale}/club`} className="text-muted-foreground hover:text-foreground cursor-pointer">
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
          {(member.firstName || (sameClub && member.lastName)) && (
            <p className="text-muted-foreground text-lg">
              {[member.firstName, sameClub ? member.lastName : null].filter(Boolean).join(' ')}
            </p>
          )}
        </div>
      </div>

      {(birthdayFormatted || (sameClub && member.email) || (sameClub && member.phone)) && (
        <div className="max-w-sm space-y-3 rounded-lg border bg-muted/30 p-4">
          {birthdayFormatted && (
            <div className="flex gap-2 text-sm">
              <span className="w-32 shrink-0 font-medium text-muted-foreground">{t('birthday')}</span>
              <span>{birthdayFormatted}</span>
            </div>
          )}
          {sameClub && member.email && (
            <div className="flex gap-2 text-sm">
              <span className="w-32 shrink-0 font-medium text-muted-foreground">{t('email')}</span>
              <a href={`mailto:${member.email}`} className="hover:underline break-all">{member.email}</a>
            </div>
          )}
          {sameClub && member.phone && (
            <div className="flex gap-2 text-sm">
              <span className="w-32 shrink-0 font-medium text-muted-foreground">{t('phone')}</span>
              <a href={`tel:${member.phone}`} className="hover:underline">{formatPhone(member.phone)}</a>
            </div>
          )}
        </div>
      )}

      {isOwnProfile && (
        <Link
          href={`/${locale}/profile`}
          className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm text-white"
          style={{ background: 'var(--kn-primary, #005982)' }}
        >
          <Pencil size={14} />
          {t('editProfile')}
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
