import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getTranslations, getLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import ContactList from './ContactList';
import GamesOverview from './GamesOverview';
import YearlyWinners from './YearlyWinners';
import { computeYearlyWinners } from '@/lib/yearly-winners';
import ClubComments, { ClubCommentData } from '@/components/ClubComments';

export default async function ClubProfilePage() {
  const member = await getCurrentMember();
  if (!member) redirect('/login');

  const [t, tc, tg, locale] = await Promise.all([
    getTranslations('clubProfile'),
    getTranslations('contactList'),
    getTranslations('gameManagement'),
    getLocale(),
  ]);


  const [club, games] = await Promise.all([
    prisma.club.findUnique({
      where: { id: member.clubId },
      include: {
        members: {
          select: {
            id: true,
            nickname: true,
            firstName: true,
            lastName: true,
            pic: true,
            email: true,
            phone: true,
          },
          orderBy: { nickname: 'asc' },
        },
      },
    }),
    prisma.gameOrPenalty.findMany({
      where: { clubId: member.clubId },
      include: {
        parts: {
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    }),
  ]);

  if (!club) redirect('/login');

  const [yearlyWinners, rawComments] = await Promise.all([
    computeYearlyWinners(member.clubId, club.defaultScoringFilter ?? ''),
    prisma.clubComment.findMany({
      where: { clubId: member.clubId },
      orderBy: { createdAt: 'desc' },
      include: { authorMember: { select: { nickname: true, pic: true, club: { select: { name: true, farbe2: true } } } } },
    }),
  ]);

  const isClubAdmin = member.role === 'ADMIN';
  const comments: ClubCommentData[] = rawComments.map((c) => ({
    id: c.id,
    content: c.content,
    createdAt: c.createdAt.toISOString(),
    authorName: c.authorMember?.nickname ?? c.guestName,
    authorPic: c.authorMember?.pic ?? null,
    canDelete: member.id === c.authorMemberId || isClubAdmin,
    authorClubName: c.authorMember?.club.name ?? null,
    authorClubColor: c.authorMember?.club.farbe2 ?? null,
  }));

  return (
    <div className="space-y-8">
      {/* Club header */}
      <div className="flex items-center gap-6">
        {club.pic && club.pic !== 'none' ? (
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg">
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
          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: club.aboutUs }}
          />
        </div>
      )}

      {/* Member photo grid */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">
          {t('members')} ({club.members.length})
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {club.members.map((m) => (
            <Link
              key={m.id}
              href={`/${locale}/members/${m.id}`}
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
                {(m.firstName || m.lastName) && (
                  <p className="text-xs text-muted-foreground">
                    {[m.firstName, m.lastName].filter(Boolean).join(' ')}
                  </p>
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
        isLoggedIn
      />

      {/* Yearly winners */}
      {yearlyWinners.length > 0 && (
        <YearlyWinners
          winners={yearlyWinners}
          labels={{
            title: t('yearlyWinners'),
            year: t('year'),
            rank1: t('rank1'),
            rank2: t('rank2'),
            rank3: t('rank3'),
            lastPlace: t('lastPlace'),
            noData: t('noWinnersData'),
          }}
        />
      )}

      {/* Contact list — collapsible, auth-gated by server (member already verified above) */}
      <ContactList
        members={club.members.map((m) => ({
          id: m.id,
          nickname: m.nickname,
          email: m.email,
          phone: m.phone,
        }))}
        title={tc('title')}
        nicknameLabel={tc('nickname')}
        emailLabel={tc('email')}
        phoneLabel={tc('phone')}
      />

      {/* Games & Penalties overview — collapsible */}
      {games.length > 0 && (
        <GamesOverview
          games={games.map((g) => ({
            id: g.id,
            name: g.name,
            parts: g.parts.map((p) => ({
              id: p.id,
              name: p.name,
              unit: p.unit,
              value: p.value,
              factor: p.factor,
              bonus: p.bonus,
              variable: p.variable,
              once: p.once,
              description: p.description,
            })),
          }))}
          title={tg('title')}
          labels={{
            partName: tg('partName'),
            unit: tg('unit'),
            value: tg('value'),
            variable: tg('variable'),
            once: tg('once'),
            unitPoints: tg('unitPoints'),
            unitEuro: tg('unitEuro'),
          }}
        />
      )}
    </div>
  );
}
