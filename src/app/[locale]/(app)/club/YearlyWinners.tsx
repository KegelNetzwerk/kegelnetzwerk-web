'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Trophy, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface YearRanking {
  nickname: string;
  total: number;
}

interface YearEntry {
  year: number;
  unit: string;
  rankings: YearRanking[];
}

interface YearlyWinnersProps {
  readonly winners: YearEntry[];
  readonly labels: {
    readonly title: string;
    readonly year: string;
    readonly rank1: string;
    readonly rank2: string;
    readonly rank3: string;
    readonly lastPlace: string;
    readonly noData: string;
  };
}

type SortKey = 'year' | 'rank1' | 'rank2' | 'rank3' | 'last';

function fmt(n: number) {
  return Number.parseFloat(n.toFixed(2));
}

function RankCell({ entry, index, unit }: { entry: YearEntry; index: number; unit: string }) {
  const r = entry.rankings[index];
  if (!r) return <td className="px-4 py-2 text-muted-foreground">—</td>;
  return (
    <td className="px-4 py-2">
      <span className="font-medium">{r.nickname}</span>
      <span className="ml-2 text-muted-foreground text-xs font-mono">
        {fmt(r.total)}{unit === 'EURO' ? ' €' : ''}
      </span>
    </td>
  );
}

export default function YearlyWinners({ winners, labels }: YearlyWinnersProps) {
  const [open, setOpen] = useState(true);
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean }>({ key: 'year', asc: false });

  function toggleSort(key: SortKey) {
    setSort((prev) => prev.key === key ? { key, asc: !prev.asc } : { key, asc: false });
  }

  const sorted = [...winners].sort((a, b) => {
    let va: number;
    let vb: number;
    if (sort.key === 'year') { va = a.year; vb = b.year; }
    else if (sort.key === 'rank1') { va = a.rankings[0]?.total ?? -Infinity; vb = b.rankings[0]?.total ?? -Infinity; }
    else if (sort.key === 'rank2') { va = a.rankings[1]?.total ?? -Infinity; vb = b.rankings[1]?.total ?? -Infinity; }
    else if (sort.key === 'rank3') { va = a.rankings[2]?.total ?? -Infinity; vb = b.rankings[2]?.total ?? -Infinity; }
    else { va = a.rankings[a.rankings.length - 1]?.total ?? -Infinity; vb = b.rankings[b.rankings.length - 1]?.total ?? -Infinity; }
    return sort.asc ? va - vb : vb - va;
  });

  const hasRank3 = winners.some((w) => w.rankings.length >= 3);
  const hasLast = winners.some((w) => w.rankings.length > 3);

  function SortIcon({ col }: { col: SortKey }) {
    if (sort.key !== col) return <ArrowUpDown size={11} className="inline ml-1 opacity-40" />;
    return sort.asc ? <ArrowUp size={11} className="inline ml-1" /> : <ArrowDown size={11} className="inline ml-1" />;
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 text-left font-semibold text-lg bg-muted/40 hover:bg-muted/60 transition-colors cursor-pointer"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2">
          <Trophy size={18} />
          {labels.title}
        </div>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {open && (
        <div className="overflow-x-auto">
          {winners.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">{labels.noData}</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th
                    className="px-4 py-2 text-left font-medium cursor-pointer select-none whitespace-nowrap"
                    onClick={() => toggleSort('year')}
                  >
                    {labels.year}<SortIcon col="year" />
                  </th>
                  <th
                    className="px-4 py-2 text-left font-medium cursor-pointer select-none whitespace-nowrap"
                    onClick={() => toggleSort('rank1')}
                  >
                    {labels.rank1}<SortIcon col="rank1" />
                  </th>
                  <th
                    className="px-4 py-2 text-left font-medium cursor-pointer select-none whitespace-nowrap"
                    onClick={() => toggleSort('rank2')}
                  >
                    {labels.rank2}<SortIcon col="rank2" />
                  </th>
                  {hasRank3 && (
                    <th
                      className="px-4 py-2 text-left font-medium cursor-pointer select-none whitespace-nowrap"
                      onClick={() => toggleSort('rank3')}
                    >
                      {labels.rank3}<SortIcon col="rank3" />
                    </th>
                  )}
                  {hasLast && (
                    <th
                      className="px-4 py-2 text-left font-medium cursor-pointer select-none whitespace-nowrap"
                      onClick={() => toggleSort('last')}
                    >
                      {labels.lastPlace}<SortIcon col="last" />
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {sorted.map((w) => (
                  <tr key={w.year} className="border-t hover:bg-muted/50">
                    <td className="px-4 py-2 font-semibold">{w.year}</td>
                    <RankCell entry={w} index={0} unit={w.unit} />
                    <RankCell entry={w} index={1} unit={w.unit} />
                    {hasRank3 && <RankCell entry={w} index={2} unit={w.unit} />}
                    {hasLast && <RankCell entry={w} index={w.rankings.length - 1} unit={w.unit} />}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
