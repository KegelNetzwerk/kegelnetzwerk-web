'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import Image from 'next/image';
import { Save } from 'lucide-react';

interface ProfileData {
  id: number;
  nickname: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthday: string | null;
  pic: string;
}

export default function ProfileClient({ member }: { member: ProfileData }) {
  const t = useTranslations('profile');
  const tCommon = useTranslations('common');

  const [nickname, setNickname] = useState(member.nickname);
  const [firstName, setFirstName] = useState(member.firstName);
  const [lastName, setLastName] = useState(member.lastName);
  const [email, setEmail] = useState(member.email);
  const [phone, setPhone] = useState(member.phone);
  const [birthday, setBirthday] = useState(
    member.birthday ? new Date(member.birthday).toISOString().split('T')[0] : ''
  );
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password && password !== confirmPassword) {
      toast.error(t('error.passwordMismatch'));
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('nickname', nickname);
      formData.append('firstName', firstName);
      formData.append('lastName', lastName);
      formData.append('email', email);
      formData.append('phone', phone);
      formData.append('birthday', birthday);
      formData.append('password', password);
      if (avatarFile) formData.append('avatar', avatarFile);

      const res = await fetch('/api/profile', { method: 'PUT', body: formData });
      if (!res.ok) {
        const data = await res.json();
        const knownErrors = ['nicknameTaken', 'emailTaken', 'passwordMismatch', 'nicknameRequired'];
        toast.error(knownErrors.includes(data.error) ? t(`error.${data.error}`) : tCommon('unknownError'));
        return;
      }
      toast.success(t('success'));
      setPassword('');
      setConfirmPassword('');
    } finally {
      setSaving(false);
    }
  }

  const currentPic = avatarPreview ?? (member.pic !== 'none' ? member.pic : null);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      <form onSubmit={handleSubmit} className="max-w-lg space-y-5">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          {currentPic ? (
            <div className="relative h-16 w-16 overflow-hidden rounded-full border">
              <Image src={currentPic} alt={nickname} fill className="object-cover" />
            </div>
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full border bg-muted text-xl font-semibold text-muted-foreground">
              {nickname.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="space-y-1">
            <Label>{t('avatar')}</Label>
            <Input type="file" accept="image/*" onChange={handleAvatarChange} />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="nickname">{t('nickname')}</Label>
          <Input
            id="nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="firstName">{t('firstName')}</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="lastName">{t('lastName')}</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="birthday">
            {t('birthday')} <span className="text-muted-foreground text-xs">{t('birthdayFormat')}</span>
          </Label>
          <Input
            id="birthday"
            type="date"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="email">{t('email')}</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="phone">{t('phone')}</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="password">{t('password')}</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('passwordHint')}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        <Button
          type="submit"
          disabled={saving}
          style={{ background: 'var(--kn-primary, #005982)' }}
          className="text-white"
        >
          <Save size={15} />
          {saving ? tCommon('loading') : tCommon('save')}
        </Button>
      </form>
    </div>
  );
}
