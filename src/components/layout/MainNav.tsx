'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

interface MainNavProps {
  isAdmin: boolean;
  locale: string;
  nickname: string;
}

export default function MainNav({ isAdmin, locale, nickname }: MainNavProps) {
  const t = useTranslations('nav');
  const pathname = usePathname();

  const navItems = [
    { href: `/${locale}/news`, label: t('news') },
    { href: `/${locale}/votes`, label: t('votes') },
    { href: `/${locale}/events`, label: t('events') },
    { href: `/${locale}/scoring`, label: t('scoring') },
    { href: `/${locale}/club`, label: t('clubProfile') },
    { href: `/${locale}/contact`, label: t('contactList') },
    ...(isAdmin ? [{ href: `/${locale}/admin`, label: t('admin') }] : []),
  ];

  const linkStyle = (href: string): React.CSSProperties => ({
    color: pathname.startsWith(href) ? '#ffffff' : 'rgba(255,255,255,0.78)',
    backgroundColor: pathname.startsWith(href) ? 'rgba(0,0,0,0.22)' : 'transparent',
    padding: '0 11px',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    fontSize: 13,
    fontWeight: 600,
    textDecoration: 'none',
    whiteSpace: 'nowrap' as const,
    transition: 'background 0.15s',
  });

  return (
    <nav
      className="flex items-stretch justify-between"
      style={{
        background: 'linear-gradient(to bottom, var(--kn-primary, #005982) 0%, var(--kn-secondary, #3089ac) 100%)',
        height: 42,
      }}
    >
      <div className="flex items-stretch overflow-x-auto">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} style={linkStyle(item.href)}
            onMouseEnter={e => { if (!pathname.startsWith(item.href)) (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0,0,0,0.15)'; }}
            onMouseLeave={e => { if (!pathname.startsWith(item.href)) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
          >
            {item.label}
          </Link>
        ))}
      </div>
      <div className="flex items-stretch">
        <Link href={`/${locale}/profile`} style={linkStyle(`/${locale}/profile`)}>
          {nickname}
        </Link>
        <form action="/api/auth/logout" method="POST" className="flex items-stretch">
          <button
            type="submit"
            style={{ ...linkStyle('__logout__'), cursor: 'pointer', border: 'none', background: 'transparent' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0,0,0,0.15)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
          >
            {t('logout')}
          </button>
        </form>
      </div>
    </nav>
  );
}
