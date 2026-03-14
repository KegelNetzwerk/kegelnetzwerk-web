'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import Image from 'next/image';

interface MemberRow {
  id: number;
  nickname: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthday: string | null;
  role: 'MEMBER' | 'ADMIN';
  pic: string;
}

interface MembersClientProps {
  initialMembers: MemberRow[];
  currentMemberId: number;
}

const EMPTY_FORM = {
  nickname: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  birthday: '',
  password: '',
  role: 'MEMBER' as 'MEMBER' | 'ADMIN',
  sendInvite: false,
};

export default function MembersClient({ initialMembers, currentMemberId }: MembersClientProps) {
  const t = useTranslations('memberManagement');
  const tCommon = useTranslations('common');

  const [members, setMembers] = useState<MemberRow[]>(initialMembers);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setAvatarFile(null);
    setShowForm(true);
  }

  function openEdit(m: MemberRow) {
    setEditingId(m.id);
    setForm({
      nickname: m.nickname,
      firstName: m.firstName,
      lastName: m.lastName,
      email: m.email,
      phone: m.phone,
      birthday: m.birthday ? new Date(m.birthday).toISOString().split('T')[0] : '',
      password: '',
      role: m.role,
      sendInvite: false,
    });
    setAvatarFile(null);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
      if (avatarFile) fd.append('avatar', avatarFile);

      const url = editingId ? `/api/members/${editingId}` : '/api/members';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, body: fd });

      if (!res.ok) {
        const data = await res.json();
        toast.error(t(`error.${data.error}`) || tCommon('unknownError'));
        return;
      }

      const saved: MemberRow = await res.json();
      if (editingId) {
        setMembers((prev) => prev.map((m) => (m.id === editingId ? saved : m)));
        toast.success(t('updateSuccess'));
      } else {
        setMembers((prev) => [...prev, saved].sort((a, b) => a.nickname.localeCompare(b.nickname)));
        toast.success(t('createSuccess'));
      }
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm(t('deleteConfirm'))) return;
    const res = await fetch(`/api/members/${id}`, { method: 'DELETE' });
    if (!res.ok) { toast.error(tCommon('unknownError')); return; }
    setMembers((prev) => prev.filter((m) => m.id !== id));
    toast.success(t('deleteSuccess'));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Button
          onClick={openCreate}
          style={{ background: 'var(--color-primary)' }}
          className="text-white"
        >
          {t('newMember')}
        </Button>
      </div>

      {/* Inline form */}
      {showForm && (
        <div className="rounded-lg border p-5 space-y-4">
          <h2 className="font-semibold">{editingId ? t('editMember') : t('newMember')}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>{t('nickname')} *</Label>
              <Input
                value={form.nickname}
                onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1">
              <Label>{t('email')}</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <Label>{t('firstName')}</Label>
              <Input
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <Label>{t('lastName')}</Label>
              <Input
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <Label>
                {t('birthday')} <span className="text-muted-foreground text-xs">{t('birthdayFormat')}</span>
              </Label>
              <Input
                type="date"
                value={form.birthday}
                onChange={(e) => setForm({ ...form, birthday: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <Label>{t('password')}{!editingId && ' *'}</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required={!editingId}
              />
            </div>

            <div className="space-y-1">
              <Label>{t('role')}</Label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as 'MEMBER' | 'ADMIN' })}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="MEMBER">{t('roleMember')}</option>
                <option value="ADMIN">{t('roleAdmin')}</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label>{t('avatar')}</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
              />
            </div>

            {!editingId && (
              <div className="col-span-full flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sendInvite"
                  checked={form.sendInvite}
                  onChange={(e) => setForm({ ...form, sendInvite: e.target.checked })}
                />
                <label htmlFor="sendInvite" className="text-sm">{t('sendInvite')}</label>
              </div>
            )}

            <div className="col-span-full flex gap-2">
              <Button
                type="submit"
                disabled={saving}
                style={{ background: 'var(--color-primary)' }}
                className="text-white"
              >
                {saving
                  ? tCommon('loading')
                  : editingId
                  ? t('submitEdit')
                  : t('submitAdd')}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                {tCommon('cancel')}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Members table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-2 text-left font-medium">{t('nickname')}</th>
              <th className="px-4 py-2 text-left font-medium">{t('firstName')}</th>
              <th className="px-4 py-2 text-left font-medium">{t('lastName')}</th>
              <th className="px-4 py-2 text-left font-medium">{t('email')}</th>
              <th className="px-4 py-2 text-left font-medium">{t('role')}</th>
              <th className="px-4 py-2 text-left font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-t hover:bg-muted/50">
                <td className="px-4 py-2 flex items-center gap-2">
                  {m.pic && m.pic !== 'none' ? (
                    <div className="relative h-8 w-8 overflow-hidden rounded-full border">
                      <Image src={m.pic} alt={m.nickname} fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                      {m.nickname.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {m.nickname}
                </td>
                <td className="px-4 py-2">{m.firstName || '—'}</td>
                <td className="px-4 py-2">{m.lastName || '—'}</td>
                <td className="px-4 py-2">{m.email || '—'}</td>
                <td className="px-4 py-2">{m.role === 'ADMIN' ? t('roleAdmin') : t('roleMember')}</td>
                <td className="px-4 py-2">
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(m)}>
                      {tCommon('edit')}
                    </Button>
                    {m.id !== currentMemberId && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(m.id)}
                      >
                        {tCommon('delete')}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
