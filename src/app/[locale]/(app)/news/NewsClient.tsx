'use client';

import { useState, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import RichTextEditor from '@/components/RichTextEditor';
import Comments, { type CommentData } from '@/components/Comments';
import { Plus, Pencil, Trash2, Save, X, Lock, ChevronLeft, ChevronRight } from 'lucide-react';

interface NewsItem {
  id: number;
  title: string;
  content: string;
  internal: boolean;
  createdAt: string;
  updatedAt: string;
  editorIds: string;
  author: { id: number; nickname: string };
  comments: (CommentData & { isOwn?: boolean })[];
}

interface NewsClientProps {
  initialItems: NewsItem[];
  initialTotal: number;
  pageSize: number;
  currentMemberId: number;
  isAdmin: boolean;
}

export default function NewsClient({
  initialItems,
  initialTotal,
  pageSize,
  currentMemberId,
  isAdmin,
}: NewsClientProps) {
  const t = useTranslations('news');
  const tc = useTranslations('common');
  const locale = useLocale();

  const [items, setItems] = useState<NewsItem[]>(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [internal, setInternal] = useState(false);
  const [sendNotification, setSendNotification] = useState(false);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchPage = useCallback(async (newOffset: number) => {
    setLoading(true);
    const res = await fetch(`/api/news?offset=${newOffset}`);
    if (res.ok) {
      const data = await res.json();
      setItems(data.items.map((item: NewsItem) => ({
        ...item,
        comments: item.comments.map((c) => ({ ...c, isOwn: c.author.nickname === '' })),
      })));
      setTotal(data.total);
      setOffset(newOffset);
    }
    setLoading(false);
  }, []);

  function openCreate() {
    setEditingId(null);
    setTitle('');
    setContent('');
    setInternal(false);
    setSendNotification(false);
    setFormError('');
    setFormOpen(true);
  }

  function openEdit(item: NewsItem) {
    setEditingId(item.id);
    setTitle(item.title);
    setContent(item.content);
    setInternal(item.internal);
    setSendNotification(false);
    setFormError('');
    setFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    const body = { title, content, internal, sendNotification };
    const res = editingId
      ? await fetch(`/api/news/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      : await fetch('/api/news', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

    if (res.ok) {
      setFormOpen(false);
      await fetchPage(0);
    } else {
      const data = await res.json();
      setFormError(data.error || t('error.saveFailed'));
    }
    setFormLoading(false);
  }

  async function handleDelete(id: number) {
    if (!confirm(t('deleteConfirm'))) return;
    await fetch(`/api/news/${id}`, { method: 'DELETE' });
    await fetchPage(offset);
  }

  const totalPages = Math.ceil(total / pageSize);
  const currentPage = Math.floor(offset / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Button onClick={openCreate} style={{ background: 'var(--kn-primary, #005982)' }} className="text-white">
          <Plus size={15} />
          {t('newPost')}
        </Button>
      </div>

      {/* Create/Edit Form */}
      {formOpen && (
        <div className="border rounded-lg p-4 space-y-4 bg-gray-50">
          <h2 className="font-semibold">{editingId ? t('editPost') : t('newPost')}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && <p className="text-red-500 text-sm">{formError}</p>}
            <div className="space-y-1">
              <Label>{t('postTitle')}</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>{t('postContent')}</Label>
              <RichTextEditor value={content} onChange={setContent} />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={internal}
                onChange={(e) => setInternal(e.target.checked)}
                className="rounded"
              />
              {t('internalOnly')}
            </label>
            {!editingId && (
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendNotification}
                  onChange={(e) => setSendNotification(e.target.checked)}
                  className="rounded"
                />
                {t('sendEmail')}
              </label>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={formLoading} style={{ background: 'var(--kn-primary, #005982)' }} className="text-white">
                <Save size={15} />
                {editingId ? t('update') : t('submit')}
              </Button>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                <X size={15} />
                {tc('cancel')}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* News list */}
      {loading ? (
        <p className="text-gray-500 text-sm">{tc('loading')}</p>
      ) : (
        <div className="space-y-6">
          {items.map((item, idx) => (
            <div key={item.id} className="space-y-2">
              {idx > 0 && <hr />}
              <div>
                <Link href={`/${locale}/news/${item.id}`} className="hover:underline">
                  <h2 className="text-lg font-semibold">{item.title}</h2>
                </Link>
                <div
                  className="prose prose-sm max-w-none mt-2"
                  dangerouslySetInnerHTML={{ __html: item.content }}
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    {t('postedBy')} {item.author.nickname}
                    {item.internal && (
                      <Lock size={12} className="text-orange-500 ml-1" />
                    )}
                  </span>
                  <div className="flex gap-2">
                    {(isAdmin || item.author.id === currentMemberId) && (
                      <Button size="sm" variant="outline" onClick={() => openEdit(item)}>
                        <Pencil size={13} />
                        {tc('edit')}
                      </Button>
                    )}
                    {(isAdmin || item.author.id === currentMemberId) && (
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(item.id)}>
                        <Trash2 size={13} />
                        {tc('delete')}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <Comments
                referenceId={item.id}
                type="NEWS"
                initialComments={item.comments.map((c) => ({
                  ...c,
                  isOwn: (c as { authorId?: number }).authorId === currentMemberId,
                }))}
              />
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2 justify-center mt-4 flex-wrap">
          <Button variant="outline" size="sm" disabled={currentPage === 0}
            onClick={() => fetchPage(Math.max(0, offset - pageSize))}>
            <ChevronLeft size={15} />
          </Button>
          {Array.from({ length: totalPages }, (_, i) => (
            <Button key={i} variant={i === currentPage ? 'default' : 'outline'} size="sm"
              onClick={() => fetchPage(i * pageSize)}>
              {i + 1}
            </Button>
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
