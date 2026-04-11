'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import RichTextEditor from '@/components/RichTextEditor';
import type { VoteData } from './VoteCard';
import { Save, X, Plus } from 'lucide-react';

interface VoteFormProps {
  readonly initial?: VoteData | null;
  readonly onSaved: () => void;
  readonly onCancel: () => void;
}

export default function VoteForm({ initial, onSaved, onCancel }: VoteFormProps) {
  const t = useTranslations('votes');
  const tc = useTranslations('common');

  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [options, setOptions] = useState<string[]>(
    initial ? initial.options.map((o) => o.text) : ['', '']
  );
  const [maxVoices, setMaxVoices] = useState<number>(initial?.maxVoices ?? 1);
  const [unlimited, setUnlimited] = useState((initial?.maxVoices ?? 1) === -1);
  const [anonymous, setAnonymous] = useState(initial?.anonymous ?? false);
  const [maybe, setMaybe] = useState(initial?.maybe ?? false);
  const [previewResults, setPreviewResults] = useState(initial?.previewResults ?? false);
  const [allowSwitch, setAllowSwitch] = useState(initial?.allowSwitch ?? false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function addOption() {
    setOptions((prev) => [...prev, '']);
  }

  function updateOption(index: number, value: string) {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const validOptions = options.filter((o) => o.trim().length > 0);
    if (validOptions.length < 2) {
      setError(t('error.notEnoughOptions'));
      return;
    }

    setLoading(true);
    const body = {
      title,
      description,
      options: validOptions,
      maxVoices: unlimited ? -1 : maxVoices,
      anonymous,
      maybe,
      previewResults,
      allowSwitch,
    };

    const res = initial
      ? await fetch(`/api/votes/${initial.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      : await fetch('/api/votes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

    if (res.ok) {
      onSaved();
    } else {
      const data = await res.json();
      setError(data.error || t('error.saveFailed'));
    }
    setLoading(false);
  }

  return (
    <div className="border rounded-lg p-4 space-y-4 bg-gray-50">
      <h2 className="font-semibold">{initial ? t('editVote') : t('newVote')}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="space-y-1">
          <Label>{t('voteTitle')}</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>

        <div className="space-y-1">
          <Label>{t('description')}</Label>
          <RichTextEditor value={description} onChange={setDescription} minHeight="80px" />
        </div>

        <div className="space-y-2">
          <Label>{t('options')}</Label>
          {options.map((opt, i) => (
            <Input
              key={i}
              value={opt}
              onChange={(e) => updateOption(i, e.target.value)}
              placeholder={`${i + 1}.`}
            />
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addOption}>
            <Plus size={13} />
            {t('addOption')}
          </Button>
          <p className="text-xs text-gray-400">{t('optionHint')}</p>
        </div>

        <div className="space-y-2 border-t pt-3">
          <Label>{t('settings')}</Label>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="unlimited"
              checked={unlimited}
              onChange={(e) => setUnlimited(e.target.checked)}
            />
            <label htmlFor="unlimited" className="text-sm cursor-pointer">
              {t('unlimited')}
            </label>
            {!unlimited && (
              <Input
                type="number"
                value={maxVoices}
                onChange={(e) => setMaxVoices(Number.parseInt(e.target.value, 10) || 1)}
                className="w-20"
                min={1}
              />
            )}
            <span className="text-sm text-gray-500">{t('maxVoices')}</span>
          </div>

          {(
            [
              ['anonymous', anonymous, setAnonymous],
              ['maybe', maybe, setMaybe],
              ['previewResults', previewResults, setPreviewResults],
              ['allowSwitch', allowSwitch, setAllowSwitch],
            ] as [string, boolean, (v: boolean) => void][]
          ).map(([key, val, setter]) => (
            <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={val} onChange={(e) => setter(e.target.checked)} />
              {t(key as 'anonymous')}
            </label>
          ))}
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={loading} style={{ background: 'var(--kn-primary, #005982)' }} className="text-white">
            <Save size={15} />
            {initial ? t('update') : t('submit')}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            <X size={15} />
            {tc('cancel')}
          </Button>
        </div>
      </form>
    </div>
  );
}
