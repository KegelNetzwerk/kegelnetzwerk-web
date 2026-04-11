'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import RichTextEditor from '@/components/RichTextEditor';
import PartPicThumb from '@/components/PartPicThumb';
import { Plus, Pencil, Trash2, Save, X, ImageIcon } from 'lucide-react';
import { KEGEL_PINS, KEGEL_R, KEGEL_W, KEGEL_H } from '@/lib/kegelPins';

interface Part {
  id: number;
  name: string;
  unit: 'POINTS' | 'EURO';
  once: boolean;
  value: number;
  variable: boolean;
  factor: number;
  bonus: number;
  description: string;
  pic: string;
}

interface GameOrPenalty {
  id: number;
  name: string;
  parts: Part[];
}

interface GamesClientProps {
  readonly initialGames: GameOrPenalty[];
  readonly clubColor: string;
  readonly clubColor2: string;
}

type PicTab = 'upload' | 'emoji' | 'gen';

interface PicState {
  gameId: number;
  partId: number | null; // null when adding a new part
  tab: PicTab;
  emojiInput: string;
  genColor: string;       // always a valid #rrggbb — active pin fill
  genColorText: string;   // raw text field value (may be mid-edit)
  genStroke: string;      // always a valid #rrggbb — pin border
  genStrokeText: string;
  genActivePins: number[];
}

// Pending image change — applied atomically when the part is saved
type PendingPicIntent =
  | { type: 'upload'; file: File; preview: string }
  | { type: 'emoji'; value: string }
  | { type: 'gen'; color: string; stroke: string; pins: number[] }
  | { type: 'remove' };

