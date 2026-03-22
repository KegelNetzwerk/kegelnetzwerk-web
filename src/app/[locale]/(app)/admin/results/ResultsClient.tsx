'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Pencil, Trash2, Save, X, ChevronDown, ChevronUp, Plus, Minus } from 'lucide-react';

interface GameOption {
  id: number;
  name: string;
}

interface MemberOption {
  id: number;
  nickname: string;
}

interface SessionRow {
  sessionGroup: number;
  date: string;
  gopId: number;
  gopName: string;
  entryCount: number;
}

interface ResultRow {
  resultId: number;
  memberId: number;
  nickname: string;
  partId: number;
  partName: string;
  unit: string;
  value: number;
}

interface PartOption {
  id: number;
  name: string;
  unit: string;
}

interface SessionDetail {
  date: string;
  gopId: number;
  gopName: string;
  parts: PartOption[];
  rows: ResultRow[];
}

interface ResultsClientProps {
  games: GameOption[];
  members: MemberOption[];
  years: number[];
}

export default function ResultsClient({ games, members, years }: ResultsClientProps) {
  const t = useTranslations('resultManagement');
  const tCommon = useTranslations('common');

  const [gopFilter, setGopFilter] = useState('');
  const [yearFilter, setYearFilter] = useState(years[0] ? String(years[0]) : '');

  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Composite key `${sessionGroup}_${gopId}` so two sessions sharing the same
  // sessionGroup but belonging to different games don't both expand at once.
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [editValues, setEditValues] = useState<Record<number, string>>({});
  // resultIds marked for deletion (not yet saved)
  const [pendingDeletes, setPendingDeletes] = useState<Set<number>>(new Set());
  // new cells to create: key = `${memberId}-${partId}`, value = input string
  const [pendingAdds, setPendingAdds] = useState<Record<string, string>>({});
  const [showAllMembers, setShowAllMembers] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (gopFilter) params.set('gopId', gopFilter);
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
      setLoading(false);
    }
  }, [gopFilter, yearFilter, t]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  function sessionKey(sg: number, gopId: number) {
    return `${sg}_${gopId}`;
  }

  function resetEditorState() {
    setDetail(null);
    setEditDate('');
    setEditValues({});
    setPendingDeletes(new Set());
    setPendingAdds({});
    setShowAllMembers(false);
  }

  async function expandSession(sg: number, gopId: number) {
    const key = sessionKey(sg, gopId);
    if (expandedKey === key) {
      setExpandedKey(null);
      resetEditorState();
      return;
    }
    setExpandedKey(key);
    setDetailLoading(true);
    resetEditorState();
    try {
      const res = await fetch(`/api/results/sessions/${sg}?gopId=${gopId}`);
      if (!res.ok) {
        toast.error(t('error.loadFailed'));
        return;
      }
      const data: SessionDetail = await res.json();
      setDetail(data);
      // Use UTC date to avoid timezone-related off-by-one-day issues
      setEditDate(new Date(data.date).toISOString().split('T')[0]);
      setEditValues(Object.fromEntries(data.rows.map((r) => [r.resultId, String(r.value)])));
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleSave(sg: number, gopId: number) {
    if (expandedKey === null || !detail) return;

    // Validate updated values (skip pending-deleted ones)
    const updatedResults = detail.rows
      .filter((r) => !pendingDeletes.has(r.resultId))
      .map((r) => ({ resultId: r.resultId, value: parseFloat(editValues[r.resultId] ?? String(r.value)) }));

    if (updatedResults.some((r) => isNaN(r.value))) {
      toast.error(t('error.invalidValue'));
      return;
    }

    // Validate pending adds
    const creates = Object.entries(pendingAdds).map(([key, val]) => {
      const [memberId, partId] = key.split('-').map(Number);
      return { memberId, partId, value: parseFloat(val) };
    });

    if (creates.some((c) => isNaN(c.value))) {
      toast.error(t('error.invalidValue'));
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/results/sessions/${sg}?gopId=${gopId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: editDate,
          results: updatedResults,
          create: creates,
          delete: [...pendingDeletes],
        }),
      });
      if (!res.ok) {
        toast.error(t('error.saveFailed'));
        return;
      }
      toast.success(t('saveSuccess'));
      setExpandedKey(null);
      resetEditorState();
      loadSessions();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(sg: number, gopId: number) {
    if (!confirm(t('deleteConfirm'))) return;
    const res = await fetch(`/api/results/sessions/${sg}?gopId=${gopId}`, { method: 'DELETE' });
    if (!res.ok) {
      toast.error(t('error.deleteFailed'));
      return;
    }
    toast.success(t('deleteSuccess'));
    if (expandedKey === sessionKey(sg, gopId)) {
      setExpandedKey(null);
      resetEditorState();
    }
    setSessions((prev) => prev.filter((s) => s.sessionGroup !== sg || s.gopId !== gopId));
  }

  // ── Grid helpers ─────────────────────────────────────────────────────────────

  const cellMap = detail
    ? new Map(detail.rows.map((r) => [`${r.memberId}-${r.partId}`, r]))
    : new Map<string, ResultRow>();

  // Members who still have at least one non-deleted result or a pending add
  const membersWithData: MemberOption[] = detail
    ? members.filter((m) => {
        const hasExisting = detail.rows.some(
          (r) => r.memberId === m.id && !pendingDeletes.has(r.resultId),
        );
        const hasPending = Object.keys(pendingAdds).some(
          (k) => k.startsWith(`${m.id}-`),
        );
        return hasExisting || hasPending;
      })
    : [];

  const displayedMembers = showAllMembers ? members : membersWithData;
  const parts: PartOption[] = detail?.parts ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={gopFilter}
          onChange={(e) => {
            setGopFilter(e.target.value);
            setExpandedKey(null);
            resetEditorState();
          }}
          className="h-9 rounded-md border bg-white px-3 text-sm"
        >
          <option value="">{t('allGames')}</option>
          {games.map((g) => (
            <option key={g.id} value={String(g.id)}>
              {g.name}
            </option>
          ))}
        </select>

        <select
          value={yearFilter}
          onChange={(e) => {
            setYearFilter(e.target.value);
            setExpandedKey(null);
            resetEditorState();
          }}
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

      {/* Sessions list */}
      {loading ? (
        <p className="text-sm text-muted-foreground">{tCommon('loading')}</p>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('noSessions')}</p>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => {
            const key = sessionKey(session.sessionGroup, session.gopId);
            const isExpanded = expandedKey === key;
            return (
              <div key={key} className="rounded-lg border overflow-hidden">
                {/* Session header row */}
                <div className="flex items-center justify-between px-4 py-3 bg-white">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="font-medium">
                      {new Date(session.date).toLocaleDateString('de-DE', { timeZone: 'UTC' })}
                    </span>
                    <span className="text-muted-foreground">{session.gopName}</span>
                    <span className="text-muted-foreground">
                      {session.entryCount} {t('entries')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => expandSession(session.sessionGroup, session.gopId)}
                      className="cursor-pointer"
                    >
                      <Pencil size={13} />
                      {t('editSession')}
                      {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(session.sessionGroup, session.gopId)}
                      className="cursor-pointer"
                    >
                      <Trash2 size={13} />
                      {t('deleteSession')}
                    </Button>
                  </div>
                </div>

                {/* Inline expanded editor */}
                {isExpanded && (
                  <div className="border-t bg-gray-50 p-4 space-y-4">
                    {detailLoading ? (
                      <p className="text-sm text-muted-foreground">{tCommon('loading')}</p>
                    ) : detail ? (
                      <>
                        {/* Date + game + show-all-members toggle */}
                        <div className="flex items-center gap-4 flex-wrap">
                          <div className="flex items-center gap-2">
                            <Label>{t('date')}</Label>
                            <Input
                              type="date"
                              value={editDate}
                              onChange={(e) => setEditDate(e.target.value)}
                              className="bg-white w-auto"
                            />
                          </div>
                          <span className="text-sm font-medium">{detail.gopName}</span>
                          <label className="flex items-center gap-2 text-sm cursor-pointer ml-auto">
                            <input
                              type="checkbox"
                              checked={showAllMembers}
                              onChange={(e) => setShowAllMembers(e.target.checked)}
                              className="rounded"
                            />
                            {t('showAllMembers')}
                          </label>
                        </div>

                        {/* Edit grid */}
                        <div className="overflow-x-auto rounded-lg border">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-muted">
                                <th className="px-3 py-2 text-left font-medium">{t('player')}</th>
                                {parts.map((p) => (
                                  <th key={p.id} className="px-3 py-2 text-left font-medium">
                                    {p.name}{' '}
                                    <span className="font-normal text-muted-foreground">
                                      ({p.unit === 'POINTS' ? 'Pkt' : '€'})
                                    </span>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {displayedMembers.map((m) => (
                                <tr key={m.id} className="border-t bg-white">
                                  <td className="px-3 py-2 font-medium">{m.nickname}</td>
                                  {parts.map((p) => {
                                    const cell = cellMap.get(`${m.id}-${p.id}`);
                                    const isDeleted = cell ? pendingDeletes.has(cell.resultId) : false;
                                    const addKey = `${m.id}-${p.id}`;
                                    const pendingVal = pendingAdds[addKey];

                                    if (cell && !isDeleted) {
                                      // Existing result — show editable input + delete button
                                      return (
                                        <td key={p.id} className="px-3 py-2">
                                          <div className="flex items-center gap-1">
                                            <Input
                                              type="number"
                                              step="0.01"
                                              value={editValues[cell.resultId] ?? String(cell.value)}
                                              onChange={(e) =>
                                                setEditValues((prev) => ({
                                                  ...prev,
                                                  [cell.resultId]: e.target.value,
                                                }))
                                              }
                                              className="bg-white w-24"
                                            />
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              onClick={() =>
                                                setPendingDeletes((prev) => new Set([...prev, cell.resultId]))
                                              }
                                              className="cursor-pointer h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                                              title={t('removeValue')}
                                            >
                                              <Minus size={13} />
                                            </Button>
                                          </div>
                                        </td>
                                      );
                                    }

                                    if (cell && isDeleted) {
                                      // Marked for deletion — show undo (+) button
                                      return (
                                        <td key={p.id} className="px-3 py-2">
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() =>
                                              setPendingDeletes((prev) => {
                                                const next = new Set(prev);
                                                next.delete(cell.resultId);
                                                return next;
                                              })
                                            }
                                            className="cursor-pointer h-7 w-7 text-muted-foreground hover:text-foreground"
                                            title={t('undoRemove')}
                                          >
                                            <Plus size={13} />
                                          </Button>
                                        </td>
                                      );
                                    }

                                    if (pendingVal !== undefined) {
                                      // New cell being added — show input + cancel button
                                      return (
                                        <td key={p.id} className="px-3 py-2">
                                          <div className="flex items-center gap-1">
                                            <Input
                                              type="number"
                                              step="0.01"
                                              value={pendingVal}
                                              onChange={(e) =>
                                                setPendingAdds((prev) => ({
                                                  ...prev,
                                                  [addKey]: e.target.value,
                                                }))
                                              }
                                              className="bg-white w-24"
                                              autoFocus
                                            />
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              onClick={() =>
                                                setPendingAdds((prev) => {
                                                  const next = { ...prev };
                                                  delete next[addKey];
                                                  return next;
                                                })
                                              }
                                              className="cursor-pointer h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                                              title={tCommon('cancel')}
                                            >
                                              <X size={13} />
                                            </Button>
                                          </div>
                                        </td>
                                      );
                                    }

                                    // No data — show add (+) button
                                    return (
                                      <td key={p.id} className="px-3 py-2">
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          onClick={() =>
                                            setPendingAdds((prev) => ({ ...prev, [addKey]: '0' }))
                                          }
                                          className="cursor-pointer h-7 w-7 text-muted-foreground hover:text-foreground"
                                          title={t('addValue')}
                                        >
                                          <Plus size={13} />
                                        </Button>
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleSave(session.sessionGroup, session.gopId)}
                            disabled={saving}
                            style={{ background: 'var(--kn-primary, #005982)' }}
                            className="text-white"
                          >
                            <Save size={15} />
                            {saving ? tCommon('loading') : tCommon('save')}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setExpandedKey(null);
                              resetEditorState();
                            }}
                          >
                            <X size={15} />
                            {tCommon('cancel')}
                          </Button>
                        </div>
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
