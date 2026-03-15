import Link from 'next/link';
import type { Member, Club } from '@prisma/client';

export default function Header({ member }: { member: (Member & { club: Club }) | null }) {
  const logoSrc =
    member?.club?.header && member.club.header !== 'none'
      ? member.club.header
      : '/images/splash.png';

  return (
    <header
      className="flex items-center justify-center overflow-hidden"
      style={{
        background: 'var(--kn-bg2)',
        height: 120,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
      }}
    >
      <Link href="/">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          alt="KegelNetzwerk"
          style={{ height: 82, objectFit: 'contain' }}
        />
      </Link>
    </header>
  );
}
