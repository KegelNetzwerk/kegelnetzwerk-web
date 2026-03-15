import { getTranslations } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import type { Member, Club } from '@prisma/client';
import SidebarShell from './SidebarShell';

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
    <SidebarShell
      locale={locale}
      clubName={member.club.name}
      clubPic={member.club.pic}
      memberCount={members.length}
      nextBirthday={nextBirthday}
      santaPartner={santaPartner?.nickname ?? null}
      labelMembers={t('sidebar.members')}
      labelBirthday={t('sidebar.nextBirthday')}
      labelSanta={t('sidebar.secretSantaPartner')}
    />
  );
}

function getNextBirthday(members: { nickname: string; birthday: Date | null }[], now: Date): string | null {
  const today = now.getMonth() * 100 + now.getDate();
  let closest: { nickname: string; mmdd: number; wrapped: boolean } | null = null;
  for (const m of members) {
    if (!m.birthday) continue;
    const mmdd = m.birthday.getMonth() * 100 + m.birthday.getDate();
    const wrapped = mmdd < today;
    const eff = wrapped ? mmdd + 10000 : mmdd;
    if (!closest || eff < (closest.wrapped ? closest.mmdd + 10000 : closest.mmdd)) {
      closest = { nickname: m.nickname, mmdd, wrapped };
    }
  }
  if (!closest) return null;
  const month = String(Math.floor(closest.mmdd / 100) + 1).padStart(2, '0');
  const day = String(closest.mmdd % 100).padStart(2, '0');
  return `${closest.nickname} (${day}.${month}.)`;
}
