'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Trash2, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import RichTextEditor from '@/components/RichTextEditor';
import { Turnstile } from '@marsidev/react-turnstile';
import type { TurnstileInstance } from '@marsidev/react-turnstile';

function AuthorBadge({ clubName, clubColor, guestLabel }: { clubName: string | null; clubColor: string | null; guestLabel: string }) {
  if (clubName === null) {
    return (
      <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 999, background: '#e5e5e5', color: '#666', fontWeight: 600, whiteSpace: 'nowrap', border: '1px solid #bbb' }}>
        {guestLabel}
      </span>
    );
  }
  return (
    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 999, background: `#${clubColor ?? '3089AC'}`, color: '#fff', fontWeight: 600, whiteSpace: 'nowrap' }}>
      {clubName}
    </span>
  );
}
export interface ClubCommentData {
  id: number;
  content: string;
  createdAt: string;
  authorName: string;
  authorPic: string | null;
  canDelete: boolean;
  /** null = guest; string = club name of the author */
  authorClubName: string | null;
  /** hex without '#', e.g. '3089AC' — only set when authorClubName is set */
  authorClubColor: string | null;
}

interface ClubCommentsProps {
  readonly clubId: number;
  readonly initialComments: ClubCommentData[];
  readonly isLoggedIn: boolean;
}

export default function ClubComments({
  clubId,
  initialComments,
  isLoggedIn,
}: ClubCommentsProps) {
  const t = useTranslations('comments');
  const tCommon = useTranslations('common');
  const [comments, setComments] = useState<ClubCommentData[]>(initialComments);
  const [expanded, setExpanded] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [guestName, setGuestName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);

  const latest = comments[0];
  const commentIsEmpty = !newComment.replace(/<[^>]+>/g, '').trim();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (commentIsEmpty) return;
    if (!isLoggedIn && !guestName.trim()) return;

    setSubmitting(true);
    const res = await fetch('/api/club-comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clubId,
        content: newComment,
        guestName: isLoggedIn ? undefined : guestName,
        captchaToken: isLoggedIn ? undefined : captchaToken,
      }),
    });

    if (res.ok) {
      const comment: ClubCommentData = await res.json();
      setComments((prev) => [comment, ...prev]);
      setNewComment('');
      if (!isLoggedIn) {
        setGuestName('');
        setCaptchaToken(null);
        turnstileRef.current?.reset();
      }
    } else {
      const data = await res.json();
      if (data.error === 'captchaFailed') {
        toast.error(t('error.captchaFailed'));
        turnstileRef.current?.reset();
        setCaptchaToken(null);
      } else {
        toast.error(tCommon('unknownError'));
      }
    }
    setSubmitting(false);
  }

  async function handleDelete(commentId: number) {
    const res = await fetch(`/api/club-comments/${commentId}`, { method: 'DELETE' });
    if (res.ok) {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    }
  }

  return (
    <div className="rounded-lg p-2" style={{ background: '#f0f0f0' }}>
      {/* Collapsed header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 w-full text-left cursor-pointer"
        style={{ background: 'none', border: 'none', padding: '4px 0' }}
      >
        <MessageSquare size={13} style={{ color: 'rgba(0,0,0,0.4)', flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.5)', fontWeight: 600 }}>
          {t('title')} ({comments.length})
        </span>
        {!expanded && latest && (
          <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)', marginLeft: 4, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            — {latest.authorName},{' '}
            {new Date(latest.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })}
            {': '}
            <span style={{ fontStyle: 'italic' }}>{latest.content.slice(0, 60)}{latest.content.length > 60 ? '…' : ''}</span>
          </span>
        )}
        {!expanded && comments.length === 0 && (
          <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.3)', marginLeft: 4 }}>
            — {t('noComments')}
          </span>
        )}
        <span style={{ marginLeft: 'auto', color: 'rgba(0,0,0,0.3)', flexShrink: 0 }}>
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </span>
      </button>

      {expanded && (
        <div className="mt-2 space-y-3">
          {comments.length === 0 && (
            <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.35)', fontStyle: 'italic' }}>{t('noComments')}</p>
          )}

          {comments.map((comment) => (
            <div key={comment.id} className="rounded p-2.5 text-sm" style={{ background: 'rgba(0,0,0,0.06)' }}>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-1.5">
                  {comment.authorPic && comment.authorPic !== 'none' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={comment.authorPic}
                      alt=""
                      style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                    />
                  ) : (
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--kn-primary, #005982)', opacity: 0.35, flexShrink: 0 }} />
                  )}
                  <span className="font-medium text-gray-800">{comment.authorName}</span>
                  <AuthorBadge clubName={comment.authorClubName} clubColor={comment.authorClubColor} guestLabel={t('guest')} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-xs">
                    {new Date(comment.createdAt).toLocaleDateString('de-DE')}{' '}
                    {new Date(comment.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {comment.canDelete && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(comment.id)}
                      className="h-6 w-6 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                      title={tCommon('delete')}
                    >
                      <Trash2 size={12} />
                    </Button>
                  )}
                </div>
              </div>
              <div className="text-gray-700 mt-1 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: comment.content }} />
            </div>
          ))}

          <form onSubmit={handleSubmit} className="space-y-2">
            {!isLoggedIn && (
              <>
                <Input
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder={t('guestNamePlaceholder')}
                  className="text-sm bg-white"
                  required
                />
                <Turnstile
                  ref={turnstileRef}
                  siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
                  onSuccess={setCaptchaToken}
                  onExpire={() => setCaptchaToken(null)}
                  onError={() => setCaptchaToken(null)}
                />
              </>
            )}
            <RichTextEditor
              value={newComment}
              onChange={setNewComment}
              placeholder={t('placeholder')}
              minHeight="60px"
            />
            <Button
              type="submit"
              size="sm"
              disabled={submitting || commentIsEmpty || (!isLoggedIn && (!guestName.trim() || !captchaToken))}
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
