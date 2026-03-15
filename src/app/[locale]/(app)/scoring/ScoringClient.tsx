'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Filter, ChevronDown, ChevronUp } from 'lucide-react';
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
  defaultScoringFilter: string;
}

export default function ScoringClient({ games, defaultScoringFilter }: ScoringClientProps) {
  const t = useTranslations('scoring');
  const searchParams = useSearchParams();
  const router = useRouter();

  const pad = (n: number) => String(n).padStart(2, '0');
  const today = new Date();
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const toDateInput = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  // URL params take priority, then club default, then hardcoded defaults
  const hasUrlParams =
    searchParams.has('from') || searchParams.has('to') ||
    searchParams.has('unit') || searchParams.has('gopId') ||
    searchParams.has('eliLowest') || searchParams.has('eliHighest') ||
    searchParams.has('sortAsc');

  const activeParams = hasUrlParams
    ? searchParams
    : new URLSearchParams(defaultScoringFilter);

  const getParam = (key: string) => activeParams.get(key);

  const rawUnit = getParam('unit');

  const [from, setFrom] = useState(getParam('from') ?? toDateInput(monthAgo));
  const [to, setTo] = useState(getParam('to') ?? toDateInput(today));
  const [unit, setUnit] = useState<'POINTS' | 'EURO'>(
    rawUnit === 'POINTS' || rawUnit === 'EURO' ? rawUnit : 'POINTS'
  );
  const [gopId, setGopId] = useState(getParam('gopId') ?? '');
  const [eliLowest, setEliLowest] = useState(getParam('eliLowest') ?? '0');
  const [eliHighest, setEliHighest] = useState(getParam('eliHighest') ?? '0');
  const [sortAsc, setSortAsc] = useState(getParam('sortAsc') === 'true');
  const [data, setData] = useState<ScoringData | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterOpen, setFilterOpen] = useState(() => {
    try {
      const stored = localStorage.getItem('scoring-filter-open');
      if (stored !== null) return stored === 'true';
    } catch {}
    return !hasUrlParams && !defaultScoringFilter;
  });

  function toggleFilter() {
    setFilterOpen((o) => {
      const next = !o;
      try { localStorage.setItem('scoring-filter-open', String(next)); } catch {}
      return next;
    });
  }

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

  // Auto-fetch on mount when there are URL params or a club default filter
  useEffect(() => {
    if (hasUrlParams || defaultScoringFilter) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function buildParams(overrides: Partial<{ from: string; to: string }> = {}) {
    const params = new URLSearchParams();
    params.set('from', overrides.from ?? from);
    params.set('to', overrides.to ?? to);
    params.set('unit', unit);
    if (gopId) params.set('gopId', gopId);
    params.set('eliLowest', eliLowest);
    params.set('eliHighest', eliHighest);
    params.set('sortAsc', String(sortAsc));
    return params;
  }

  function applyFilter() {
    router.replace(`?${buildParams().toString()}`, { scroll: false });
    try { localStorage.setItem('scoring-filter-open', 'false'); } catch {}
    setFilterOpen(false);
    fetchData();
  }

  function applyYear(year: number) {
    const newFrom = `${year}-01-01`;
    const newTo = `${year}-12-31`;
    setFrom(newFrom);
    setTo(newTo);
    const params = buildParams({ from: newFrom, to: newTo });
    router.replace(`?${params.toString()}`, { scroll: false });
    // Fetch directly with the new dates
    setLoading(true);
    const apiParams = new URLSearchParams({
      from: new Date(newFrom).toISOString(),
      to: new Date(newTo + 'T23:59:59').toISOString(),
      unit,
      eliLowest,
      eliHighest,
      sort: sortAsc ? 'asc' : 'desc',
      ...(gopId ? { gopId } : {}),
    });
    fetch(`/api/scoring?${apiParams}`).then(async (res) => {
      if (res.ok) setData(await res.json());
      setLoading(false);
    });
  }

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

  const currentYear = today.getFullYear();
  const yearButtons = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      {/* Filter bar */}
      <div className="border rounded-lg bg-gray-50">
        {/* Header row — always visible */}
        <button
          type="button"
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold"
          onClick={toggleFilter}
        >
          <div className="flex items-center gap-2">
            <Filter size={14} />
            {t('filter')}
          </div>
          {filterOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>

        {/* Year quickfilters — always visible */}
        <div className="flex items-center gap-2 flex-wrap px-4 pb-3">
          <span className="text-xs text-gray-500">{t('quickYear')}:</span>
          {yearButtons.map((year) => (
            <Button
              key={year}
              type="button"
              size="sm"
              variant={from === `${year}-01-01` && to === `${year}-12-31` ? 'default' : 'outline'}
              onClick={() => applyYear(year)}
              style={from === `${year}-01-01` && to === `${year}-12-31` ? { background: 'var(--kn-primary, #005982)' } : {}}
              disabled={loading}
            >
              {year}
            </Button>
          ))}
        </div>

        {/* Collapsible body */}
        {filterOpen && (
        <div className="px-4 pb-4 space-y-4 border-t pt-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">{t('from')}</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="bg-white" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('to')}</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="bg-white" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('unit')}</Label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as 'POINTS' | 'EURO')}
              className="w-full border rounded px-3 py-2 text-sm bg-white"
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
              className="w-full border rounded px-3 py-2 text-sm bg-white"
            >
              <option value="">{t('all')}</option>
              {games.map((g) => (
                <option key={g.id} value={String(g.id)}>{g.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('eliminateLowest')}</Label>
            <Input type="number" min="0" value={eliLowest} onChange={(e) => setEliLowest(e.target.value)} className="bg-white" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('eliminateHighest')}</Label>
            <Input type="number" min="0" value={eliHighest} onChange={(e) => setEliHighest(e.target.value)} className="bg-white" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('sortOrder')}</Label>
            <select
              value={sortAsc ? 'asc' : 'desc'}
              onChange={(e) => setSortAsc(e.target.value === 'asc')}
              className="w-full border rounded px-3 py-2 text-sm bg-white"
            >
              <option value="desc">{t('sortDesc')}</option>
              <option value="asc">{t('sortAsc')}</option>
            </select>
          </div>
        </div>
          <Button onClick={applyFilter} disabled={loading} style={{ background: 'var(--kn-primary, #005982)' }} className="text-white">
            <Filter size={15} />
            {loading ? '...' : t('applyFilter')}
          </Button>
        </div>
        )}
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
