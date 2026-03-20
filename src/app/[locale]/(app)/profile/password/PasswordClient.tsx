'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import Link from 'next/link';
import { KeyRound, ArrowLeft } from 'lucide-react';

export default function PasswordClient({ profileHref }: { profileHref: string }) {
  const t = useTranslations('profile');
  const tCommon = useTranslations('common');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error(t('error.passwordMismatch'));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/profile/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json();
        const knownErrors = ['weakPassword'];
        toast.error(knownErrors.includes(data.error) ? t(`error.${data.error}`) : tCommon('unknownError'));
        return;
      }
      toast.success(t('passwordSuccess'));
      setPassword('');
      setConfirmPassword('');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={profileHref} className="text-muted-foreground hover:text-foreground cursor-pointer">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold">{t('changePasswordTitle')}</h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg space-y-5">
        <div className="space-y-1">
          <Label htmlFor="password">{t('password')}</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={4}
            className="bg-white"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="bg-white"
          />
        </div>

        <Button
          type="submit"
          disabled={saving}
          style={{ background: 'var(--kn-primary, #005982)' }}
          className="text-white"
        >
          <KeyRound size={15} />
          {saving ? tCommon('loading') : tCommon('save')}
        </Button>
      </form>
    </div>
  );
}
