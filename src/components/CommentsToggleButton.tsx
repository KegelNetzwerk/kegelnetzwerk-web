'use client';

import { useTranslations } from 'next-intl';
import { MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';

interface CommentsToggleButtonProps {
  readonly expanded: boolean;
  readonly count: number;
  readonly latestAuthorName?: string;
  readonly latestCreatedAt?: string;
  readonly latestContent?: string;
  readonly onClick: () => void;
}

export default function CommentsToggleButton({
  expanded, count, latestAuthorName, latestCreatedAt, latestContent, onClick,
}: CommentsToggleButtonProps) {
  const t = useTranslations('comments');

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 w-full text-left cursor-pointer"
      style={{ background: 'none', border: 'none', padding: '4px 0' }}
    >
      <MessageSquare size={13} style={{ color: 'rgba(0,0,0,0.4)', flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.5)', fontWeight: 600 }}>
        {t('title')} ({count})
      </span>
      {!expanded && latestAuthorName && latestCreatedAt && latestContent && (
        <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)', marginLeft: 4, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {'— '}{latestAuthorName},{' '}
          {new Date(latestCreatedAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })}
          {': '}
          <span style={{ fontStyle: 'italic' }}>{latestContent.slice(0, 60)}{latestContent.length > 60 ? '…' : ''}</span>
        </span>
      )}
      {!expanded && count === 0 && (
        <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.3)', marginLeft: 4 }}>
          {'— '}{t('noComments')}
        </span>
      )}
      <span style={{ marginLeft: 'auto', color: 'rgba(0,0,0,0.3)', flexShrink: 0 }}>
        {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </span>
    </button>
  );
}
