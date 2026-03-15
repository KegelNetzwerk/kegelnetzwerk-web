import Link from 'next/link';
import type { Member, Club } from '@prisma/client';

export default function Header({ member }: { member: (Member & { club: Club }) | null }) {
  const hasCustomHeader = !!(member?.club?.header && member.club.header !== 'none');
  const headerSrc = hasCustomHeader ? member!.club.header : null;

  return (
    <header
      className="overflow-hidden"
      style={{
        background: 'var(--kn-bg2)',
        height: 210,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        position: 'relative',
      }}
    >
      {hasCustomHeader ? (
        /* Custom header image — fills the full header, preserves aspect ratio */
        <Link href="/" style={{ display: 'block', width: '100%', height: '100%' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={headerSrc!}
            alt="Club header"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </Link>
      ) : (
        /* Fallback: centred splash logo */
        <Link href="/" className="flex items-center justify-center" style={{ height: '100%' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/splash.png"
            alt="KegelNetzwerk"
            style={{ height: 110, objectFit: 'contain' }}
          />
        </Link>
      )}
    </header>
  );
}
