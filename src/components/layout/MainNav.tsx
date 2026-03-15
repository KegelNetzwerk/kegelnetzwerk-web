'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Newspaper, CheckSquare, CalendarDays, BarChart2, BookUser, ShieldCheck, LogOut, Building2, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface MainNavProps {
  isAdmin: boolean;
  locale: string;
  nickname: string;
  memberPic: string;
  clubPic: string;
}

export default function MainNav({ isAdmin, locale, nickname, memberPic, clubPic }: MainNavProps) {
  const t = useTranslations('nav');
  const pathname = usePathname();

  const navItems: { href: string; label: string; icon: LucideIcon }[] = [
    { href: `/${locale}/news`,    label: t('news'),        icon: Newspaper    },
    { href: `/${locale}/votes`,   label: t('votes'),       icon: CheckSquare  },
    { href: `/${locale}/events`,  label: t('events'),      icon: CalendarDays },
    { href: `/${locale}/scoring`, label: t('scoring'),     icon: BarChart2    },
    { href: `/${locale}/contact`, label: t('contactList'), icon: BookUser     },
    ...(isAdmin ? [{ href: `/${locale}/admin`, label: t('admin'), icon: ShieldCheck }] : []),
  ];

  const isActive = (href: string) => pathname.startsWith(href);

  const linkStyle = (href: string): React.CSSProperties => ({
    color: isActive(href) ? '#ffffff' : 'rgba(255,255,255,0.78)',
    backgroundColor: isActive(href) ? 'rgba(0,0,0,0.22)' : 'transparent',
    padding: '0 10px',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 13,
    fontWeight: 600,
    textDecoration: 'none',
    whiteSpace: 'nowrap' as const,
    transition: 'background 0.15s',
  });

  const hoverOn  = (e: React.MouseEvent) => { if (!isActive((e.currentTarget as HTMLElement).getAttribute('href') ?? '')) (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0,0,0,0.15)'; };
  const hoverOff = (e: React.MouseEvent) => { if (!isActive((e.currentTarget as HTMLElement).getAttribute('href') ?? '')) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; };

  const hasClubPic   = clubPic   && clubPic   !== 'none';
  const hasMemberPic = memberPic && memberPic !== 'none';

  return (
    <nav
      className="flex items-stretch justify-between"
      style={{
        background: 'linear-gradient(to bottom, var(--kn-primary, #005982) 0%, var(--kn-secondary, #3089ac) 100%)',
        height: 44,
      }}
    >
      {/* Left: main nav items */}
      <div className="flex items-stretch overflow-x-auto">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} style={linkStyle(href)} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
            <Icon size={14} style={{ opacity: 0.85, flexShrink: 0 }} />
            {label}
          </Link>
        ))}
      </div>

      {/* Right: club profile | profile | logout */}
      <div className="flex items-stretch">
        {/* Club profile */}
        <Link href={`/${locale}/club`} style={linkStyle(`/${locale}/club`)} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
          {hasClubPic ? (
            // eslint-disable-next-line @next/next/no-img-element
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: '50%', background: 'var(--kn-primary, #3089ac)', flexShrink: 0, overflow: 'hidden' }}>
              <img src={clubPic} alt="" style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }} />
            </span>
          ) : (
            <Building2 size={14} style={{ opacity: 0.85, flexShrink: 0 }} />
          )}
          {t('clubProfile')}
        </Link>

        {/* Profile */}
        <Link href={`/${locale}/profile`} style={linkStyle(`/${locale}/profile`)} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
          {hasMemberPic ? (
            // eslint-disable-next-line @next/next/no-img-element
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: '50%', background: 'var(--kn-primary, #3089ac)', flexShrink: 0, overflow: 'hidden' }}>
              <img src={memberPic} alt="" style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }} />
            </span>
          ) : (
            <User size={14} style={{ opacity: 0.85, flexShrink: 0 }} />
          )}
          {nickname}
        </Link>

        {/* Logout */}
        <form action="/api/auth/logout" method="POST" className="flex items-stretch">
          <button
            type="submit"
            style={{ ...linkStyle('__logout__'), cursor: 'pointer', border: 'none', background: 'transparent' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0,0,0,0.15)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
          >
            <LogOut size={14} style={{ opacity: 0.85, flexShrink: 0 }} />
            {t('logout')}
          </button>
        </form>
      </div>
    </nav>
  );
}
