import { getCurrentMember } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';

export default async function ContactPage() {
  const member = await getCurrentMember();
  if (!member) redirect('/login');

  const t = await getTranslations('contactList');

  const members = await prisma.member.findMany({
    where: { clubId: member.clubId },
    orderBy: { nickname: 'asc' },
    select: {
      id: true,
      nickname: true,
      email: true,
      phone: true,
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-2 text-left font-medium">{t('nickname')}</th>
              <th className="px-4 py-2 text-left font-medium">{t('email')}</th>
              <th className="px-4 py-2 text-left font-medium">{t('phone')}</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-t hover:bg-muted/50">
                <td className="px-4 py-2 font-medium">{m.nickname}</td>
                <td className="px-4 py-2">
                  {m.email ? (
                    <a
                      href={`mailto:${m.email}`}
                      className="text-[var(--color-primary)] hover:underline"
                    >
                      {m.email}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  {m.phone ? (
                    <a
                      href={`tel:${m.phone}`}
                      className="text-[var(--color-primary)] hover:underline"
                    >
                      {m.phone}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
