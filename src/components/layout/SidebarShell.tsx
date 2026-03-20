'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const COOKIE_NAME = 'kn-sidebar-collapsed';

interface SidebarShellProps {
  initialCollapsed: boolean;
  locale: string;
  clubName: string;
  clubPic: string;
  memberCount: number;
  nextBirthday: string | null;
  santaPartner: string | null;
  latestNewsId: number | null;
  latestNews: string | null;
  nextEventId: number | null;
  nextEvent: string | null;
  openVotes: { id: number; title: string }[];
  labelMembers: string;
  labelBirthday: string;
  labelSanta: string;
  labelLatestNews: string;
  labelNextEvent: string;
  labelOpenVotes: string;
}

const sep = <hr style={{ border: 'none', borderTop: '1px solid rgba(0,0,0,0.1)', margin: '4px 0' }} />;

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span style={{ color: 'rgba(0,0,0,0.45)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </span>
      <span style={{ color: 'rgba(0,0,0,0.8)', fontSize: 12 }} className="group-hover:underline">{value}</span>
    </div>
  );
}

export default function SidebarShell({
  initialCollapsed,
  locale,
  clubName,
  clubPic,
  memberCount,
  nextBirthday,
  santaPartner,
  latestNewsId,
  latestNews,
  nextEventId,
  nextEvent,
  openVotes,
  labelMembers,
  labelBirthday,
  labelSanta,
  labelLatestNews,
  labelNextEvent,
  labelOpenVotes,
}: SidebarShellProps) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${COOKIE_NAME}=${next}; path=/; max-age=31536000; SameSite=Lax`;
  }

  return (
    <aside
      className="shrink-0 flex-col hidden md:flex"
      style={{
        width: collapsed ? 36 : 220,
        minWidth: collapsed ? 36 : 220,
        background: '#f0f0f0',
        transition: 'width 0.2s ease, min-width 0.2s ease',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Toggle button */}
      <button
        onClick={toggle}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        style={{
          position: 'absolute',
          top: 8,
          right: 6,
          zIndex: 10,
          background: 'rgba(0,0,0,0.08)',
          border: 'none',
          borderRadius: 4,
          color: 'rgba(0,0,0,0.45)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 22,
          height: 22,
          padding: 0,
        }}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Sidebar content — hidden when collapsed */}
      {!collapsed && (
        <div className="flex flex-col gap-3 p-4 pt-10">
          {/* Club logo */}
          <Link href={`/${locale}/club`} className="flex flex-col items-center gap-2 no-underline">
            {clubPic !== 'none' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={clubPic}
                alt="Club logo"
                style={{ width: 100, height: 100, objectFit: 'contain', borderRadius: 8 }}
              />
            ) : (
              <div style={{
                width: 100, height: 100, borderRadius: 8,
                background: 'rgba(0,0,0,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(0,0,0,0.3)', fontSize: 32, fontWeight: 700,
              }}>
                {clubName.charAt(0).toUpperCase()}
              </div>
            )}
          </Link>

          {sep}

          <span style={{ color: 'rgba(0,0,0,0.8)', fontWeight: 700, fontSize: 13, textAlign: 'center' }}>
            {clubName}
          </span>

          {/* Club info */}
          <div className="flex flex-col gap-3">
            <InfoRow label={labelMembers} value={String(memberCount)} />

            {nextBirthday && <InfoRow label={labelBirthday} value={nextBirthday} />}
            {santaPartner && <InfoRow label={labelSanta} value={santaPartner} />}
          </div>

          {sep}

          {/* Activity summary */}
          <div className="flex flex-col gap-3">
            {latestNews && (
              latestNewsId ? (
                <Link href={`/${locale}/news/${latestNewsId}`} className="no-underline group">
                  <InfoRow label={labelLatestNews} value={latestNews} />
                </Link>
              ) : (
                <InfoRow label={labelLatestNews} value={latestNews} />
              )
            )}
            {nextEvent && (
              nextEventId ? (
                <Link href={`/${locale}/events/${nextEventId}`} className="no-underline group">
                  <InfoRow label={labelNextEvent} value={nextEvent} />
                </Link>
              ) : (
                <InfoRow label={labelNextEvent} value={nextEvent} />
              )
            )}
            {openVotes.length > 0 && (
              <div className="flex flex-col gap-0.5">
                <span style={{ color: 'rgba(0,0,0,0.45)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {labelOpenVotes}
                </span>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {openVotes.map((vote) => (
                    <li key={vote.id} style={{ fontSize: 12, paddingLeft: 8, borderLeft: '2px solid rgba(0,0,0,0.15)' }}>
                      <Link href={`/${locale}/votes/${vote.id}`} style={{ color: 'rgba(0,0,0,0.8)', textDecoration: 'none' }} className="hover:underline">
                        {vote.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {sep}
        </div>
      )}
    </aside>
  );
}
