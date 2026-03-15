import { getTranslations } from 'next-intl/server';
import { cookies } from 'next/headers';
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

  const cookieStore = await cookies();
  const initialCollapsed = cookieStore.get('kn-sidebar-collapsed')?.value === 'true';

  const [members, santaPartner, latestNews, nextEvent, openVotes] = await Promise.all([
    prisma.member.findMany({
      where: { clubId: member.clubId },
      select: { nickname: true, birthday: true },
    }),
    member.secretSantaPartnerId
      ? prisma.member.findUnique({
          where: { id: member.secretSantaPartnerId },
          select: { nickname: true },
        })
      : Promise.resolve(null),
    prisma.news.findFirst({
      where: { clubId: member.clubId },
      orderBy: { createdAt: 'desc' },
      select: { title: true },
    }),
    prisma.event.findFirst({
      where: { clubId: member.clubId, date: { gte: new Date() } },
      orderBy: { date: 'asc' },
      select: { subject: true, date: true },
    }),
    prisma.vote.findMany({
      where: { clubId: member.clubId, closed: false },
      select: { title: true },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const nextBirthday = getNextBirthday(members, new Date());

  const nextEventLabel = nextEvent
    ? `${nextEvent.subject} (${nextEvent.date.toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-GB', { day: '2-digit', month: '2-digit' })})`
    : null;

  return (
    <SidebarShell
      initialCollapsed={initialCollapsed}
      locale={locale}
      clubName={member.club.name}
      clubPic={member.club.pic}
      memberCount={members.length}
      nextBirthday={nextBirthday}
      santaPartner={santaPartner?.nickname ?? null}
      latestNews={latestNews?.title ?? null}
      nextEvent={nextEventLabel}
      openVoteTitles={openVotes.map((v) => v.title)}
      labelMembers={t('sidebar.members')}
      labelBirthday={t('sidebar.nextBirthday')}
      labelSanta={t('sidebar.secretSantaPartner')}
      labelLatestNews={t('sidebar.latestNews')}
      labelNextEvent={t('sidebar.nextEvent')}
      labelOpenVotes={t('sidebar.openVotes')}
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
