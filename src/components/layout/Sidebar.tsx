import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import MainNav from './MainNav';
import type { Member, Club } from '@prisma/client';

interface SidebarProps {
  member: (Member & { club: Club }) | null;
}

export default async function Sidebar({ member }: SidebarProps) {
  const t = await getTranslations('profile');
  const locale = 'de'; // resolved from params in parent — simplified here

  if (!member) {
    // Guest sidebar — show login link
    return (
      <aside className="w-56 min-h-full p-4 flex flex-col gap-4" style={{ backgroundColor: 'var(--color-primary)' }}>
        <div className="text-white text-center">
          <Link href="/login" className="text-white underline text-sm">
            Anmelden
          </Link>
        </div>
      </aside>
    );
  }

  // Find next upcoming birthday among club members
  const members = await prisma.member.findMany({
    where: { clubId: member.clubId },
    select: { nickname: true, birthday: true },
  });

  const now = new Date();
  const nextBirthday = getNextBirthday(members, now);

  // Get Secret Santa partner nickname
  const santaPartner = member.secretSantaPartnerId
    ? await prisma.member.findUnique({
        where: { id: member.secretSantaPartnerId },
        select: { nickname: true },
      })
    : null;

  const memberCount = members.length;
  const isAdmin = member.role === 'ADMIN';

  return (
    <aside className="w-56 min-h-full p-4 flex flex-col gap-4" style={{ backgroundColor: 'var(--color-primary)' }}>
      {/* Club logo */}
      <div className="text-center">
        <Link href={`/${locale}/club`}>
          {member.club.pic !== 'none' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={member.club.pic}
              alt="Club logo"
              className="w-32 h-32 object-contain mx-auto rounded"
            />
          ) : (
            <div className="w-32 h-32 bg-white/20 rounded mx-auto flex items-center justify-center text-white/50 text-xs">
              No logo
            </div>
          )}
        </Link>
        <h2 className="text-white font-bold mt-2 text-sm">{member.club.name}</h2>
      </div>

      {/* Club info */}
      <div className="text-white text-sm space-y-2">
        <div>
          <span className="font-semibold">{t('sidebar.members')}:</span>{' '}
          {memberCount}
        </div>
        {nextBirthday && (
          <div>
            <span className="font-semibold">{t('sidebar.nextBirthday')}:</span>
            <br />
            {nextBirthday}
          </div>
        )}
        {santaPartner && (
          <div>
            <span className="font-semibold">{t('sidebar.secretSantaPartner')}:</span>
            <br />
            {santaPartner.nickname}
          </div>
        )}
      </div>

      <hr className="border-white/20" />

      {/* Navigation */}
      <MainNav isAdmin={isAdmin} locale={locale} />

      <hr className="border-white/20" />

      {/* Profile / logout */}
      <div className="flex flex-col gap-1 mt-auto">
        <Link
          href={`/${locale}/profile`}
          className="text-white/70 hover:text-white text-sm px-3 py-1"
        >
          Profil bearbeiten
        </Link>
        <form action={`/api/auth/logout`} method="POST">
          <button
            type="submit"
            className="text-white/70 hover:text-white text-sm px-3 py-1 text-left w-full"
          >
            Abmelden
          </button>
        </form>
      </div>
    </aside>
  );
}

function getNextBirthday(
  members: { nickname: string; birthday: Date | null }[],
  now: Date
): string | null {
  const today = now.getMonth() * 100 + now.getDate(); // MMDD as number

  let closest: { nickname: string; mmdd: number; wrapped: boolean } | null = null;

  for (const m of members) {
    if (!m.birthday) continue;
    const mmdd = m.birthday.getMonth() * 100 + m.birthday.getDate();
    const wrapped = mmdd < today;
    const effective = wrapped ? mmdd + 10000 : mmdd;

    if (!closest || effective < (closest.wrapped ? closest.mmdd + 10000 : closest.mmdd)) {
      closest = { nickname: m.nickname, mmdd, wrapped };
    }
  }

  if (!closest) return null;

  const month = String(Math.floor(closest.mmdd / 100) + 1).padStart(2, '0');
  const day = String(closest.mmdd % 100).padStart(2, '0');
  return `${closest.nickname} (${day}.${month}.)`;
}
