'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import RichTextEditor from '@/components/RichTextEditor';
import { Save, X } from 'lucide-react';

export interface EventData {
  id: number;
  subject: string;
  location: string;
  description: string;
  date: string;
  createdAt: string;
  author: { id: number; nickname: string };
  hasCancelled: boolean;
  pastDeadline: boolean;
  cancelDeadline: string;
  recurrenceRuleId: number | null;
  cancellations: { memberId: number; nickname: string; pic: string }[];
  comments: {
    id: number;
    content: string;
    createdAt: string;
    author: { nickname: string; pic: string };
    isOwn: boolean;
  }[];
}

interface EventFormProps {
  readonly initial?: EventData | null;
  readonly onSaved: () => void;
  readonly onCancel: () => void;
}

export default function EventForm({ initial, onSaved, onCancel }: EventFormProps) {
  const t = useTranslations('events');
  const tc = useTranslations('common');

  // Parse initial date/time
  const initDate = initial ? new Date(initial.date) : new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const toDateStr = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const toTimeStr = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

  const [subject, setSubject] = useState(initial?.subject ?? '');
  const [location, setLocation] = useState(initial?.location ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [dateStr, setDateStr] = useState(toDateStr(initDate));
  const [timeStr, setTimeStr] = useState(initial ? toTimeStr(initDate) : '20:00');
  const [recurrenceType, setRecurrenceType] = useState('NONE');
  const [intervalWeeks, setIntervalWeeks] = useState(4);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const combinedDate = new Date(`${dateStr}T${timeStr}`);
    if (isNaN(combinedDate.getTime())) {
      setError(t('error.invalidDate'));
      return;
    }

    setLoading(true);
    const body: Record<string, unknown> = {
      subject,
      location,
      description,
      date: combinedDate.toISOString(),
    };
    if (!initial && recurrenceType !== 'NONE') {
      body.recurrenceType = recurrenceType;
      if (recurrenceType === 'EVERY_N_WEEKS') body.intervalWeeks = intervalWeeks;
    }

    const res = initial
      ? await fetch(`/api/events/${initial.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      : await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

    if (res.ok) {
      onSaved();
    } else {
      try {
        const data = await res.json();
        setError(data.error || t('error.saveFailed'));
      } catch {
        setError(t('error.saveFailed'));
      }
    }
    setLoading(false);
  }

  return (
    <div className="border rounded-lg p-4 space-y-4 bg-gray-50">
      <h2 className="font-semibold">{initial ? t('editEvent') : t('newEvent')}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>{t('date')}</Label>
            <Input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label>{t('time')}</Label>
            <Input type="time" value={timeStr} onChange={(e) => setTimeStr(e.target.value)} required />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>{t('subject')}</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label>{t('location')}</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
        </div>

        {/* Recurrence — only shown when creating a new event */}
        {!initial && (
          <div className="space-y-2">
            <Label>{t('recurrence')}</Label>
            <div className="flex flex-wrap gap-2">
              {(['NONE', 'EVERY_N_WEEKS', 'MONTHLY', 'YEARLY'] as const).map((type) => (
                <label key={type} className="flex items-center gap-1.5 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="recurrenceType"
                    value={type}
                    checked={recurrenceType === type}
                    onChange={() => setRecurrenceType(type)}
                  />
                  {t(`recurrenceType.${type}`)}
                </label>
              ))}
            </div>
            {recurrenceType === 'EVERY_N_WEEKS' && (
              <div className="flex items-center gap-2 text-sm">
                <Label className="whitespace-nowrap">{t('intervalWeeks')}</Label>
                <Input
                  type="number"
                  min={1}
                  max={52}
                  value={intervalWeeks}
                  onChange={(e) => setIntervalWeeks(Number.parseInt(e.target.value, 10) || 1)}
                  className="w-20"
                />
              </div>
            )}
          </div>
        )}

        <div className="space-y-1">
          <Label>{t('description')}</Label>
          <RichTextEditor value={description} onChange={setDescription} minHeight="80px" />
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
