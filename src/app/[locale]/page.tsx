import { getCurrentMember } from '@/lib/auth';
import { stripHtml } from '@/lib/strip-html';
import { prisma } from '@/lib/prisma';
import { getLocale, getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import AuthShell from '@/components/layout/AuthShell';
import { ChevronRight, Smartphone } from 'lucide-react';

export default async function LandingPage() {
  const [member, locale, t] = await Promise.all([
    getCurrentMember(),
    getLocale(),
    getTranslations('publicLanding'),
  ]);

  if (member) redirect(`/${locale}/news`);

  const clubs = await prisma.club.findMany({
    select: {
      name: true,
      pic: true,
      aboutUs: true,
      _count: { select: { members: true } },
    },
    orderBy: { name: 'asc' },
  });

  return (
    <AuthShell maxWidth="max-w-4xl">
      <div className="px-8 py-10 space-y-10">

        {/* What is KegelNetzwerk? */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-bold" style={{ color: '#005982' }}>
              {t('whatIsTitle')}
            </h2>
            <Link
              href={`/${locale}/login`}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white"
              style={{ background: '#005982' }}
            >
              {t('loginButton')}
            </Link>
          </div>
          <p className="text-gray-700 leading-relaxed">
            {t('whatIsPara1')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(['feature1', 'feature2', 'feature3', 'feature4', 'feature5', 'feature6'] as const).map((key) => (
              <div key={key} className="flex items-start gap-2">
                <span
                  className="mt-0.5 h-5 w-5 shrink-0 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: '#005982' }}
                >
                  ✓
                </span>
                <span className="text-sm text-gray-700">{t(key)}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(0,0,0,0.08)' }} />

        {/* App placeholder */}
        <section>
          <div
            className="flex items-center gap-5 rounded-xl p-5"
            style={{ background: 'rgba(0,89,130,0.06)', border: '1px dashed rgba(0,89,130,0.3)' }}
          >
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-white"
              style={{ background: 'linear-gradient(135deg, #005982, #3089ac)' }}
            >
              <Smartphone size={28} />
            </div>
            <div>
              <p className="font-semibold text-gray-800">{t('appTitle')}</p>
              <p className="text-sm text-gray-500 mt-0.5">{t('appComingSoon')}</p>
            </div>
          </div>
        </section>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(0,0,0,0.08)' }} />

        {/* Club directory */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-gray-800">{t('clubsTitle')}</h2>

          {clubs.length === 0 ? (
            <p className="text-center text-gray-400 py-6">{t('noClubs')}</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {clubs.map((club) => {
                const hasPic = club.pic && club.pic !== 'none';
                const teaser = stripHtml(club.aboutUs ?? '').slice(0, 100);
                return (
                  <Link
                    key={club.name}
                    href={`/${locale}/clubs/${encodeURIComponent(club.name)}`}
                    className="group flex items-start gap-3 rounded-xl border bg-white p-4 hover:bg-gray-50 transition-colors"
                  >
                    {hasPic ? (
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border">
                        <Image src={club.pic!} alt={club.name} fill className="object-contain" />
                      </div>
                    ) : (
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-lg font-bold text-white"
                        style={{ background: '#005982' }}
                      >
                        {club.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="font-semibold truncate text-sm">{club.name}</p>
                        <ChevronRight size={14} className="shrink-0 text-gray-400 group-hover:text-gray-600 transition-colors" />
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {t('memberCount', { count: club._count.members })}
                      </p>
                      {teaser && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{teaser}</p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

      </div>
    </AuthShell>
  );
}

