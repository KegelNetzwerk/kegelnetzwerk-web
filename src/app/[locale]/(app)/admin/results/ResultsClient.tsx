'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Trash2, ChevronDown, ChevronUp, Plus, TriangleAlert, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import PartPicThumb from '@/components/PartPicThumb';
import Modal from '@/components/admin/AdminModal';

interface SessionRow {
  sessionGroup: number;
  date: string;
  categoryNames: string[];
  entryCount: number;
}

interface ResultEntry {
  id: number;
  memberId: number | null;
  guestId: number | null;
  nickname: string;
  isGuest: boolean;
  playerPic: string;
  gopId: number;
  gopName: string;
  partId: number;
  partName: string;
  partPic: string;
  unit: string;
  factor: number;
  bonus: number;
  value: number;
  once: boolean;
  createdAt: string;
}

interface PartInfo {
  id: number;
  name: string;
  unit: string;
  variable: boolean;
  value: number;
  factor: number;
  bonus: number;
  once: boolean;
}

interface CategoryInfo {
  id: number;
  name: string;
  parts: PartInfo[];
}

interface PersonOption {
  id: number;
  nickname: string;
}

interface ResultsClientProps {
  readonly categories: CategoryInfo[];
  readonly members: PersonOption[];
  readonly guests: PersonOption[];
  readonly years: number[];
}

function toLocalDatetimeInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function calcResult(value: number, factor: number, bonus: number, unit: string): string | null {
  if (factor === 1 && bonus === 0) return null;
  const result = value * factor + bonus;
  if (unit === 'POINTS') {
    const pts = Number.isInteger(result) ? String(result) : result.toFixed(2);
    return `= ${pts} Pkt`;
  }
  return `= ${result.toFixed(2)} €`;
}

function computeOnceDuplicates(results: ResultEntry[]): Set<number> {
  const counts = new Map<string, number[]>();
  for (const r of results) {
    if (r.once) {
      const playerKey = r.memberId != null ? `m${r.memberId}` : `g${r.guestId}`;
      const key = `${playerKey}-${r.partId}`;
      if (!counts.has(key)) counts.set(key, []);
      counts.get(key)!.push(r.id);
    }
  }
  const dupes = new Set<number>();
  for (const ids of counts.values()) {
    if (ids.length > 1) ids.forEach((id) => dupes.add(id));
  }
  return dupes;
}

