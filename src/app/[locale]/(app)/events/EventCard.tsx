'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import Comments from '@/components/Comments';
import type { EventData } from './EventForm';
import { ThumbsUp, ThumbsDown, Pencil, Trash2, Repeat2 } from 'lucide-react';

interface EventCardProps {
  event: EventData;
  isAdmin: boolean;
  onEdit: (event: EventData) => void;
  onDelete: (id: number) => void;
  onRsvpChange: (eventId: number, cancel: boolean) => void;
}

export default function EventCard({
  event,
  isAdmin,
  onEdit,
  onDelete,
  onRsvpChange,
}: EventCardProps) {
  const t = useTranslations('events');
  const tc = useTranslations('common');
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [rsvpError, setRsvpError] = useState('');

  const eventDate = new Date(event.date);
  const weekday = eventDate.toLocaleDateString('de-DE', { weekday: 'long' });
  const dateStr = eventDate.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeStr = eventDate.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });

  async function handleRsvp(cancel: boolean) {
    setRsvpError('');
    setRsvpLoading(true);
    const res = await fetch(`/api/events/${event.id}/rsvp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cancel }),
    });
    if (res.ok) {
      onRsvpChange(event.id, cancel);
    } else {
      const data = await res.json();
      setRsvpError(
        data.error === 'Past deadline.'
          ? cancel
            ? t('cancelTooLate')
            : t('reattendTooLate')
          : tc('error')
      );
    }
    setRsvpLoading(false);
  }

  return (
    <div className="space-y-3">
      {/* Mobile: compact date strip */}
      <div
        className="flex sm:hidden items-center gap-2 text-xs font-semibold px-2 py-1 rounded"
        style={{ background: 'var(--kn-primary, #005982)', color: 'white' }}
      >
        <span>{weekday},</span>
        <span>{dateStr}</span>
        <span className="opacity-75">·</span>
        <span>{timeStr}</span>
        {event.recurrenceRuleId && <Repeat2 size={12} className="ml-auto opacity-80" />}
      </div>

      <div className="flex gap-4">
        {/* Desktop: tilted date box (hidden on mobile) */}
        <div
          className="hidden sm:flex flex-shrink-0 w-24 flex-col items-center justify-center text-center font-bold text-sm py-2 rounded"
          style={{ backgroundColor: 'var(--kn-primary, #005982)', color: 'white', transform: 'rotate(-5deg)' }}
        >
          <div className="text-xs font-normal opacity-90">{weekday}</div>
          <div>{dateStr}</div>
          <div className="text-xs font-normal">{timeStr}</div>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-semibold">{event.subject}</h2>
            {event.recurrenceRuleId && (
              <span
                className="hidden sm:inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded"
                style={{ background: 'var(--kn-primary, #005982)', color: 'white', opacity: 0.85 }}
                title={t('recurring')}
              >
                <Repeat2 size={11} />
                {t('recurring')}
              </span>
            )}
          </div>
          {event.description && (
            <div
              className="prose prose-sm text-gray-700"
              dangerouslySetInnerHTML={{ __html: event.description }}
            />
          )}

          {/* Location + cancellations inline on mobile */}
          <div className="sm:hidden text-sm text-gray-600 space-y-1 pt-1">
            {event.location && (
              <div><span className="font-semibold">{t('location')}:</span> {event.location}</div>
            )}
            <div>
              <span className="font-semibold">{t('cancelled')} ({event.cancellations.length}):</span>
              {event.cancellations.length === 0 ? (
                <span className="text-gray-400 ml-1">–</span>
              ) : (
                <span className="ml-1">{event.cancellations.map(c => c.nickname).join(', ')}</span>
              )}
            </div>
          </div>
        </div>

        {/* Location + cancellations column (desktop only) */}
        <div className="hidden sm:block flex-shrink-0 w-40 text-sm text-gray-600 space-y-2">
          {event.location && (
            <div>
              <span className="font-semibold">{t('location')}:</span>
              <br />
              {event.location}
            </div>
          )}
          <div>
            <span className="font-semibold">
              {t('cancelled')} ({event.cancellations.length}):
            </span>
            {event.cancellations.length === 0 ? (
              <div className="text-gray-400">–</div>
            ) : (
              <div className="flex flex-col gap-1 mt-1">
                {event.cancellations.map((c) => (
                  <div key={c.memberId} className="flex items-center gap-1.5">
                    {c.pic && c.pic !== 'none' ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.pic}
                        alt=""
                        style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                      />
                    ) : (
                      <div style={{
                        width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                        background: 'var(--kn-primary, #005982)', opacity: 0.4,
                      }} />
                    )}
                    <span>{c.nickname}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RSVP + actions */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-xs text-gray-400">
          {t('postedBy')} {event.author.nickname}
        </span>
        <div className="flex gap-2 items-center flex-wrap">
          {rsvpError && <span className="text-orange-500 text-xs">{rsvpError}</span>}

          {!event.pastDeadline && (
            event.hasCancelled ? (
              <Button size="sm" variant="outline" onClick={() => handleRsvp(false)} disabled={rsvpLoading}>
                <ThumbsUp size={13} />
                {t('reattend')}
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => handleRsvp(true)} disabled={rsvpLoading}>
                <ThumbsDown size={13} />
                {t('cancel')}
              </Button>
            )
          )}

          <Button size="sm" variant="outline" onClick={() => onEdit(event)}>
            <Pencil size={13} />
            {tc('edit')}
          </Button>
          {isAdmin && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => confirm(t('deleteConfirm')) && onDelete(event.id)}
            >
              <Trash2 size={13} />
              {tc('delete')}
            </Button>
          )}
        </div>
      </div>

      <Comments referenceId={event.id} type="EVENT" initialComments={event.comments} />
    </div>
  );
}
