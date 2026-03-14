import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import type { Member, Club } from '@prisma/client';

interface SidebarProps {
  member: (Member & { club: Club }) | null;
  locale: string;
}

export default async function Sidebar({ member, locale }: SidebarProps) {
  const t = await getTranslations('profile');
  if (!member) return null;

  const members = await prisma.member.findMany({
    where: { clubId: member.clubId },
    select: { nickname: true, birthday: true },
  });

  const nextBirthday = getNextBirthday(members, new Date());
  const santaPartner = member.secretSantaPartnerId
    ? await prisma.member.findUnique({
        where: { id: member.secretSantaPartnerId },
        select: { nickname: true },
      })
    : null;

  return (
    <aside
      className="flex flex-col gap-3 p-4 shrink-0"
      style={{
        width: 210,
        background: 'linear-gradient(to bottom, var(--kn-primary, #005982) 0%, #003d5c 100%)',
      }}
    >
      {/* Club logo + name */}
      <Link href={`/${locale}/club`} className="flex flex-col items-center gap-2 no-underline">
        {member.club.pic !== 'none' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={member.club.pic}
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
            {member.club.name.charAt(0).toUpperCase()}
          </div>
        )}
        <span style={{ color: '#ffffff', fontWeight: 700, fontSize: 13, textAlign: 'center' }}>
          {member.club.name}
        </span>
      </Link>

      <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.18)', margin: '4px 0' }} />

      {/* Info widgets */}
      <div className="flex flex-col gap-3">
        <InfoRow label={t('sidebar.members')} value={String(members.length)} />
        {nextBirthday && <InfoRow label={t('sidebar.nextBirthday')} value={nextBirthday} />}
        {santaPartner && <InfoRow label={t('sidebar.secretSantaPartner')} value={santaPartner.nickname} />}
      </div>
    </aside>
  );
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

function getNextBirthday(members: { nickname: string; birthday: Date | null }[], now: Date): string | null {
  const today = now.getMonth() * 100 + now.getDate();
  let closest: { nickname: string; mmdd: number; wrapped: boolean } | null = null;
  for (const m of members) {
    if (!m.birthday) continue;
    const mmdd = m.birthday.getMonth() * 100 + m.birthday.getDate();
    const wrapped = mmdd < today;
    const eff = wrapped ? mmdd + 10000 : mmdd;
    if (!closest || eff < (closest.wrapped ? closest.mmdd + 10000 : closest.mmdd)) {
      closest = { nickname: m.nickname, mmdd, wrapped };
    }
  }
  if (!closest) return null;
  const month = String(Math.floor(closest.mmdd / 100) + 1).padStart(2, '0');
  const day = String(closest.mmdd % 100).padStart(2, '0');
  return `${closest.nickname} (${day}.${month}.)`;
}
