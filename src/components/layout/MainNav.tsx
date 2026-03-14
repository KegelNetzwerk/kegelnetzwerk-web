'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

interface NavItem {
  href: string;
  label: string;
  adminOnly?: boolean;
}

interface MainNavProps {
  isAdmin: boolean;
  locale: string;
}

export default function MainNav({ isAdmin, locale }: MainNavProps) {
  const t = useTranslations('nav');
  const pathname = usePathname();

  const navItems: NavItem[] = [
    { href: `/${locale}/news`, label: t('news') },
    { href: `/${locale}/votes`, label: t('votes') },
    { href: `/${locale}/events`, label: t('events') },
    { href: `/${locale}/scoring`, label: t('scoring') },
    { href: `/${locale}/club`, label: t('clubProfile') },
    { href: `/${locale}/contact`, label: t('contactList') },
    { href: `/${locale}/secret-santa`, label: t('secretSanta') },
    { href: `/${locale}/admin`, label: t('admin'), adminOnly: true },
  ];

  return (
    <nav className="flex flex-col gap-1">
      {navItems
        .filter((item) => !item.adminOnly || isAdmin)
        .map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
              pathname.startsWith(item.href)
                ? 'text-white'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
            style={
              pathname.startsWith(item.href)
                ? { backgroundColor: 'var(--color-secondary)' }
                : {}
            }
          >
            {item.label}
          </Link>
        ))}
    </nav>
  );
}
