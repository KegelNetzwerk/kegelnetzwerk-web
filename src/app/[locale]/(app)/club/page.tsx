import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import Image from 'next/image';

export default async function ClubProfilePage() {
  const member = await getCurrentMember();
  if (!member) redirect('/login');

  const t = await getTranslations('clubProfile');

  const club = await prisma.club.findUnique({
    where: { id: member.clubId },
    include: {
      members: {
        select: {
          id: true,
          nickname: true,
          firstName: true,
          lastName: true,
          pic: true,
        },
        orderBy: { nickname: 'asc' },
      },
    },
  });

  if (!club) redirect('/login');

  return (
    <div className="space-y-8">
      {/* Club header */}
      <div className="flex items-center gap-6">
        {club.pic && club.pic !== 'none' ? (
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border">
            <Image src={club.pic} alt={club.name} fill className="object-contain" />
          </div>
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border bg-muted text-xs text-muted-foreground">
            {t('noLogo')}
          </div>
        )}
        <h1 className="text-3xl font-bold">{club.name}</h1>
      </div>

      {/* About us */}
      {club.aboutUs && (
        <div>
          <h2 className="mb-3 text-xl font-semibold">{t('aboutUs')}</h2>
          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: club.aboutUs }}
          />
        </div>
      )}

      {/* Member photo grid */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">
          {t('members')} ({club.members.length})
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {club.members.map((m) => (
            <div key={m.id} className="flex flex-col items-center gap-2 text-center">
              {m.pic && m.pic !== 'none' ? (
                <div className="relative h-16 w-16 overflow-hidden rounded-full border">
                  <Image src={m.pic} alt={m.nickname} fill className="object-cover" />
                </div>
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full border bg-muted text-xl font-semibold text-muted-foreground">
                  {m.nickname.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-sm font-medium">{m.nickname}</p>
                {(m.firstName || m.lastName) && (
                  <p className="text-xs text-muted-foreground">
                    {[m.firstName, m.lastName].filter(Boolean).join(' ')}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
