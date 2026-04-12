import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentMember } from '@/lib/auth';
import { getTranslations } from 'next-intl/server';
import { Trophy, Users, Settings, Gift, ClipboardList, Wallet } from 'lucide-react';

export default async function AdminPage() {
  const member = await getCurrentMember();
  if (!member) redirect('/login');
  if (member.role !== 'ADMIN') redirect('/news');

  const t = await getTranslations('adminPage');

  const CARDS = [
    { href: '/admin/settings', icon: Settings, label: t('settings') },
    { href: '/admin/members', icon: Users, label: t('members') },
    { href: '/admin/games', icon: Trophy, label: t('games') },
    { href: '/admin/results', icon: ClipboardList, label: t('results') },
    { href: '/secret-santa', icon: Gift, label: t('secretSanta') },
    { href: '/admin/finance', icon: Wallet, label: t('finance') },
  ].sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {CARDS.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-3 rounded-lg border-2 p-6 text-center font-medium transition-colors hover:bg-gray-50"
            style={{ borderColor: 'var(--kn-primary, #005982)', color: 'var(--kn-primary, #005982)' }}
          >
            <Icon size={32} />
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
