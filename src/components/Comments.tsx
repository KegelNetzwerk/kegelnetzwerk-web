'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Trash2 } from 'lucide-react';

export interface CommentData {
  id: number;
  content: string;
  createdAt: string;
  author: { nickname: string };
  isOwn: boolean;
}

interface CommentsProps {
  referenceId: number;
  type: 'NEWS' | 'VOTE' | 'EVENT';
  initialComments: CommentData[];
}

export default function Comments({ referenceId, type, initialComments }: CommentsProps) {
  const t = useTranslations('comments');
  const [comments, setComments] = useState<CommentData[]>(initialComments);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

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
      setComments((prev) => [...prev, comment]);
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
    <div className="mt-4 space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">{t('title')}</h3>

      {comments.map((comment) => (
        <div key={comment.id} className="bg-gray-50 rounded p-3 text-sm">
          <div className="flex justify-between items-start">
            <span className="font-medium text-gray-800">{comment.author.nickname}</span>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs">
                {new Date(comment.createdAt).toLocaleDateString('de-DE')}
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
  );
}
