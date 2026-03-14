import Link from 'next/link';
import type { Member, Club } from '@prisma/client';

interface HeaderProps {
  member: (Member & { club: Club }) | null;
}

export default function Header({ member }: HeaderProps) {
  const headerSrc = member?.club?.header !== 'none'
    ? member?.club?.header
    : '/images/splash.png';

  return (
    <header className="w-full" style={{ backgroundColor: 'var(--color-primary)' }}>
      <div className="max-w-6xl mx-auto px-4 py-2">
        <Link href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={headerSrc ?? '/images/splash.png'}
            alt="KegelNetzwerk"
            className="h-16 object-contain"
          />
        </Link>
      </div>
    </header>
  );
}
