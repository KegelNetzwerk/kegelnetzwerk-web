import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import { Unit } from '@prisma/client';
import ContactList from './ContactList';
import GamesOverview from './GamesOverview';
import YearlyWinners from './YearlyWinners';

export default async function ClubProfilePage() {
  const member = await getCurrentMember();
  if (!member) redirect('/login');

  const [t, tc, tg] = await Promise.all([
    getTranslations('clubProfile'),
    getTranslations('contactList'),
    getTranslations('gameManagement'),
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

  // Compute yearly winners from defaultScoringFilter settings
  const filterParams = new URLSearchParams(club.defaultScoringFilter ?? '');
  const filterUnit = (filterParams.get('unit') === 'EURO' ? 'EURO' : 'POINTS') as Unit;
  const filterGopId = filterParams.get('gopId') ? parseInt(filterParams.get('gopId')!) : null;
  const filterEliLowest = parseInt(filterParams.get('eliLowest') ?? '0', 10);
  const filterEliHighest = parseInt(filterParams.get('eliHighest') ?? '0', 10);

  const [clubMembers, allScoringResults] = await Promise.all([
    prisma.member.findMany({ where: { clubId: member.clubId }, select: { id: true, nickname: true } }),
    prisma.result.findMany({
      where: {
        clubId: member.clubId,
        part: { unit: filterUnit },
        ...(filterGopId ? { gopId: filterGopId } : {}),
      },
      select: { memberId: true, sessionGroup: true, value: true, date: true },
    }),
  ]);

  type YearRanking = { nickname: string; total: number };
  const yearlyWinners: { year: number; unit: string; rankings: YearRanking[] }[] = [];

  if (allScoringResults.length > 0) {
    const minYear = Math.min(...allScoringResults.map((r) => r.date.getFullYear()));
    const maxYear = new Date().getFullYear();

    for (let year = maxYear; year >= minYear; year--) {
      const yearResults = allScoringResults.filter((r) => r.date.getFullYear() === year);
      if (yearResults.length === 0) continue;

      const sessionGroups = [...new Set(yearResults.map((r) => r.sessionGroup))];
      const rankings: YearRanking[] = [];

      for (const m of clubMembers) {
        const memberResults = yearResults.filter((r) => r.memberId === m.id);
        const sessionMap = new Map<number, number>();
        for (const r of memberResults) {
          sessionMap.set(r.sessionGroup, (sessionMap.get(r.sessionGroup) ?? 0) + r.value);
        }
        for (const sg of sessionGroups) {
          if (!sessionMap.has(sg)) sessionMap.set(sg, 0);
        }

        let sessionValues = Array.from(sessionMap.entries()).map(([sg, val]) => ({ sg, val }));
        if (filterEliLowest > 0) {
          const toExclude = new Set([...sessionValues].sort((a, b) => a.val - b.val).slice(0, filterEliLowest).map((s) => s.sg));
          sessionValues = sessionValues.filter((s) => !toExclude.has(s.sg));
        }
        if (filterEliHighest > 0) {
          const toExclude = new Set([...sessionValues].sort((a, b) => b.val - a.val).slice(0, filterEliHighest).map((s) => s.sg));
          sessionValues = sessionValues.filter((s) => !toExclude.has(s.sg));
        }

        const total = sessionValues.reduce((sum, s) => sum + s.val, 0);
        if (total > 0) rankings.push({ nickname: m.nickname, total });
      }

      if (rankings.length > 0) {
        rankings.sort((a, b) => b.total - a.total);
        yearlyWinners.push({ year, unit: filterUnit, rankings });
      }
    }
  }

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
            <div key={m.id} className="flex flex-col items-center gap-2 text-center">
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
            </div>
          ))}
        </div>
      </div>

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
