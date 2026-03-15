'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import EventCard from './EventCard';
import EventForm, { type EventData } from './EventForm';
import { Plus, CalendarDays, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

interface EventsClientProps {
  initialItems: EventData[];
  initialTotal: number;
  pageSize: number;
  isAdmin: boolean;
  currentMember: { id: number; nickname: string; pic: string };
}

export default function EventsClient({
  initialItems,
  initialTotal,
  pageSize,
  isAdmin,
  currentMember,
}: EventsClientProps) {
  const t = useTranslations('events');

  const [items, setItems] = useState<EventData[]>(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [offset, setOffset] = useState(0);
  const [showPast, setShowPast] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventData | null>(null);

  const fetchPage = useCallback(
    async (newOffset: number, past: boolean) => {
      setLoading(true);
      const res = await fetch(`/api/events?offset=${newOffset}&past=${past}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
        setTotal(data.total);
        setOffset(newOffset);
      }
      setLoading(false);
    },
    []
  );

  function togglePast() {
    const next = !showPast;
    setShowPast(next);
    fetchPage(0, next);
  }

  function handleEdit(event: EventData) {
    setEditingEvent(event);
    setFormOpen(true);
  }

  async function handleDelete(id: number) {
    await fetch(`/api/events/${id}`, { method: 'DELETE' });
    await fetchPage(offset, showPast);
  }

  function handleRsvpChange(eventId: number, cancel: boolean) {
    setItems((prev) =>
      prev.map((ev) => {
        if (ev.id !== eventId) return ev;
        const cancellations = cancel
          ? [...ev.cancellations, { memberId: currentMember.id, nickname: currentMember.nickname, pic: currentMember.pic }]
          : ev.cancellations.filter((c) => c.memberId !== currentMember.id);
        return { ...ev, hasCancelled: cancel, cancellations };
      })
    );
  }

  async function handleFormSaved() {
    setFormOpen(false);
    setEditingEvent(null);
    await fetchPage(0, showPast);
  }

  const totalPages = Math.ceil(total / pageSize);
  const currentPage = Math.floor(offset / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={togglePast}>
            {showPast ? <><CalendarDays size={14} /> {t('viewUpcoming')}</> : <><Clock size={14} /> {t('viewPast')}</>}
          </Button>
          <Button
            onClick={() => { setEditingEvent(null); setFormOpen(true); }}
            style={{ background: 'var(--kn-primary, #005982)' }}
            className="text-white"
          >
            <Plus size={15} />
            {t('newEvent')}
          </Button>
        </div>
      </div>

      {formOpen && (
        <EventForm
          initial={editingEvent}
          onSaved={handleFormSaved}
          onCancel={() => { setFormOpen(false); setEditingEvent(null); }}
        />
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading...</p>
      ) : (
        <div className="space-y-6">
          {items.map((event, idx) => (
            <div key={event.id}>
              {idx > 0 && <hr className="my-4" />}
              <EventCard
                event={event}
                isAdmin={isAdmin}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onRsvpChange={handleRsvpChange}
              />
            </div>
          ))}
          {items.length === 0 && (
            <p className="text-gray-400 text-sm">
              {showPast ? 'Keine vergangenen Termine.' : 'Keine kommenden Termine.'}
            </p>
          )}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center gap-2 justify-center mt-4 flex-wrap">
          <Button variant="outline" size="sm" disabled={currentPage === 0}
            onClick={() => fetchPage(Math.max(0, offset - pageSize), showPast)}>
            <ChevronLeft size={15} />
          </Button>
          {Array.from({ length: totalPages }, (_, i) => (
            <Button key={i} variant={i === currentPage ? 'default' : 'outline'} size="sm"
              onClick={() => fetchPage(i * pageSize, showPast)}>
              {i + 1}
            </Button>
          ))}
          <Button variant="outline" size="sm" disabled={currentPage === totalPages - 1}
            onClick={() => fetchPage(offset + pageSize, showPast)}>
            <ChevronRight size={15} />
          </Button>
        </div>
      )}
    </div>
  );
}
