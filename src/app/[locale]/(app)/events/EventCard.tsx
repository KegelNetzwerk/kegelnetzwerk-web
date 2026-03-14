'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import Comments from '@/components/Comments';
import type { EventData } from './EventForm';

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
  const dateStr = eventDate.toLocaleDateString('de-DE', {
    weekday: 'short',
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
      <div className="flex gap-4">
        {/* Date column */}
        <div
          className="flex-shrink-0 w-24 text-center font-bold text-sm py-2 rounded"
          style={{ backgroundColor: 'var(--color-primary)', color: 'white', transform: 'rotate(-5deg)' }}
        >
          <div>{dateStr.split(', ')[1]?.split('.').slice(0, 2).join('.')}</div>
          <div className="text-xs font-normal">{timeStr}</div>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-1">
          <h2 className="text-lg font-semibold">{event.subject}</h2>
          {event.description && (
            <div
              className="prose prose-sm text-gray-700"
              dangerouslySetInnerHTML={{ __html: event.description }}
            />
          )}
        </div>

        {/* Location + cancellations */}
        <div className="flex-shrink-0 w-40 text-sm text-gray-600 space-y-2">
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
            <br />
            {event.cancellations.length === 0
              ? '–'
              : event.cancellations.map((c) => c.nickname).join(', ')}
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
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRsvp(false)}
                disabled={rsvpLoading}
              >
                👍 {t('reattend')}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRsvp(true)}
                disabled={rsvpLoading}
              >
                👎 {t('cancel')}
              </Button>
            )
          )}

          <button onClick={() => onEdit(event)} className="text-blue-500 hover:underline text-xs">
            {tc('edit')}
          </button>
          {isAdmin && (
            <button
              onClick={() => confirm(t('deleteConfirm')) && onDelete(event.id)}
              className="text-red-500 hover:underline text-xs"
            >
              {tc('delete')}
            </button>
          )}
        </div>
      </div>

      <Comments referenceId={event.id} type="EVENT" initialComments={event.comments} />
    </div>
  );
}
