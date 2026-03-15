import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import SettingsClient from './SettingsClient';

export default async function AdminSettingsPage() {
  const member = await getCurrentMember();
  if (!member || member.role !== Role.ADMIN) redirect('/');

  const [club, games] = await Promise.all([
    prisma.club.findUnique({
      where: { id: member.clubId },
      select: {
        name: true,
        pic: true,
        header: true,
        aboutUs: true,
        farbe1: true,
        farbe2: true,
        farbe3: true,
        mono: true,
        bg1: true,
        bg2: true,
        bgColor: true,
        cancelDaysBeforeEvent: true,
        defaultGopId: true,
      },
    }),
    prisma.gameOrPenalty.findMany({
      where: { clubId: member.clubId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  if (!club) redirect('/');

  return <SettingsClient club={club} games={games} />;
}
