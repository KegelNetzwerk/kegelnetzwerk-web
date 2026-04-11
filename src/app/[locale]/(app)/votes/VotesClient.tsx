'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import VoteCard, { type VoteData } from './VoteCard';
import VoteForm from './VoteForm';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';

interface VotesClientProps {
  readonly initialItems: VoteData[];
  readonly initialTotal: number;
  readonly pageSize: number;
  readonly currentMemberId: number;
  readonly isAdmin: boolean;
}

export default function VotesClient({
  initialItems,
  initialTotal,
  pageSize,
  currentMemberId,
  isAdmin,
}: VotesClientProps) {
  const t = useTranslations('votes');

  const [items, setItems] = useState<VoteData[]>(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingVote, setEditingVote] = useState<VoteData | null>(null);

  const fetchPage = useCallback(async (newOffset: number) => {
    setLoading(true);
    const res = await fetch(`/api/votes?offset=${newOffset}`);
    if (res.ok) {
      const data = await res.json();
      setItems(data.items);
      setTotal(data.total);
      setOffset(newOffset);
    }
    setLoading(false);
  }, []);

  function handleEdit(vote: VoteData) {
    setEditingVote(vote);
    setFormOpen(true);
  }

  function handleCreate() {
    setEditingVote(null);
    setFormOpen(true);
  }

  async function handleDelete(id: number) {
    await fetch(`/api/votes/${id}`, { method: 'DELETE' });
    await fetchPage(offset);
  }

  async function handleClose(id: number, closed: boolean) {
    await fetch(`/api/votes/${id}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ closed }),
    });
    await fetchPage(offset);
  }

  function handleVoted(updatedVote: VoteData) {
    setItems((prev) => prev.map((v) => (v.id === updatedVote.id ? updatedVote : v)));
  }

  async function handleFormSaved() {
    setFormOpen(false);
    setEditingVote(null);
    await fetchPage(0);
  }

  const totalPages = Math.ceil(total / pageSize);
  const currentPage = Math.floor(offset / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Button onClick={handleCreate} style={{ background: 'var(--kn-primary, #005982)' }} className="text-white">
          <Plus size={15} />
          {t('newVote')}
        </Button>
      </div>

      {formOpen && (
        <VoteForm
          initial={editingVote}
          onSaved={handleFormSaved}
          onCancel={() => { setFormOpen(false); setEditingVote(null); }}
        />
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading...</p>
      ) : (
        <div className="space-y-6">
          {items.map((vote, idx) => (
            <div key={vote.id}>
              {idx > 0 && <hr className="my-4" />}
              <VoteCard
                vote={vote}
                currentMemberId={currentMemberId}
                isAdmin={isAdmin}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onClose={handleClose}
                onVoted={handleVoted}
              />
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center gap-2 justify-center mt-4 flex-wrap">
          <Button variant="outline" size="sm" disabled={currentPage === 0}
            onClick={() => fetchPage(Math.max(0, offset - pageSize))}>
            <ChevronLeft size={15} />
          </Button>
          {Array.from({ length: totalPages }, (_, i) => (
            <Button key={i} variant={i === currentPage ? 'default' : 'outline'} size="sm"
              onClick={() => fetchPage(i * pageSize)}>{i + 1}</Button>
          ))}
          <Button variant="outline" size="sm" disabled={currentPage === totalPages - 1}
            onClick={() => fetchPage(offset + pageSize)}>
            <ChevronRight size={15} />
          </Button>
        </div>
      )}
    </div>
  );
}
