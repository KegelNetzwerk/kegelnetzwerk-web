import { getCurrentMember } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getTranslations } from 'next-intl/server';
import { Role } from '@prisma/client';
import SecretSantaClient from './SecretSantaClient';

export default async function SecretSantaPage() {
  const member = await getCurrentMember();
  if (!member) redirect('/login');
  if (member.role !== Role.ADMIN) redirect('/news');

  const t = await getTranslations('secretSanta');

  const fullMember = await prisma.member.findUnique({
    where: { id: member.id },
    include: {
      secretSantaPartner: {
        select: { id: true, nickname: true, pic: true },
      },
    },
  });

  return (
    <SecretSantaClient
      isAdmin={member.role === Role.ADMIN}
      partner={
        fullMember?.secretSantaPartner
          ? {
              id: fullMember.secretSantaPartner.id,
              nickname: fullMember.secretSantaPartner.nickname,
              pic: fullMember.secretSantaPartner.pic,
            }
          : null
      }
    />
  );
}
