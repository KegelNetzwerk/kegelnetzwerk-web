'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ContactMember {
  id: number;
  nickname: string;
  email: string;
  phone: string;
}

interface ContactListProps {
  members: ContactMember[];
  title: string;
  nicknameLabel: string;
  emailLabel: string;
  phoneLabel: string;
}

export default function ContactList({ members, title, nicknameLabel, emailLabel, phoneLabel }: ContactListProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 text-left font-semibold text-lg bg-muted/40 hover:bg-muted/60 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        {title}
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {open && (
        <div className="overflow-x-auto">
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
                        {m.phone}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
