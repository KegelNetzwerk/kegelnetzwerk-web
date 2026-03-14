'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginForm() {
  const t = useTranslations('auth.login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clubName: formData.get('clubName'),
        nickname: formData.get('nickname'),
        password: formData.get('password'),
      }),
    });

    if (res.ok) {
      window.location.href = '/news';
    } else {
      const data = await res.json();
      setError(data.error || t('error.invalidCredentials'));
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
          <div className="space-y-2">
            <Label htmlFor="clubName">{t('clubName')}</Label>
            <Input id="clubName" name="clubName" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nickname">{t('nickname')}</Label>
            <Input id="nickname" name="nickname" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t('password')}</Label>
            <Input id="password" name="password" type="password" required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? '...' : t('submit')}
          </Button>
          <div className="text-sm text-center space-y-1">
            <Link href="/password-reset" className="text-blue-600 hover:underline block">
              {t('forgotPassword')}
            </Link>
            <span className="text-gray-500">{t('noAccount')} </span>
            <Link href="/register" className="text-blue-600 hover:underline">
              {t('register')}
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
