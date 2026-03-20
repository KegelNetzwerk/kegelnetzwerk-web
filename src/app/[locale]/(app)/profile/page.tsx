import { getCurrentMember } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import ProfileClient from './ProfileClient';

export default async function ProfilePage() {
  const member = await getCurrentMember();
  if (!member) redirect('/login');

  const currentYear = new Date().getFullYear();

  const [history, allYears, fullMember] = await Promise.all([
    prisma.secretSantaAssignment.findMany({
      where: { giverId: member.id },
      orderBy: { year: 'desc' },
      include: { receiver: { select: { nickname: true, pic: true } } },
    }),
    prisma.secretSantaAssignment.findMany({
      where: { clubId: member.clubId },
      distinct: ['year'],
      select: { year: true },
      orderBy: { year: 'desc' },
    }),
    prisma.member.findUnique({
      where: { id: member.id },
      select: { secretSantaPartner: { select: { nickname: true, pic: true } } },
    }),
  ]);

  const historyByYear = new Map(history.map((h) => [h.year, { nickname: h.receiver.nickname, pic: h.receiver.pic }]));

  // If the current year has no assignment row yet but a partner pointer exists, synthesize a row
  const hasCurrentYearRow = allYears.some(({ year }) => year === currentYear);
  const legacyPartner = fullMember?.secretSantaPartner ?? null;
  if (!hasCurrentYearRow && legacyPartner) {
    allYears.unshift({ year: currentYear });
    historyByYear.set(currentYear, { nickname: legacyPartner.nickname, pic: legacyPartner.pic });
  }

  const santaRows = allYears.map(({ year }) => ({
    year,
    receiverNickname: historyByYear.get(year)?.nickname ?? null,
    receiverPic: historyByYear.get(year)?.pic ?? null,
  }));

  return (
    <ProfileClient
      member={{
        id: member.id,
        nickname: member.nickname,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        phone: member.phone,
        birthday: member.birthday ? member.birthday.toISOString() : null,
        pic: member.pic,
      }}
      santaRows={santaRows}
    />
  );
}