export default function GamesClient({ initialGames, clubColor, clubColor2 }: GamesClientProps) {
  const t = useTranslations('gameManagement');
  const tc = useTranslations('common');

  const [games, setGames] = useState<GameOrPenalty[]>(initialGames);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryError, setCategoryError] = useState('');

  const [editingGameId, setEditingGameId] = useState<number | null>(null);
  const [editingPartId, setEditingPartId] = useState<number | null>(null);
  const [partForm, setPartForm] = useState({
    name: '', unit: 'POINTS' as 'POINTS' | 'EURO',
    once: false, value: '0', variable: false,
    factor: '1', bonus: '0', description: '',
  });
  const [partLoading, setPartLoading] = useState(false);
  const [partError, setPartError] = useState('');

  // Image picker state (always active when form is open)
  const [picState, setPicState] = useState<PicState | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pending image change — queued via UI interaction, applied on part save
  const [pendingPic, setPendingPic] = useState<PendingPicIntent | null>(null);

  // Ref for the part form — used to scroll it into view when it opens
  const formRef = useRef<HTMLDivElement>(null);

  // Normalize club colors to #rrggbb for use as picker defaults
  const defaultGenColor  = '#' + clubColor.replace('#', '');
  const defaultGenStroke = '#' + clubColor.replace('#', '');

  // Scroll form into view whenever it opens or switches to a different part
  useEffect(() => {
    if (editingGameId !== null) {
      setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    }
  }, [editingGameId, editingPartId]);

  function updatePartPic(gameId: number, partId: number, pic: string) {
    setGames((prev) =>
      prev.map((g) => {
        if (g.id !== gameId) return g;
        return { ...g, parts: g.parts.map((p) => (p.id === partId ? { ...p, pic } : p)) };
      })
    );
  }

  // Applies a pending pic intent via API; returns the new pic string or null on error
  async function applyPendingPic(gameId: number, partId: number, pic: PendingPicIntent): Promise<string | null> {
    if (pic.type === 'upload') {
      const fd = new FormData();
      fd.append('picType', 'upload');
      fd.append('pic', pic.file);
      const res = await fetch(`/api/games/${gameId}/parts/${partId}`, { method: 'PATCH', body: fd });
      if (res.ok) { const p: Part = await res.json(); return p.pic; }
    } else if (pic.type === 'emoji') {
      const fd = new FormData();
      fd.append('picType', 'emoji');
      fd.append('picValue', pic.value);
      const res = await fetch(`/api/games/${gameId}/parts/${partId}`, { method: 'PATCH', body: fd });
      if (res.ok) { const p: Part = await res.json(); return p.pic; }
    } else if (pic.type === 'gen') {
      const res = await fetch('/api/gen/kegel/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color: pic.color, strokeColor: pic.stroke, activePins: pic.pins, gameId, partId }),
      });
      if (res.ok) { const p: Part = await res.json(); return p.pic; }
    } else if (pic.type === 'remove') {
      const fd = new FormData();
      fd.append('picType', 'none');
      const res = await fetch(`/api/games/${gameId}/parts/${partId}`, { method: 'PATCH', body: fd });
      if (res.ok) return 'none';
    }
    return null;
  }

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    setCategoryError('');
    const res = await fetch('/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCategoryName }),
    });
    if (res.ok) {
      const game = await res.json();
      setGames((prev) => [...prev, { ...game, parts: [] }]);
      setNewCategoryName('');
    } else {
      const data = await res.json();
      setCategoryError(data.error || t('error.saveFailed'));
    }
  }

  async function handleDeleteCategory(id: number) {
    if (!confirm(t('deleteCategoryConfirm'))) return;
    await fetch(`/api/games/${id}`, { method: 'DELETE' });
    setGames((prev) => prev.filter((g) => g.id !== id));
  }

  function openPartForm(gameId: number, part?: Part) {
    setEditingGameId(gameId);
    setEditingPartId(part?.id ?? null);
    setPartForm({
      name: part?.name ?? '',
      unit: part?.unit ?? 'POINTS',
      once: part?.once ?? false,
      value: String(part?.value ?? 0),
      variable: part?.variable ?? false,
      factor: String(part?.factor ?? 1),
      bonus: String(part?.bonus ?? 0),
      description: part?.description ?? '',
    });
    setPartError('');
    setPicState({
      gameId,
      partId: part?.id ?? null,
      tab: 'upload',
      emojiInput: part?.pic.startsWith('emoji:') ? part.pic.slice(6) : '',
      genColor: defaultGenColor,
      genColorText: defaultGenColor,
      genStroke: defaultGenStroke,
      genStrokeText: defaultGenStroke,
      genActivePins: [],
    });
    setPendingPic(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function closePartForm() {
    setEditingGameId(null);
    setEditingPartId(null);
    setPicState(null);
    setPendingPic(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handlePartSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingGameId) return;
    setPartError('');
    setPartLoading(true);

    const fd = new FormData();
    fd.append('name', partForm.name);
    fd.append('unit', partForm.unit);
    fd.append('once', String(partForm.once));
    fd.append('value', partForm.value);
    fd.append('variable', String(partForm.variable));
    fd.append('factor', partForm.factor);
    fd.append('bonus', partForm.bonus);
    fd.append('description', partForm.description);

    const url = editingPartId
      ? `/api/games/${editingGameId}/parts/${editingPartId}`
      : `/api/games/${editingGameId}/parts`;
    const method = editingPartId ? 'PUT' : 'POST';

    const res = await fetch(url, { method, body: fd });
    if (res.ok) {
      let saved: Part = await res.json();

      // Apply pending pic atomically with the part save
      if (pendingPic) {
        const appliedPic = await applyPendingPic(editingGameId, saved.id, pendingPic);
        if (appliedPic !== null) {
          saved = { ...saved, pic: appliedPic };
        } else {
          toast.error(t('picSaveError'));
        }
      }

      setGames((prev) =>
        prev.map((g) => {
          if (g.id !== editingGameId) return g;
          if (editingPartId) {
            return { ...g, parts: g.parts.map((p) => (p.id === editingPartId ? saved : p)) };
          }
          return { ...g, parts: [...g.parts, saved] };
        })
      );
      closePartForm();
    } else {
      const data = await res.json();
      setPartError(data.error || t('error.saveFailed'));
    }
    setPartLoading(false);
  }

  async function handleDeletePart(gameId: number, partId: number) {
    if (!confirm(t('deletePartConfirm'))) return;
    await fetch(`/api/games/${gameId}/parts/${partId}`, { method: 'DELETE' });
    setGames((prev) =>
      prev.map((g) => {
        if (g.id !== gameId) return g;
        return { ...g, parts: g.parts.filter((p) => p.id !== partId) };
      })
    );
  }

  function formatFormula(part: Part): string {
    const val = part.variable ? 'x' : String(part.value).replace('.', ',');
    if (part.factor === 1 && part.bonus === 0) return val;
    if (part.factor === 1) return `${val} + ${String(part.bonus).replace('.', ',')}`;
    if (part.bonus === 0) return `${val} × ${String(part.factor).replace('.', ',')}`;
    return `(${val} × ${String(part.factor).replace('.', ',')}) + ${String(part.bonus).replace('.', ',')}`;
  }

  // Saved pic from DB (only relevant for existing parts)
  const currentSavedPic = picState?.partId != null
    ? games.find((g) => g.id === picState.gameId)?.parts.find((p) => p.id === picState.partId)?.pic ?? 'none'
    : 'none';

  // Whether there is a non-removal image currently active (pending or saved)
  const hasAnyPic = pendingPic
    ? pendingPic.type !== 'remove'
    : (picState?.partId !== null && currentSavedPic !== 'none');

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      {/* Add category form */}
      <form onSubmit={handleCreateCategory} className="flex gap-2 items-end">
        <div className="space-y-1 flex-1">
          <Label>{t('categoryName')}</Label>
          <Input
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            required
          />
        </div>
        <Button type="submit" style={{ background: 'var(--kn-primary, #005982)' }} className="text-white">
          <Plus size={15} />
          {t('submitCategory')}
        </Button>
      </form>
      {categoryError && <p className="text-red-500 text-sm">{categoryError}</p>}

      {/* Part form (inline, scrolled into view on open) */}
      {editingGameId !== null && (
        <div ref={formRef} className="border rounded-lg p-4 bg-gray-50 space-y-4 scroll-mt-4">
          <h2 className="font-semibold">
            {editingPartId ? t('editPart') : t('newPart')}
          </h2>
          <form onSubmit={handlePartSubmit} className="space-y-3">
            {partError && <p className="text-red-500 text-sm">{partError}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t('partName')}</Label>
                <Input
                  className="bg-white"
                  value={partForm.name}
                  onChange={(e) => setPartForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>{t('unit')}</Label>
                <select
                  value={partForm.unit}
                  onChange={(e) => setPartForm((f) => ({ ...f, unit: e.target.value as 'POINTS' | 'EURO' }))}
                  className="w-full border rounded px-3 py-2 text-sm bg-white"
                >
                  <option value="POINTS">{t('unitPoints')}</option>
                  <option value="EURO">{t('unitEuro')}</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>{t('value')}</Label>
                <Input className="bg-white" value={partForm.value} onChange={(e) => setPartForm((f) => ({ ...f, value: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>{t('factor')}</Label>
                <Input className="bg-white" value={partForm.factor} onChange={(e) => setPartForm((f) => ({ ...f, factor: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>{t('bonus')}</Label>
                <Input className="bg-white" value={partForm.bonus} onChange={(e) => setPartForm((f) => ({ ...f, bonus: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={partForm.once} onChange={(e) => setPartForm((f) => ({ ...f, once: e.target.checked }))} />
                {t('once')}
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={partForm.variable} onChange={(e) => setPartForm((f) => ({ ...f, variable: e.target.checked }))} />
                {t('variable')}
              </label>
            </div>
            <div className="space-y-1">
              <Label>{t('description')}</Label>
              <RichTextEditor value={partForm.description} onChange={(v) => setPartForm((f) => ({ ...f, description: v }))} minHeight="60px" />
            </div>

            {/* ── Image picker ── */}
            {picState && (
              <div className="border rounded-lg p-3 bg-white space-y-3">
                <div className="flex items-center gap-2">
                  <ImageIcon size={14} className="text-gray-400" />
                  <span className="text-sm font-medium">{t('image')}</span>

                  {/* Pending or saved image preview in header */}
                  {(() => {
                    if (pendingPic?.type === 'upload') {
                      return <img src={pendingPic.preview} alt="" className="w-6 h-6 rounded object-cover shrink-0" />;
                    }
                    if (pendingPic?.type === 'emoji') {
                      return <span className="text-xl leading-none">{pendingPic.value}</span>;
                    }
                    if (pendingPic?.type === 'gen') {
                      return (
                        <svg width="32" height="24" viewBox={`0 0 ${KEGEL_W} ${KEGEL_H}`} className="rounded border shrink-0">
                          {KEGEL_PINS.map(([x, y], idx) => {
                            const pinNum = idx + 1;
                            return (
                              <circle key={pinNum} cx={x} cy={y} r={KEGEL_R}
                                fill={picState.genActivePins.includes(pinNum) ? picState.genColor : 'none'}
                                stroke={picState.genStroke} strokeWidth="2" />
                            );
                          })}
                        </svg>
                      );
                    }
                    if (!pendingPic && picState.partId !== null && currentSavedPic !== 'none') {
                      return <PartPicThumb pic={currentSavedPic} size={24} />;
                    }
                    return null;
                  })()}
                </div>

                {/* Tabs */}
                <div className="flex gap-1 border-b">
                  {(['upload', 'emoji', 'gen'] as PicTab[]).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setPicState((s) => s && { ...s, tab })}
                      className={`px-3 py-1.5 text-sm rounded-t cursor-pointer transition-colors ${
                        picState.tab === tab
                          ? 'bg-gray-50 border border-b-white font-medium'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {tab === 'upload' ? t('picTabUpload') : tab === 'emoji' ? t('picTabEmoji') : t('picTabGenerate')}
                    </button>
                  ))}
                </div>

                {/* Upload tab */}
                {picState.tab === 'upload' && (
                  <div className="flex items-center gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="flex-1 text-sm text-gray-500 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-gray-200 file:text-gray-700"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        if (file) {
                          setPendingPic({ type: 'upload', file, preview: URL.createObjectURL(file) });
                        } else if (pendingPic?.type === 'upload') {
                          setPendingPic(null);
                        }
                      }}
                    />
                    {pendingPic?.type === 'upload' && (
                      <img src={pendingPic.preview} alt="" className="w-10 h-10 object-cover rounded shrink-0" />
                    )}
                  </div>
                )}

                {/* Emoji tab */}
                {picState.tab === 'emoji' && (
                  <div className="flex items-center gap-3">
                    <Input
                      className="bg-gray-50 w-24 text-2xl text-center"
                      value={picState.emojiInput}
                      maxLength={4}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPicState((s) => s && { ...s, emojiInput: val });
                        if (val.trim()) {
                          setPendingPic({ type: 'emoji', value: val.trim() });
                        } else if (pendingPic?.type === 'emoji') {
                          setPendingPic(null);
                        }
                      }}
                      placeholder="🎳"
                    />
                    {picState.emojiInput && (
                      <span className="text-4xl leading-none" aria-hidden="true">{picState.emojiInput}</span>
                    )}
                  </div>
                )}

                {/* Generate tab */}
                {picState.tab === 'gen' && (
                  <div className="flex gap-6 items-start flex-wrap">
                    {/* Interactive pin selector */}
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Pins</Label>
                      <svg
                        width="160" height="120"
                        viewBox={`0 0 ${KEGEL_W} ${KEGEL_H}`}
                        className="rounded border bg-gray-100 block"
                      >
                        {KEGEL_PINS.map(([x, y], idx) => {
                          const pinNum = idx + 1;
                          const isActive = picState.genActivePins.includes(pinNum);
                          return (
                            <circle
                              key={pinNum}
                              cx={x} cy={y} r={KEGEL_R}
                              fill={isActive ? picState.genColor : 'transparent'}
                              stroke={picState.genStroke}
                              strokeWidth="1.5"
                              className="cursor-pointer"
                              onClick={() => {
                                const newPins = isActive
                                  ? picState.genActivePins.filter((p) => p !== pinNum)
                                  : [...picState.genActivePins, pinNum];
                                setPicState((s) => s ? { ...s, genActivePins: newPins } : s);
                                setPendingPic({
                                  type: 'gen',
                                  color: picState.genColor.replace('#', ''),
                                  stroke: picState.genStroke.replace('#', ''),
                                  pins: newPins,
                                });
                              }}
                            />
                          );
                        })}
                      </svg>
                    </div>

                    {/* Active-fill color */}
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">{t('picGenColor')}</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={picState.genColor}
                          onChange={(e) => {
                            const v = e.target.value;
                            setPicState((s) => s && { ...s, genColor: v, genColorText: v });
                            setPendingPic((prev) => prev?.type === 'gen' ? { ...prev, color: v.replace('#', '') } : prev);
                          }}
                          className="h-9 w-12 cursor-pointer rounded border p-1 shrink-0"
                        />
                        <input
                          type="text"
                          value={picState.genColorText}
                          maxLength={7}
                          spellCheck={false}
                          placeholder="#000000"
                          className="h-9 w-28 rounded border px-2 text-sm font-mono bg-white"
                          onChange={(e) => {
                            const raw = e.target.value;
                            const norm = raw.startsWith('#') ? raw : `#${raw}`;
                            const valid = /^#[0-9a-fA-F]{6}$/.test(norm);
                            setPicState((s) => s && { ...s, genColorText: raw, ...(valid ? { genColor: norm } : {}) });
                            if (valid) {
                              setPendingPic((prev) => prev?.type === 'gen' ? { ...prev, color: norm.replace('#', '') } : prev);
                            }
                          }}
                        />
                      </div>
                    </div>

                    {/* Border color */}
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">{t('picGenStroke')}</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={picState.genStroke}
                          onChange={(e) => {
                            const v = e.target.value;
                            setPicState((s) => s && { ...s, genStroke: v, genStrokeText: v });
                            setPendingPic((prev) => prev?.type === 'gen' ? { ...prev, stroke: v.replace('#', '') } : prev);
                          }}
                          className="h-9 w-12 cursor-pointer rounded border p-1 shrink-0"
                        />
                        <input
                          type="text"
                          value={picState.genStrokeText}
                          maxLength={7}
                          spellCheck={false}
                          placeholder="#000000"
                          className="h-9 w-28 rounded border px-2 text-sm font-mono bg-white"
                          onChange={(e) => {
                            const raw = e.target.value;
                            const norm = raw.startsWith('#') ? raw : `#${raw}`;
                            const valid = /^#[0-9a-fA-F]{6}$/.test(norm);
                            setPicState((s) => s && { ...s, genStrokeText: raw, ...(valid ? { genStroke: norm } : {}) });
                            if (valid) {
                              setPendingPic((prev) => prev?.type === 'gen' ? { ...prev, stroke: norm.replace('#', '') } : prev);
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Remove current / pending image */}
                {hasAnyPic && (
                  <div className="pt-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (picState.partId === null) {
                          setPendingPic(null);
                        } else {
                          setPendingPic({ type: 'remove' });
                        }
                      }}
                    >
                      <Trash2 size={13} />
                      {t('picRemove')}
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={partLoading} style={{ background: 'var(--kn-primary, #005982)' }} className="text-white">
                <Save size={15} />
                {editingPartId ? t('updatePart') : t('submitPart')}
              </Button>
              <Button type="button" variant="outline" onClick={closePartForm}>
                <X size={15} />
                {tc('cancel')}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Categories list */}
      {games.map((game) => (
        <div key={game.id} className="border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: 'var(--kn-primary, #005982)', color: 'white' }}>
            <h2 className="font-semibold">{game.name}</h2>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => openPartForm(game.id)}
                className="text-white border-white/40 hover:bg-white/10 hover:text-white"
                style={{ background: 'rgba(255,255,255,0.1)' }}
              >
                <Plus size={14} />
                {t('newPart')}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDeleteCategory(game.id)}
              >
                <Trash2 size={14} />
                {tc('delete')}
              </Button>
            </div>
          </div>

          {game.parts.length === 0 ? (
            <p className="text-gray-400 text-sm p-4">No parts yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-2">{t('partName')}</th>
                  <th className="px-4 py-2">{t('value')}</th>
                  <th className="px-4 py-2">{t('unit')}</th>
                  <th className="px-4 py-2">{t('once')}</th>
                  <th className="px-4 py-2 w-48">{t('description')}</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {game.parts.map((part) => (
                  <tr key={part.id} className="border-t">
                    <td className="px-4 py-2 font-medium">
                      <div className="flex items-center gap-2">
                        <PartPicThumb pic={part.pic} size={28} />
                        {part.name}
                      </div>
                    </td>
                    <td className="px-4 py-2 font-mono">{formatFormula(part)}</td>
                    <td className="px-4 py-2">{part.unit === 'EURO' ? '€' : t('unitPoints')}</td>
                    <td className="px-4 py-2">{part.once ? '✓' : ''}</td>
                    <td className="px-4 py-2 text-gray-500 text-xs truncate max-w-xs">
                      <span dangerouslySetInnerHTML={{ __html: part.description }} />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openPartForm(game.id, part)}>
                          <Pencil size={13} />
                          {tc('edit')}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeletePart(game.id, part.id)}>
                          <Trash2 size={13} />
                          {tc('delete')}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  );
}
