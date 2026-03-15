'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import Comments, { type CommentData } from '@/components/Comments';
import { Check, Pencil, Trash2, Lock, LockOpen } from 'lucide-react';

interface VoteOption {
  id: number;
  text: string;
  yesCount: number;
  maybeCount: number;
  totalVoters: number;
  myVote: 'yes' | 'maybe' | null;
  voters: { nickname: string; maybe: boolean }[];
}

export interface VoteData {
  id: number;
  title: string;
  description: string;
  maxVoices: number;
  anonymous: boolean;
  maybe: boolean;
  previewResults: boolean;
  allowSwitch: boolean;
  closed: boolean;
  createdAt: string;
  author: { id: number; nickname: string };
  hasVoted: boolean;
  options: VoteOption[];
  comments: CommentData[];
}

interface VoteCardProps {
  vote: VoteData;
  currentMemberId: number;
  isAdmin: boolean;
  onEdit: (vote: VoteData) => void;
  onDelete: (id: number) => void;
  onClose: (id: number, closed: boolean) => void;
  onVoted: (updatedVote: VoteData) => void;
}

export default function VoteCard({
  vote,
  currentMemberId,
  isAdmin,
  onEdit,
  onDelete,
  onClose,
  onVoted,
}: VoteCardProps) {
  const t = useTranslations('votes');
  const tc = useTranslations('common');

  const [selections, setSelections] = useState<Record<number, 'yes' | 'maybe' | null>>(() => {
    const init: Record<number, 'yes' | 'maybe' | null> = {};
    for (const opt of vote.options) {
      init[opt.id] = opt.myVote;
    }
    return init;
  });

  const [submitting, setSubmitting] = useState(false);
  const [voteError, setVoteError] = useState('');

  const showResults =
    vote.previewResults || vote.closed || (vote.hasVoted && !vote.allowSwitch);

  const canVote = !vote.closed && (!vote.hasVoted || vote.allowSwitch);

  function toggleSelection(optionId: number, type: 'yes' | 'maybe') {
    setSelections((prev) => ({
      ...prev,
      [optionId]: prev[optionId] === type ? null : type,
    }));
  }

  async function handleVote() {
    setVoteError('');
    setSubmitting(true);

    const res = await fetch(`/api/votes/${vote.id}/cast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selections }),
    });

    if (res.ok) {
      const refreshed = await fetch(`/api/votes?id=${vote.id}`);
      if (refreshed.ok) {
        const data = await refreshed.json();
        if (data.items[0]) onVoted(data.items[0]);
      }
    } else {
      const data = await res.json();
      setVoteError(data.error || t('error.voteFailed'));
    }
    setSubmitting(false);
  }

  const totalVoters = vote.options[0]?.totalVoters ?? 0;

  // Suppress unused variable warning — currentMemberId used by parent to pass isOwn
  void currentMemberId;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <h2 className="text-lg font-semibold">{vote.title}</h2>
        {vote.closed && (
          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
            {t('closed')}
          </span>
        )}
      </div>

      {/* Meta */}
      <div className="text-xs text-gray-400 space-x-2">
        <span>
          {t('maxVotesLabel')}: {vote.maxVoices === -1 ? t('unlimited') : vote.maxVoices}
        </span>
        {vote.anonymous && <span>· {t('anonymous')}</span>}
        {vote.allowSwitch && <span>· {t('allowSwitch')}</span>}
      </div>

      {/* Description */}
      {vote.description && (
        <div
          className="prose prose-sm text-gray-700"
          dangerouslySetInnerHTML={{ __html: vote.description }}
        />
      )}

      {/* Options table */}
      <div className="space-y-2">
        {vote.options.map((opt) => {
          const yesPercent = totalVoters > 0 ? Math.round((opt.yesCount / totalVoters) * 100) : 0;
          const maybePercent =
            totalVoters > 0 ? Math.round((opt.maybeCount / totalVoters) * 100) : 0;

          return (
            <div key={opt.id} className="space-y-1">
              <div className="flex items-center gap-3">
                {/* Vote controls */}
                {canVote && (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => toggleSelection(opt.id, 'yes')}
                      className={`w-6 h-6 rounded border-2 flex items-center justify-center text-xs ${
                        selections[opt.id] === 'yes'
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'border-gray-300 hover:border-green-400'
                      }`}
                      title={t('voteYes')}
                    >
                      ✓
                    </button>
                    {vote.maybe && (
                      <button
                        type="button"
                        onClick={() => toggleSelection(opt.id, 'maybe')}
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center text-xs ${
                          selections[opt.id] === 'maybe'
                            ? 'bg-yellow-400 border-yellow-400 text-white'
                            : 'border-gray-300 hover:border-yellow-300'
                        }`}
                        title={t('voteMaybe')}
                      >
                        ?
                      </button>
                    )}
                  </div>
                )}

                <span className="flex-1 text-sm">{opt.text}</span>

                {/* Result bars */}
                {showResults && totalVoters > 0 && (
                  <div className="flex gap-1 items-center">
                    {opt.yesCount > 0 && (
                      <div
                        className="h-4 rounded text-white text-xs flex items-center px-1"
                        style={{
                          width: `${Math.max(yesPercent, 8)}px`,
                          minWidth: '24px',
                          backgroundColor: 'var(--kn-primary, #005982)',
                        }}
                      >
                        {yesPercent}%
                      </div>
                    )}
                    {vote.maybe && opt.maybeCount > 0 && (
                      <div
                        className="h-4 rounded text-white text-xs flex items-center px-1 bg-yellow-400"
                        style={{ minWidth: '24px' }}
                      >
                        {maybePercent}%
                      </div>
                    )}
                    <span className="text-xs text-gray-400">
                      ({opt.yesCount + opt.maybeCount}/{totalVoters})
                    </span>
                  </div>
                )}
              </div>

              {/* Voter names */}
              {showResults && !vote.anonymous && opt.voters.length > 0 && (
                <p className="text-xs text-gray-400 pl-8">
                  {opt.voters
                    .map((v) => (v.maybe ? `(${v.nickname})` : v.nickname))
                    .join(', ')}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Vote submit */}
      {canVote && (
        <div>
          {voteError && <p className="text-red-500 text-xs mb-1">{voteError}</p>}
          <Button
            size="sm"
            onClick={handleVote}
            disabled={submitting}
            style={{ background: 'var(--kn-primary, #005982)' }}
            className="text-white"
          >
            <Check size={13} />
            {t('vote')}
          </Button>
        </div>
      )}

      {/* Action bar */}
      <div className="flex gap-3 items-center justify-between text-sm pt-1">
        <span className="text-xs text-gray-400">
          {t('postedBy')} {vote.author.nickname}
        </span>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              confirm(vote.closed ? t('reopenConfirm') : t('closeConfirm')) &&
              onClose(vote.id, !vote.closed)
            }
          >
            {vote.closed ? <LockOpen size={13} /> : <Lock size={13} />}
            {vote.closed ? t('reopen') : t('close')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => onEdit(vote)}>
            <Pencil size={13} />
            {tc('edit')}
          </Button>
          {isAdmin && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => confirm(t('deleteConfirm')) && onDelete(vote.id)}
            >
              <Trash2 size={13} />
              {tc('delete')}
            </Button>
          )}
        </div>
      </div>

      <Comments referenceId={vote.id} type="VOTE" initialComments={vote.comments} />
    </div>
  );
}
