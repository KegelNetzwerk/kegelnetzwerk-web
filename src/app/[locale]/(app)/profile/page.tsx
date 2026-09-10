import { getCurrentMember } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { buildSantaHistoryRows } from '@/lib/secret-santa-utils';
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

  const santaRows = buildSantaHistoryRows(
    history,
    allYears,
    currentYear,
    fullMember?.secretSantaPartner ?? null
  );

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
