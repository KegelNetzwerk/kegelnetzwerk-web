import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import KncAdminClient from './KncAdminClient';

export default async function AdminKncPage() {
  const member = await getCurrentMember();
  if (!member || member.role !== Role.ADMIN) redirect('/');

  const members = await prisma.member.findMany({
    where: { clubId: member.clubId },
    select: { id: true, nickname: true, pic: true, isInactive: true, kncBalance: true },
    orderBy: { nickname: 'asc' },
  });

  return <KncAdminClient members={members} />;
}
