import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import MembersClient from './MembersClient';

export default async function AdminMembersPage() {
  const member = await getCurrentMember();
  if (!member || member.role !== Role.ADMIN) redirect('/');

  const [members, guests] = await Promise.all([
    prisma.member.findMany({
      where: { clubId: member.clubId },
      orderBy: { nickname: 'asc' },
      select: {
        id: true,
        nickname: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        birthday: true,
        role: true,
        pic: true,
      },
    }),
    prisma.guest.findMany({
      where: { clubId: member.clubId },
      orderBy: { nickname: 'asc' },
      select: { id: true, nickname: true, firstName: true, lastName: true },
    }),
  ]);

  const serialized = members.map((m) => ({
    ...m,
    birthday: m.birthday ? m.birthday.toISOString() : null,
  }));

  return <MembersClient initialMembers={serialized} initialGuests={guests} currentMemberId={member.id} />;
}
