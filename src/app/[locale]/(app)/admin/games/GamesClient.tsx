'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import RichTextEditor from '@/components/RichTextEditor';

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
  initialGames: GameOrPenalty[];
}

export default function GamesClient({ initialGames }: GamesClientProps) {
  const t = useTranslations('gameManagement');
  const tc = useTranslations('common');

  const [games, setGames] = useState<GameOrPenalty[]>(initialGames);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryError, setCategoryError] = useState('');

  // Part form state
  const [editingGameId, setEditingGameId] = useState<number | null>(null);
  const [editingPartId, setEditingPartId] = useState<number | null>(null);
  const [partForm, setPartForm] = useState({
    name: '', unit: 'POINTS' as 'POINTS' | 'EURO',
    once: false, value: '0', variable: false,
    factor: '1', bonus: '0', description: '',
  });
  const [partLoading, setPartLoading] = useState(false);
  const [partError, setPartError] = useState('');

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
      const saved: Part = await res.json();
      setGames((prev) =>
        prev.map((g) => {
          if (g.id !== editingGameId) return g;
          if (editingPartId) {
            return { ...g, parts: g.parts.map((p) => (p.id === editingPartId ? saved : p)) };
          }
          return { ...g, parts: [...g.parts, saved] };
        })
      );
      setEditingGameId(null);
      setEditingPartId(null);
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
        <Button type="submit">{t('submitCategory')}</Button>
      </form>
      {categoryError && <p className="text-red-500 text-sm">{categoryError}</p>}

      {/* Part form (inline) */}
      {editingGameId !== null && (
        <div className="border rounded-lg p-4 bg-gray-50 space-y-4">
          <h2 className="font-semibold">
            {editingPartId ? t('editPart') : t('newPart')}
          </h2>
          <form onSubmit={handlePartSubmit} className="space-y-3">
            {partError && <p className="text-red-500 text-sm">{partError}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t('partName')}</Label>
                <Input value={partForm.name} onChange={(e) => setPartForm((f) => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="space-y-1">
                <Label>{t('unit')}</Label>
                <select
                  value={partForm.unit}
                  onChange={(e) => setPartForm((f) => ({ ...f, unit: e.target.value as 'POINTS' | 'EURO' }))}
                  className="w-full border rounded px-3 py-2 text-sm"
                >
                  <option value="POINTS">{t('unitPoints')}</option>
                  <option value="EURO">{t('unitEuro')}</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>{t('value')}</Label>
                <Input value={partForm.value} onChange={(e) => setPartForm((f) => ({ ...f, value: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>{t('factor')}</Label>
                <Input value={partForm.factor} onChange={(e) => setPartForm((f) => ({ ...f, factor: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>{t('bonus')}</Label>
                <Input value={partForm.bonus} onChange={(e) => setPartForm((f) => ({ ...f, bonus: e.target.value }))} />
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
            <div className="flex gap-2">
              <Button type="submit" disabled={partLoading}>
                {editingPartId ? t('updatePart') : t('submitPart')}
              </Button>
              <Button type="button" variant="outline" onClick={() => { setEditingGameId(null); setEditingPartId(null); }}>
                {tc('cancel')}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Categories list */}
      {games.map((game) => (
        <div key={game.id} className="border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
            <h2 className="font-semibold">{game.name}</h2>
            <div className="flex gap-3 text-sm">
              <button onClick={() => openPartForm(game.id)} className="text-white/80 hover:text-white">
                + {t('newPart')}
              </button>
              <button onClick={() => handleDeleteCategory(game.id)} className="text-red-300 hover:text-red-100">
                {tc('delete')}
              </button>
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
                    <td className="px-4 py-2 font-medium">{part.name}</td>
                    <td className="px-4 py-2 font-mono">{formatFormula(part)}</td>
                    <td className="px-4 py-2">{part.unit === 'EURO' ? '€' : t('unitPoints')}</td>
                    <td className="px-4 py-2">{part.once ? '✓' : ''}</td>
                    <td className="px-4 py-2 text-gray-500 text-xs truncate max-w-xs">
                      <span dangerouslySetInnerHTML={{ __html: part.description }} />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <button onClick={() => openPartForm(game.id, part)} className="text-blue-500 hover:underline">{tc('edit')}</button>
                        <button onClick={() => handleDeletePart(game.id, part.id)} className="text-red-500 hover:underline">{tc('delete')}</button>
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
