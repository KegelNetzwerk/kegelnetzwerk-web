'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const ScoreChart = dynamic(() => import('./ScoreChart'), { ssr: false });

interface GameOption {
  id: number;
  name: string;
}

interface SessionData {
  sessionGroup: number;
  date: string;
}

interface MemberScore {
  id: number;
  nickname: string;
  total: number;
  rawTotal: number;
  sessions: { sessionGroup: number; value: number }[];
}

interface PartBreakdown {
  id: number;
  name: string;
  unit: string;
  members: { nickname: string; total: number }[];
}

interface ScoringData {
  members: MemberScore[];
  sessions: SessionData[];
  partsBreakdown: PartBreakdown[];
  unit: string;
}

interface ScoringClientProps {
  games: GameOption[];
}

export default function ScoringClient({ games }: ScoringClientProps) {
  const t = useTranslations('scoring');

  const pad = (n: number) => String(n).padStart(2, '0');
  const today = new Date();
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const toDateInput = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const [from, setFrom] = useState(toDateInput(monthAgo));
  const [to, setTo] = useState(toDateInput(today));
  const [unit, setUnit] = useState<'POINTS' | 'EURO'>('POINTS');
  const [gopId, setGopId] = useState('');
  const [eliLowest, setEliLowest] = useState('0');
  const [eliHighest, setEliHighest] = useState('0');
  const [sortAsc, setSortAsc] = useState(false);
  const [data, setData] = useState<ScoringData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      from: new Date(from).toISOString(),
      to: new Date(to + 'T23:59:59').toISOString(),
      unit,
      eliLowest,
      eliHighest,
      sort: sortAsc ? 'asc' : 'desc',
      ...(gopId ? { gopId } : {}),
    });
    const res = await fetch(`/api/scoring?${params}`);
    if (res.ok) {
      setData(await res.json());
    }
    setLoading(false);
  }, [from, to, unit, gopId, eliLowest, eliHighest, sortAsc]);

  // Build chart data
  const chartData: { date: string; [nickname: string]: number | string }[] = data
    ? data.sessions.map((s) => {
        const point: { date: string; [nickname: string]: number | string } = {
          date: new Date(s.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
        };
        for (const m of data.members) {
          const session = m.sessions.find((ms) => ms.sessionGroup === s.sessionGroup);
          point[m.nickname] = session?.value ?? 0;
        }
        return point;
      })
    : [];

  const unitLabel = unit === 'EURO' ? '€' : t('unitPoints');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      {/* Filter bar */}
      <div className="border rounded-lg p-4 space-y-4 bg-gray-50">
        <h2 className="font-semibold text-sm">{t('filter')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">{t('from')}</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('to')}</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('unit')}</Label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as 'POINTS' | 'EURO')}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="POINTS">{t('unitPoints')}</option>
              <option value="EURO">{t('unitEuro')}</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('gameOrPenalty')}</Label>
            <select
              value={gopId}
              onChange={(e) => setGopId(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="">{t('all')}</option>
              {games.map((g) => (
                <option key={g.id} value={String(g.id)}>{g.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('eliminateLowest')}</Label>
            <Input type="number" min="0" value={eliLowest} onChange={(e) => setEliLowest(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('eliminateHighest')}</Label>
            <Input type="number" min="0" value={eliHighest} onChange={(e) => setEliHighest(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('sortOrder')}</Label>
            <select
              value={sortAsc ? 'asc' : 'desc'}
              onChange={(e) => setSortAsc(e.target.value === 'asc')}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="desc">{t('sortDesc')}</option>
              <option value="asc">{t('sortAsc')}</option>
            </select>
          </div>
        </div>
        <Button onClick={fetchData} disabled={loading}>
          {loading ? '...' : t('applyFilter')}
        </Button>
      </div>

      {data && (
        <>
          {/* Summary table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
                  <th className="px-3 py-2 text-left">{t('name')}</th>
                  {data.sessions.map((s) => (
                    <th key={s.sessionGroup} className="px-2 py-2 text-center text-xs">
                      {new Date(s.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right">{t('total')}</th>
                </tr>
              </thead>
              <tbody>
                {data.members.map((m, i) => (
                  <tr key={m.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-3 py-2 font-medium">{m.nickname}</td>
                    {data.sessions.map((s) => {
                      const session = m.sessions.find((ms) => ms.sessionGroup === s.sessionGroup);
                      return (
                        <td key={s.sessionGroup} className="px-2 py-2 text-center text-xs">
                          {session ? `${session.value.toFixed(2)}${unit === 'EURO' ? '€' : ''}` : ''}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-right font-bold">
                      {m.total.toFixed(2)} {unitLabel}
                      {(parseInt(eliLowest) > 0 || parseInt(eliHighest) > 0) && m.rawTotal !== m.total && (
                        <span className="text-xs text-gray-400 ml-1">({m.rawTotal.toFixed(2)})</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Chart */}
          {data.members.length > 0 && data.sessions.length > 1 && (
            <div>
              <h2 className="font-semibold mb-2">{t('chartTitle')} ({unitLabel})</h2>
              <ScoreChart data={chartData} members={data.members.map((m) => m.nickname)} />
            </div>
          )}

          {/* Parts breakdown */}
          {data.partsBreakdown.length > 0 && (
            <div>
              <h2 className="font-semibold mb-3">{t('partsBreakdown')}</h2>
              <div className="flex gap-4 flex-wrap">
                {data.partsBreakdown.map((part) => (
                  <div key={part.id} className="border rounded overflow-hidden min-w-[150px]">
                    <div className="px-3 py-2 text-sm font-semibold text-white" style={{ backgroundColor: 'var(--color-primary)' }}>
                      {part.name}
                    </div>
                    <table className="text-sm">
                      <tbody>
                        {part.members.map((m) => (
                          <tr key={m.nickname} className="border-t">
                            <td className="px-3 py-1">{m.nickname}</td>
                            <td className="px-3 py-1 text-right font-mono">
                              {m.total.toFixed(2)}{part.unit === 'EURO' ? '€' : ''}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