export default function ResultsClient({ categories, members, guests, years }: ResultsClientProps) {
  const t = useTranslations('resultManagement');
  const tCommon = useTranslations('common');

  // ── Session list state ────────────────────────────────────────────────────────
  const [yearFilter, setYearFilter] = useState(years[0] ? String(years[0]) : '');
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // ── Detail view state ─────────────────────────────────────────────────────────
  const [selectedSession, setSelectedSession] = useState<SessionRow | null>(null);
  const [results, setResults] = useState<ResultEntry[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [resultToRemove, setResultToRemove] = useState<ResultEntry | null>(null);

  // ── Filters ───────────────────────────────────────────────────────────────────
  const [filterGopId, setFilterGopId] = useState('');
  const [filterPartId, setFilterPartId] = useState('');
  const [filterSearch, setFilterSearch] = useState('');

  // ── Add-result form ───────────────────────────────────────────────────────────
  const [addOpen, setAddOpen] = useState(false);
  const [playerType, setPlayerType] = useState<'member' | 'guest'>('member');
  const [addPlayerId, setAddPlayerId] = useState('');
  const [addGopId, setAddGopId] = useState('');
  const [addPartId, setAddPartId] = useState('');
  const [addValue, setAddValue] = useState('');
  const [addCount, setAddCount] = useState('1');
  const [addCreatedAt, setAddCreatedAt] = useState('');
  const [adding, setAdding] = useState(false);

  // ── Load sessions ─────────────────────────────────────────────────────────────
  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const params = new URLSearchParams();
      if (yearFilter) {
        params.set('from', `${yearFilter}-01-01`);
        params.set('to', `${yearFilter}-12-31`);
      }
      const res = await fetch(`/api/results/sessions?${params}`);
      if (!res.ok) {
        toast.error(t('error.loadFailed'));
        return;
      }
      setSessions(await res.json());
    } finally {
      setSessionsLoading(false);
    }
  }, [yearFilter, t]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // ── Open session detail ───────────────────────────────────────────────────────
  async function openSession(session: SessionRow) {
    setSelectedSession(session);
    setDetailLoading(true);
    setResults([]);
    setFilterGopId('');
    setFilterPartId('');
    setFilterSearch('');
    setAddOpen(false);
    resetAddForm();
    try {
      const res = await fetch(`/api/results/sessions/${session.sessionGroup}`);
      if (!res.ok) {
        toast.error(t('error.loadFailed'));
        return;
      }
      const data: { date: string; results: ResultEntry[] } = await res.json();
      setResults(data.results);
      setAddCreatedAt(toLocalDatetimeInput(new Date().toISOString()));
    } finally {
      setDetailLoading(false);
    }
  }

  function backToSessions() {
    setSelectedSession(null);
    setResults([]);
    resetAddForm();
    setAddOpen(false);
  }

  // ── Delete entire session ─────────────────────────────────────────────────────
  async function handleDeleteSession(session: SessionRow) {
    if (!confirm(t('deleteConfirm'))) return;
    const res = await fetch(`/api/results/sessions/${session.sessionGroup}`, { method: 'DELETE' });
    if (!res.ok) {
      toast.error(t('error.deleteFailed'));
      return;
    }
    toast.success(t('deleteSuccess'));
    setSessions((prev) => prev.filter((s) => s.sessionGroup !== session.sessionGroup));
    if (selectedSession?.sessionGroup === session.sessionGroup) backToSessions();
  }

  // ── Remove single result ──────────────────────────────────────────────────────
  async function confirmRemove() {
    if (!resultToRemove) return;
    const { id } = resultToRemove;
    setResultToRemove(null);
    const res = await fetch(`/api/results/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      toast.error(t('error.removeFailed'));
      return;
    }
    toast.success(t('removeSuccess'));
    setResults((prev) => prev.filter((r) => r.id !== id));
    setSessions((prev) =>
      prev.map((s) =>
        s.sessionGroup === selectedSession?.sessionGroup
          ? { ...s, entryCount: s.entryCount - 1 }
          : s,
      ),
    );
  }

  // ── Add-result form helpers ───────────────────────────────────────────────────
  function resetAddForm() {
    setPlayerType('member');
    setAddPlayerId('');
    setAddGopId('');
    setAddPartId('');
    setAddValue('');
    setAddCount('1');
    setAddCreatedAt('');
  }

  const selectedCategory = categories.find((c) => String(c.id) === addGopId) ?? null;
  const selectedPart = selectedCategory?.parts.find((p) => String(p.id) === addPartId) ?? null;

  async function handleAddResult() {
    if (!selectedSession || !addPlayerId || !addGopId || !addPartId) {
      toast.error(t('error.invalidValue'));
      return;
    }
    if (selectedPart?.variable && addValue === '') {
      toast.error(t('error.invalidValue'));
      return;
    }
    const count = Math.max(1, Math.floor(Number(addCount) || 1));
    setAdding(true);
    try {
      const body: Record<string, unknown> = {
        sessionGroup: selectedSession.sessionGroup,
        partId: Number(addPartId),
        gopId: Number(addGopId),
      };
      if (playerType === 'member') body.memberId = Number(addPlayerId);
      else body.guestId = Number(addPlayerId);
      if (selectedPart?.variable) body.value = Number.parseFloat(addValue);
      if (addCreatedAt) body.createdAt = new Date(addCreatedAt).toISOString();

      const responses = await Promise.all(
        Array.from({ length: count }, () =>
          fetch('/api/results', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }),
        ),
      );

      if (responses.some((r) => !r.ok)) {
        toast.error(t('error.addFailed'));
        return;
      }

      const created: ResultEntry[] = await Promise.all(responses.map((r) => r.json()));
      toast.success(t('addSuccess'));
      setResults((prev) => [...created, ...prev]);
      setAddCreatedAt(toLocalDatetimeInput(new Date().toISOString()));
      setSessions((prev) =>
        prev.map((s) =>
          s.sessionGroup === selectedSession.sessionGroup
            ? { ...s, entryCount: s.entryCount + count }
            : s,
        ),
      );
    } finally {
      setAdding(false);
    }
  }

  // ── Once-duplicate detection ──────────────────────────────────────────────────
  const onceDuplicateIds = useMemo(() => computeOnceDuplicates(results), [results]);

  // ── Derived filter options ────────────────────────────────────────────────────
  const resultCategories = [
    ...new Map(results.map((r) => [r.gopId, { id: r.gopId, name: r.gopName }])).values(),
  ].sort((a, b) => a.name.localeCompare(b.name));

  const resultParts = [
    ...new Map(
      results
        .filter((r) => !filterGopId || String(r.gopId) === filterGopId)
        .map((r) => [r.partId, { id: r.partId, name: r.partName }]),
    ).values(),
  ].sort((a, b) => a.name.localeCompare(b.name));

  const filteredResults = results.filter((r) => {
    if (filterGopId && String(r.gopId) !== filterGopId) return false;
    if (filterPartId && String(r.partId) !== filterPartId) return false;
    if (filterSearch && !r.nickname.toLowerCase().includes(filterSearch.toLowerCase())) return false;
    return true;
  });

  // ── SESSION LIST VIEW ─────────────────────────────────────────────────────────

  if (!selectedSession) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t('title')}</h1>

        <div className="flex items-center gap-3">
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="h-9 rounded-md border bg-white px-3 text-sm"
          >
            <option value="">{t('allYears')}</option>
            {years.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {sessionsLoading ? (
          <p className="text-sm text-muted-foreground">{tCommon('loading')}</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noSessions')}</p>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => (
              <div
                key={session.sessionGroup}
                className="flex items-center justify-between rounded-lg border bg-white px-4 py-3"
              >
                <div className="flex items-center gap-4 text-sm">
                  <span className="font-medium">
                    {new Date(session.date).toLocaleDateString('de-DE', { timeZone: 'UTC' })}
                  </span>
                  <span className="text-muted-foreground">{session.categoryNames.join(', ')}</span>
                  <span className="text-muted-foreground">
                    {session.entryCount} {t('entries')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openSession(session)}
                    className="cursor-pointer"
                  >
                    {t('manageSession')}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteSession(session)}
                    className="cursor-pointer"
                  >
                    <Trash2 size={13} />
                    {t('deleteSession')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── SESSION DETAIL VIEW ───────────────────────────────────────────────────────

  const tableOrEmpty =
    filteredResults.length === 0 ? (
      <p className="text-sm text-muted-foreground">{t('noResults')}</p>
    ) : (
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted">
              <th className="px-3 py-2 text-left font-medium">{t('player')}</th>
              <th className="px-3 py-2 text-left font-medium">{t('category')}</th>
              <th className="px-3 py-2 text-left font-medium">{t('part')}</th>
              <th className="px-3 py-2 text-left font-medium">{t('value')}</th>
              <th className="px-3 py-2 text-left font-medium">{t('timeEntered')}</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {filteredResults.map((r) => {
              const isDupe = onceDuplicateIds.has(r.id);
              return (
                <tr key={r.id} className="border-t bg-white">
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-2">
                      {r.playerPic && r.playerPic !== 'none' ? (
                        <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border">
                          <Image src={r.playerPic} alt={r.nickname} fill className="object-cover" />
                        </div>
                      ) : (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                          {r.nickname.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span>{r.nickname}</span>
                      {r.isGuest && (
                        <span className="text-xs text-muted-foreground">({t('guestType')})</span>
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-2">{r.gopName}</td>
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-1.5">
                      <PartPicThumb pic={r.partPic} size={20} />
                      <span>{r.partName}</span>
                      {isDupe && (
                        <span title={t('onceWarning')}>
                          <TriangleAlert size={14} className="text-amber-500 shrink-0" />
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-2">{r.value}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {new Date(r.createdAt).toLocaleString('de-DE')}
                  </td>
                  <td className="px-3 py-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setResultToRemove(r)}
                      className="cursor-pointer h-7 w-7 text-destructive hover:text-destructive"
                      title={tCommon('remove')}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={backToSessions} className="cursor-pointer">
          <ArrowLeft size={15} />
          {tCommon('back')}
        </Button>
        <h1 className="text-2xl font-bold">
          {new Date(selectedSession.date).toLocaleDateString('de-DE', { timeZone: 'UTC' })}
          {' — '}
          {selectedSession.categoryNames.join(', ')}
        </h1>
      </div>

      {/* Add result collapsible panel */}
      <div className="rounded-lg border overflow-hidden">
        <button
          type="button"
          onClick={() => setAddOpen((o) => !o)}
          className="cursor-pointer flex items-center justify-between w-full px-4 py-3 bg-white text-sm font-medium"
        >
          <span className="flex items-center gap-2">
            <Plus size={14} />
            {t('addResult')}
          </span>
          {addOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {addOpen && (
          <div className="border-t bg-gray-50 p-4">
            <div className="flex flex-wrap items-end gap-3">
              {/* Member / Guest toggle */}
              <div className="space-y-1">
                <Label>{t('player')}</Label>
                <div className="flex rounded-md border overflow-hidden bg-white text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setPlayerType('member');
                      setAddPlayerId('');
                    }}
                    className={`cursor-pointer px-3 py-1.5 ${playerType === 'member' ? 'bg-gray-200 font-medium' : ''}`}
                  >
                    {t('memberType')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPlayerType('guest');
                      setAddPlayerId('');
                    }}
                    className={`cursor-pointer px-3 py-1.5 ${playerType === 'guest' ? 'bg-gray-200 font-medium' : ''}`}
                  >
                    {t('guestType')}
                  </button>
                </div>
              </div>

              {/* Player select */}
              <div className="space-y-1">
                <Label>{playerType === 'member' ? t('memberType') : t('guestType')}</Label>
                <select
                  value={addPlayerId}
                  onChange={(e) => setAddPlayerId(e.target.value)}
                  className="h-9 rounded-md border bg-white px-3 text-sm"
                >
                  <option value="">{t('selectPlayer')}</option>
                  {(playerType === 'member' ? members : guests).map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.nickname}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category select */}
              <div className="space-y-1">
                <Label>{t('category')}</Label>
                <select
                  value={addGopId}
                  onChange={(e) => {
                    setAddGopId(e.target.value);
                    setAddPartId('');
                  }}
                  className="h-9 rounded-md border bg-white px-3 text-sm"
                >
                  <option value="">{t('selectCategory')}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Part select */}
              <div className="space-y-1">
                <Label>{t('part')}</Label>
                <select
                  value={addPartId}
                  onChange={(e) => setAddPartId(e.target.value)}
                  disabled={!selectedCategory}
                  className="h-9 rounded-md border bg-white px-3 text-sm disabled:opacity-50"
                >
                  <option value="">{t('selectPart')}</option>
                  {(selectedCategory?.parts ?? []).map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Value: input for variable parts, read-only display for fixed parts */}
              {selectedPart && (
                <div className="space-y-1">
                  <Label>{t('value')}</Label>
                  {selectedPart.variable ? (
                    <div>
                      <Input
                        type="number"
                        step="0.01"
                        value={addValue}
                        onChange={(e) => setAddValue(e.target.value)}
                        className="bg-white w-28"
                        placeholder="0"
                      />
                      {addValue !== '' && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {calcResult(
                            Number.parseFloat(addValue),
                            selectedPart.factor,
                            selectedPart.bonus,
                            selectedPart.unit,
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-9 flex items-center text-sm text-muted-foreground">
                      {t('fixedValue')}: {selectedPart.value}
                      {calcResult(
                        selectedPart.value,
                        selectedPart.factor,
                        selectedPart.bonus,
                        selectedPart.unit,
                      ) && (
                        <span className="ml-1">
                          {calcResult(
                            selectedPart.value,
                            selectedPart.factor,
                            selectedPart.bonus,
                            selectedPart.unit,
                          )}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Count */}
              <div className="space-y-1">
                <Label>{t('count')}</Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={addCount}
                  onChange={(e) => setAddCount(e.target.value)}
                  className="bg-white w-20"
                />
              </div>

              {/* Time override */}
              <div className="space-y-1">
                <Label>{t('timeEntered')}</Label>
                <Input
                  type="datetime-local"
                  value={addCreatedAt}
                  onChange={(e) => setAddCreatedAt(e.target.value)}
                  className="bg-white w-52"
                />
              </div>

              <Button
                onClick={handleAddResult}
                disabled={
                  adding ||
                  !addPlayerId ||
                  !addGopId ||
                  !addPartId ||
                  (selectedPart?.variable === true && addValue === '')
                }
                style={{ background: 'var(--kn-primary, #005982)' }}
                className="text-white self-end"
              >
                {adding ? tCommon('loading') : tCommon('add')}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filterGopId}
          onChange={(e) => {
            setFilterGopId(e.target.value);
            setFilterPartId('');
          }}
          className="h-9 rounded-md border bg-white px-3 text-sm"
        >
          <option value="">{t('allCategories')}</option>
          {resultCategories.map((c) => (
            <option key={c.id} value={String(c.id)}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={filterPartId}
          onChange={(e) => setFilterPartId(e.target.value)}
          className="h-9 rounded-md border bg-white px-3 text-sm"
        >
          <option value="">{t('allParts')}</option>
          {resultParts.map((p) => (
            <option key={p.id} value={String(p.id)}>
              {p.name}
            </option>
          ))}
        </select>

        <Input
          value={filterSearch}
          onChange={(e) => setFilterSearch(e.target.value)}
          placeholder={t('filterByPlayer')}
          className="bg-white h-9 w-48"
        />
      </div>

      {/* Results table */}
      {detailLoading ? (
        <p className="text-sm text-muted-foreground">{tCommon('loading')}</p>
      ) : (
        tableOrEmpty
      )}

      {/* Remove result confirmation modal */}
      {resultToRemove && (
        <Modal onClose={() => setResultToRemove(null)} title={t('removeConfirmTitle')}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">{t('removeConfirm')}</p>
            <div className="rounded-lg border bg-gray-50 px-4 py-3 text-sm space-y-2">
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">{t('player')}</span>
                <span className="flex items-center gap-2 font-medium">
                  {resultToRemove.playerPic && resultToRemove.playerPic !== 'none' ? (
                    <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full border">
                      <Image src={resultToRemove.playerPic} alt={resultToRemove.nickname} fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                      {resultToRemove.nickname.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {resultToRemove.nickname}
                  {resultToRemove.isGuest && (
                    <span className="text-xs text-gray-400">({t('guestType')})</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">{t('category')}</span>
                <span className="font-medium">{resultToRemove.gopName}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">{t('part')}</span>
                <span className="flex items-center gap-1.5 font-medium">
                  <PartPicThumb pic={resultToRemove.partPic} size={16} />
                  {resultToRemove.partName}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">{t('value')}</span>
                <span className="font-medium">
                  {resultToRemove.value}
                  {calcResult(resultToRemove.value, resultToRemove.factor, resultToRemove.bonus, resultToRemove.unit) && (
                    <span className="ml-1 text-gray-400">
                      {calcResult(resultToRemove.value, resultToRemove.factor, resultToRemove.bonus, resultToRemove.unit)}
                    </span>
                  )}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">{t('timeEntered')}</span>
                <span className="text-gray-700">{new Date(resultToRemove.createdAt).toLocaleString('de-DE')}</span>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setResultToRemove(null)}>{tCommon('cancel')}</Button>
              <Button variant="destructive" onClick={confirmRemove}>
                <Trash2 size={14} />
                {tCommon('remove')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
