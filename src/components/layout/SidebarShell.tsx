'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SidebarShellProps {
  locale: string;
  clubName: string;
  clubPic: string;
  memberCount: number;
  nextBirthday: string | null;
  santaPartner: string | null;
  labelMembers: string;
  labelBirthday: string;
  labelSanta: string;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </span>
      <span style={{ color: 'rgba(255,255,255,0.88)', fontSize: 12 }}>{value}</span>
    </div>
  );
}

export default function SidebarShell({
  locale,
  clubName,
  clubPic,
  memberCount,
  nextBirthday,
  santaPartner,
  labelMembers,
  labelBirthday,
  labelSanta,
}: SidebarShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className="shrink-0 flex flex-col"
      style={{
        width: collapsed ? 36 : 220,
        minWidth: collapsed ? 36 : 220,
        background: 'linear-gradient(to bottom, var(--kn-primary, #005982) 0%, #003d5c 100%)',
        transition: 'width 0.2s ease, min-width 0.2s ease',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Toggle button */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        style={{
          position: 'absolute',
          top: 8,
          right: 6,
          zIndex: 10,
          background: 'rgba(255,255,255,0.12)',
          border: 'none',
          borderRadius: 4,
          color: 'rgba(255,255,255,0.7)',
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
          {/* Club logo + name */}
          <Link href={`/${locale}/club`} className="flex flex-col items-center gap-2 no-underline">
            {clubPic !== 'none' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={clubPic}
                alt="Club logo"
                style={{ width: 100, height: 100, objectFit: 'contain', borderRadius: 8, background: 'rgba(255,255,255,0.1)' }}
              />
            ) : (
              <div style={{
                width: 100, height: 100, borderRadius: 8,
                background: 'rgba(255,255,255,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(255,255,255,0.45)', fontSize: 32, fontWeight: 700,
              }}>
                {clubName.charAt(0).toUpperCase()}
              </div>
            )}
            <span style={{ color: '#ffffff', fontWeight: 700, fontSize: 13, textAlign: 'center' }}>
              {clubName}
            </span>
          </Link>

          <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.18)', margin: '4px 0' }} />

          {/* Info widgets */}
          <div className="flex flex-col gap-3">
            <InfoRow label={labelMembers} value={String(memberCount)} />
            {nextBirthday && <InfoRow label={labelBirthday} value={nextBirthday} />}
            {santaPartner && <InfoRow label={labelSanta} value={santaPartner} />}
          </div>
        </div>
      )}
    </aside>
  );
}
