'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Turnstile } from '@marsidev/react-turnstile';
import type { TurnstileInstance } from '@marsidev/react-turnstile';
import { toast } from 'sonner';

export default function PasswordResetForm() {
  const t = useTranslations('auth.passwordReset');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!captchaToken) return;
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const res = await fetch('/api/auth/password-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: formData.get('email'), captchaToken }),
    });
    if (!res.ok) {
      const data = await res.json();
      if (data.error === 'captchaFailed') {
        toast.error(t('error.captchaFailed'));
        turnstileRef.current?.reset();
        setCaptchaToken(null);
        setLoading(false);
        return;
      }
    }
    // Always show the same message to avoid user enumeration
    setSubmitted(true);
    setLoading(false);
  }

  if (submitted) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-gray-700">{t('emailSent')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle>{t('title')}</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t('email')}</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <Turnstile
            ref={turnstileRef}
            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
            onSuccess={setCaptchaToken}
            onExpire={() => setCaptchaToken(null)}
            onError={() => setCaptchaToken(null)}
          />
          <Button type="submit" className="w-full" disabled={loading || !captchaToken}>
            {loading ? '...' : t('submit')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
