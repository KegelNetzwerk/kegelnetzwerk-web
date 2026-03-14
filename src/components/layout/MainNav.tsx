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
  nickname: string;
}

export default function MainNav({ isAdmin, locale, nickname }: MainNavProps) {
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
    <nav className="kn-navbar">
      <div className="kn-navbar-links">
        {navItems
          .filter((item) => !item.adminOnly || isAdmin)
          .map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`kn-nav-link${active ? ' kn-nav-link-active' : ''}`}
              >
                {item.label}
              </Link>
            );
          })}
      </div>
      <div className="kn-navbar-right">
        <Link href={`/${locale}/profile`} className="kn-nav-link">
          {nickname}
        </Link>
        <form action="/api/auth/logout" method="POST">
          <button type="submit" className="kn-nav-link kn-nav-logout">
            {t('logout')}
          </button>
        </form>
      </div>
    </nav>
  );
}
