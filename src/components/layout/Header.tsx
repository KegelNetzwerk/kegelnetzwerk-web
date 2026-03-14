import Link from 'next/link';
import type { Member, Club } from '@prisma/client';

interface HeaderProps {
  member: (Member & { club: Club }) | null;
}

export default function Header({ member }: HeaderProps) {
  const headerSrc =
    member?.club?.header && member.club.header !== 'none'
      ? member.club.header
      : '/images/splash.png';

  return (
    <header className="kn-header">
      <Link href="/">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={headerSrc}
          alt="KegelNetzwerk"
          className="kn-header-logo"
        />
      </Link>
    </header>
  );
}
