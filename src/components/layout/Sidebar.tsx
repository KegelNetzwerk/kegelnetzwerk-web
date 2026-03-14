import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import type { Member, Club } from '@prisma/client';

interface SidebarProps {
  member: (Member & { club: Club }) | null;
  locale: string;
}

export default async function Sidebar({ member, locale }: SidebarProps) {
  const t = await getTranslations('profile');

  if (!member) return null;

  const members = await prisma.member.findMany({
    where: { clubId: member.clubId },
    select: { nickname: true, birthday: true },
  });

  const nextBirthday = getNextBirthday(members, new Date());

  const santaPartner = member.secretSantaPartnerId
    ? await prisma.member.findUnique({
        where: { id: member.secretSantaPartnerId },
        select: { nickname: true },
      })
    : null;

  return (
    <aside className="kn-sidebar">
      {/* Club logo */}
      <Link href={`/${locale}/club`} className="kn-sidebar-logo-link">
        {member.club.pic !== 'none' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={member.club.pic}
            alt="Club logo"
            className="kn-sidebar-logo"
          />
        ) : (
          <div className="kn-sidebar-logo-placeholder">
            {member.club.name.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="kn-sidebar-clubname">{member.club.name}</span>
      </Link>

      <hr className="kn-sidebar-divider" />

      {/* Info widgets */}
      <div className="kn-sidebar-info">
        <div className="kn-sidebar-info-row">
          <span className="kn-sidebar-label">{t('sidebar.members')}</span>
          <span>{members.length}</span>
        </div>
        {nextBirthday && (
          <div className="kn-sidebar-info-row">
            <span className="kn-sidebar-label">{t('sidebar.nextBirthday')}</span>
            <span>{nextBirthday}</span>
          </div>
        )}
        {santaPartner && (
          <div className="kn-sidebar-info-row">
            <span className="kn-sidebar-label">{t('sidebar.secretSantaPartner')}</span>
            <span>{santaPartner.nickname}</span>
          </div>
        )}
      </div>
    </aside>
  );
}

function getNextBirthday(
  members: { nickname: string; birthday: Date | null }[],
  now: Date
): string | null {
  const today = now.getMonth() * 100 + now.getDate();
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
