'use client';

import CollapsibleSection from '@/components/CollapsibleSection';
import { formatPhone } from '@/lib/format';

interface ContactMember {
  id: number;
  nickname: string;
  email: string;
  phone: string;
}

interface ContactListProps {
  readonly members: ContactMember[];
  readonly title: string;
  readonly nicknameLabel: string;
  readonly emailLabel: string;
  readonly phoneLabel: string;
}

export default function ContactList({ members, title, nicknameLabel, emailLabel, phoneLabel }: ContactListProps) {
  return (
    <CollapsibleSection title={title}>
      <table className="w-full text-sm">
        <thead className="bg-muted">
          <tr>
            <th className="px-4 py-2 text-left font-medium">{nicknameLabel}</th>
            <th className="px-4 py-2 text-left font-medium">{emailLabel}</th>
            <th className="px-4 py-2 text-left font-medium">{phoneLabel}</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id} className="border-t hover:bg-muted/50">
              <td className="px-4 py-2 font-medium">{m.nickname}</td>
              <td className="px-4 py-2">
                {m.email ? (
                  <a href={`mailto:${m.email}`} className="text-[var(--color-primary)] hover:underline">
                    {m.email}
                  </a>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-4 py-2">
                {m.phone ? (
                  <a href={`tel:${m.phone}`} className="text-[var(--color-primary)] hover:underline">
                    {formatPhone(m.phone)}
                  </a>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </CollapsibleSection>
  );
}
