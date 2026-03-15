import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentMember } from '@/lib/auth';
import { Trophy, Users, Settings, Gift } from 'lucide-react';

const CARDS = [
  { href: '/admin/games', icon: Trophy, label: 'Games & Penalties' },
  { href: '/admin/members', icon: Users, label: 'Members' },
  { href: '/admin/settings', icon: Settings, label: 'Club Settings' },
  { href: '/secret-santa', icon: Gift, label: 'Secret Santa' },
];

export default async function AdminPage() {
  const member = await getCurrentMember();
  if (!member) redirect('/login');
  if (member.role !== 'ADMIN') redirect('/news');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Administration</h1>
      <div className="grid grid-cols-2 gap-4 max-w-md">
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
