import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ClubComments, { ClubCommentData } from '@/components/ClubComments';

export default async function PublicClubPage({
  params,
}: {
  params: Promise<{ clubName: string }>;
}) {
  const { clubName } = await params;
  const decodedName = decodeURIComponent(clubName);

  const [viewer, locale, t] = await Promise.all([
    getCurrentMember(),
    getLocale(),
    getTranslations('clubProfile'),
  ]);

  const club = await prisma.club.findUnique({
    where: { name: decodedName },
    select: {
      id: true,
      name: true,
      pic: true,
      aboutUs: true,
      members: {
        select: { id: true, nickname: true, firstName: true, pic: true },
        orderBy: { nickname: 'asc' },
      },
    },
  });

  if (!club) notFound();

  const rawComments = await prisma.clubComment.findMany({
    where: { clubId: club.id },
    orderBy: { createdAt: 'desc' },
    include: { authorMember: { select: { nickname: true, pic: true, club: { select: { name: true, farbe2: true } } } } },
  });

  const isClubAdmin = viewer?.role === 'ADMIN' && viewer.clubId === club.id;
  const comments: ClubCommentData[] = rawComments.map((c) => ({
    id: c.id,
    content: c.content,
    createdAt: c.createdAt.toISOString(),
    authorName: c.authorMember?.nickname ?? c.guestName,
    authorPic: c.authorMember?.pic ?? null,
    canDelete: (viewer != null && viewer.id === c.authorMemberId) || isClubAdmin,
    authorClubName: c.authorMember?.club.name ?? null,
    authorClubColor: c.authorMember?.club.farbe2 ?? null,
  }));

  return (
    <div className="space-y-8">
      {/* Back */}
      <Link
        href={`/${locale}/`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground cursor-pointer"
      >
        <ArrowLeft size={16} />
        KegelNetzwerk
      </Link>

      {/* Club header */}
      <div className="flex items-center gap-6">
        {club.pic && club.pic !== 'none' ? (
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border">
            <Image src={club.pic} alt={club.name} fill className="object-contain" />
          </div>
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border bg-muted text-xs text-muted-foreground">
            {t('noLogo')}
          </div>
        )}
        <h1 className="text-3xl font-bold">{club.name}</h1>
      </div>

      {/* About us */}
      {club.aboutUs && (
        <div>
          <h2 className="mb-3 text-xl font-semibold">{t('aboutUs')}</h2>
          <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: club.aboutUs }} />
        </div>
      )}

      {/* Member grid */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">
          {t('members')} ({club.members.length})
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {club.members.map((m) => (
            <Link
              key={m.id}
              href={`/${locale}/clubs/${encodeURIComponent(club.name)}/members/${m.id}`}
              className="flex flex-col items-center gap-2 text-center rounded-lg p-2 hover:bg-muted/50 transition-colors cursor-pointer"
            >
              {m.pic && m.pic !== 'none' ? (
                <div className="relative h-16 w-16 overflow-hidden rounded-full border">
                  <Image src={m.pic} alt={m.nickname} fill className="object-cover" />
                </div>
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full border bg-muted text-xl font-semibold text-muted-foreground">
                  {m.nickname.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-sm font-medium">{m.nickname}</p>
                {m.firstName && (
                  <p className="text-xs text-muted-foreground">{m.firstName}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Club comments */}
      <ClubComments
        clubId={club.id}
        initialComments={comments}
        isLoggedIn={viewer != null}
      />
    </div>
  );
}
