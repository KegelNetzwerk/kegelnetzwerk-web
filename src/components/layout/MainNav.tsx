'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import {
  Newspaper, CheckSquare, CalendarDays, BarChart2,
  ShieldCheck, LogOut, Building2, User, Menu, X,
} from 'lucide-react';
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
  const [menuOpen, setMenuOpen] = useState(false);

  // Close menu on navigation
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  // Lock body scroll when menu open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const navItems: { href: string; label: string; icon: LucideIcon }[] = [
    { href: `/${locale}/news`,    label: t('news'),        icon: Newspaper    },
    { href: `/${locale}/votes`,   label: t('votes'),       icon: CheckSquare  },
    { href: `/${locale}/events`,  label: t('events'),      icon: CalendarDays },
    { href: `/${locale}/scoring`, label: t('scoring'),     icon: BarChart2    },
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

  const navBg = 'linear-gradient(to bottom, var(--kn-primary, #005982) 0%, var(--kn-secondary, #3089ac) 100%)';

  return (
    <>
      <nav
        className="flex items-stretch justify-between"
        style={{ background: navBg, height: 44 }}
      >
        {/* ── Desktop: main nav items (hidden on mobile) ── */}
        <div className="hidden md:flex items-stretch overflow-x-auto">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} style={linkStyle(href)} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
              <Icon size={14} style={{ opacity: 0.85, flexShrink: 0 }} />
              {label}
            </Link>
          ))}
        </div>

        {/* ── Mobile: hamburger button (hidden on desktop) ── */}
        <button
          className="flex md:hidden items-center gap-2 px-4"
          onClick={() => setMenuOpen(true)}
          style={{ color: 'white', background: 'transparent', border: 'none', cursor: 'pointer', height: '100%' }}
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>

        {/* ── Right side: icons only on mobile, icons + text on desktop ── */}
        <div className="flex items-stretch">
          {/* Club profile */}
          <Link href={`/${locale}/club`} style={linkStyle(`/${locale}/club`)} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
            {hasClubPic ? (
              // eslint-disable-next-line @next/next/no-img-element
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', flexShrink: 0, overflow: 'hidden' }}>
                <img src={clubPic} alt="" style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }} />
              </span>
            ) : (
              <Building2 size={14} style={{ opacity: 0.85, flexShrink: 0 }} />
            )}
            <span className="hidden md:inline">{t('clubProfile')}</span>
          </Link>

          {/* Profile */}
          <Link href={`/${locale}/profile`} style={linkStyle(`/${locale}/profile`)} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
            {hasMemberPic ? (
              // eslint-disable-next-line @next/next/no-img-element
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', flexShrink: 0, overflow: 'hidden' }}>
                <img src={memberPic} alt="" style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }} />
              </span>
            ) : (
              <User size={14} style={{ opacity: 0.85, flexShrink: 0 }} />
            )}
            <span className="hidden md:inline">{nickname}</span>
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
              <span className="hidden md:inline">{t('logout')}</span>
            </button>
          </form>
        </div>
      </nav>

      {/* ── Mobile slide-in drawer ── */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-50 flex md:hidden"
          style={{ background: 'rgba(0,0,0,0.55)' }}
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="flex flex-col h-full"
            style={{ width: 280, background: navBg }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer header */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.15)' }}
            >
              <span style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>KegelNetzwerk</span>
              <button
                onClick={() => setMenuOpen(false)}
                style={{ color: 'rgba(255,255,255,0.8)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                aria-label="Close menu"
              >
                <X size={22} />
              </button>
            </div>

            {/* Nav items */}
            <nav className="flex flex-col flex-1 py-2 overflow-y-auto">
              {navItems.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '15px 20px',
                    color: isActive(href) ? 'white' : 'rgba(255,255,255,0.8)',
                    background: isActive(href) ? 'rgba(0,0,0,0.25)' : 'transparent',
                    textDecoration: 'none',
                    fontSize: 15,
                    fontWeight: isActive(href) ? 700 : 500,
                    borderLeft: isActive(href) ? '3px solid rgba(255,255,255,0.6)' : '3px solid transparent',
                  }}
                >
                  <Icon size={19} />
                  {label}
                </Link>
              ))}
            </nav>

            {/* Drawer footer: club + profile + logout */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingBottom: 8 }}>
              <Link
                href={`/${locale}/club`}
                onClick={() => setMenuOpen(false)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 20px', color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: 14 }}
              >
                {hasClubPic
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={clubPic} alt="" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover' }} />
                  : <Building2 size={19} />}
                {t('clubProfile')}
              </Link>
              <Link
                href={`/${locale}/profile`}
                onClick={() => setMenuOpen(false)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 20px', color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: 14 }}
              >
                {hasMemberPic
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={memberPic} alt="" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover' }} />
                  : <User size={19} />}
                {nickname}
              </Link>
              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 20px', color: 'rgba(255,255,255,0.8)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, width: '100%' }}
                >
                  <LogOut size={19} />
                  {t('logout')}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
