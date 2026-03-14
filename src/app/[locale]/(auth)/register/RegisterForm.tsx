'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function RegisterForm() {
  const t = useTranslations('auth.register');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (password !== confirmPassword) {
      setError(t('error.passwordMismatch'));
      setLoading(false);
      return;
    }

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clubName: formData.get('clubName'),
        nickname: formData.get('nickname'),
        email: formData.get('email'),
        password,
        inviteCode: formData.get('inviteCode'),
      }),
    });

    if (res.ok) {
      setSuccess(true);
    } else {
      const data = await res.json();
      setError(data.error || t('error.required'));
      setLoading(false);
    }
  }

  if (success) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-green-600">{t('success')}</p>
          <Link href="/login" className="text-blue-600 hover:underline text-sm mt-2 block">
            {t('alreadyHaveAccount')}
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="space-y-2">
            <Label htmlFor="clubName">{t('clubName')}</Label>
            <Input id="clubName" name="clubName" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nickname">{t('nickname')}</Label>
            <Input id="nickname" name="nickname" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t('email')}</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t('password')}</Label>
            <Input id="password" name="password" type="password" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
            <Input id="confirmPassword" name="confirmPassword" type="password" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inviteCode">{t('inviteCode')}</Label>
            <Input id="inviteCode" name="inviteCode" required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? '...' : t('submit')}
          </Button>
          <div className="text-sm text-center">
            <span className="text-gray-500">{t('alreadyHaveAccount')} </span>
            <Link href="/login" className="text-blue-600 hover:underline">{t('alreadyHaveAccount')}</Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
