'use client';

import CollapsibleSection from '@/components/CollapsibleSection';

interface KncEntry {
  id: number;
  nickname: string;
  kncBalance: number;
}

interface KncLeaderboardProps {
  readonly entries: KncEntry[];
  readonly title: string;
  readonly memberLabel: string;
  readonly balanceLabel: string;
}

export default function KncLeaderboard({ entries, title, memberLabel, balanceLabel }: KncLeaderboardProps) {
  return (
    <CollapsibleSection title={title}>
      <table className="w-full text-sm">
        <thead className="bg-muted">
          <tr>
            <th className="px-4 py-2 text-left font-medium">#</th>
            <th className="px-4 py-2 text-left font-medium">{memberLabel}</th>
            <th className="px-4 py-2 text-right font-medium">{balanceLabel}</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((m, idx) => (
            <tr key={m.id} className="border-t hover:bg-muted/50">
              <td className="px-4 py-2 text-muted-foreground tabular-nums">{idx + 1}</td>
              <td className="px-4 py-2 font-medium">{m.nickname}</td>
              <td className="px-4 py-2 text-right tabular-nums font-semibold text-amber-700">
                {m.kncBalance.toFixed(0)} KNC
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </CollapsibleSection>
  );
}
