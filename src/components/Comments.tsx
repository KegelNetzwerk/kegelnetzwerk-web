'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Trash2 } from 'lucide-react';
import CommentsToggleButton from '@/components/CommentsToggleButton';

export interface CommentData {
  id: number;
  content: string;
  createdAt: string;
  author: { nickname: string; pic: string };
  isOwn: boolean;
}

interface CommentsProps {
  readonly referenceId: number;
  readonly type: 'NEWS' | 'VOTE' | 'EVENT';
  readonly initialComments: CommentData[];
}

export default function Comments({ referenceId, type, initialComments }: CommentsProps) {
  const t = useTranslations('comments');
  const [comments, setComments] = useState<CommentData[]>(initialComments);
  const [expanded, setExpanded] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const latest = comments[0];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSubmitting(true);
    setError('');

    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referenceId, type, content: newComment }),
    });

    if (res.ok) {
      const comment: CommentData = await res.json();
      setComments((prev) => [comment, ...prev]);
      setNewComment('');
    } else {
      setError(t('error.saveFailed'));
    }
    setSubmitting(false);
  }

  async function handleDelete(commentId: number) {
    const res = await fetch(`/api/comments/${commentId}`, { method: 'DELETE' });
    if (res.ok) {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    }
  }

  return (
    <div className="mt-3 rounded-lg p-2" style={{ background: '#f0f0f0' }}>
      {/* Collapsed header — always visible */}
      <CommentsToggleButton
        expanded={expanded}
        count={comments.length}
        latestAuthorName={latest?.author.nickname}
        latestCreatedAt={latest?.createdAt}
        latestContent={latest?.content}
        onClick={() => setExpanded((v) => !v)}
      />

      {/* Expanded content */}
      {expanded && (
        <div className="mt-2 space-y-3">
          {comments.length === 0 && (
            <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.35)', fontStyle: 'italic' }}>{t('noComments')}</p>
          )}

          {comments.map((comment) => (
            <div key={comment.id} className="rounded p-2.5 text-sm" style={{ background: 'rgba(0,0,0,0.06)' }}>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-1.5">
                  {comment.author.pic && comment.author.pic !== 'none' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={comment.author.pic}
                      alt=""
                      style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                    />
                  ) : (
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--kn-primary, #005982)', opacity: 0.35, flexShrink: 0 }} />
                  )}
                  <span className="font-medium text-gray-800">{comment.author.nickname}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-xs">
                    {new Date(comment.createdAt).toLocaleDateString('de-DE')}{' '}
                    {new Date(comment.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {comment.isOwn && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(comment.id)}
                      className="h-6 w-6 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-gray-700 mt-1 whitespace-pre-wrap">{comment.content}</p>
            </div>
          ))}

          <form onSubmit={handleSubmit} className="space-y-2">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={t('placeholder')}
              rows={2}
              className="text-sm"
              style={{ background: '#ffffff' }}
            />
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <Button
              type="submit"
              size="sm"
              disabled={submitting || !newComment.trim()}
              style={{ background: 'var(--kn-primary, #005982)' }}
              className="text-white"
            >
              <Send size={13} />
              {t('submit')}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
