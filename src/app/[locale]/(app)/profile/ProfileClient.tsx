'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import Image from 'next/image';
import Link from 'next/link';
import { Save, KeyRound, Eye, Gift } from 'lucide-react';

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

interface SantaRow {
  year: number;
  receiverNickname: string | null;
  receiverPic: string | null;
}

const LOCALES = [
  { value: 'de', label: 'Deutsch' },
  { value: 'en', label: 'English' },
];

export default function ProfileClient({ member, santaRows }: { member: ProfileData; santaRows: SantaRow[] }) {
  const t = useTranslations('profile');
  const tSanta = useTranslations('secretSanta');
  const tCommon = useTranslations('common');
  const currentYear = new Date().getFullYear();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const [nickname, setNickname] = useState(member.nickname);
  const [firstName, setFirstName] = useState(member.firstName);
  const [lastName, setLastName] = useState(member.lastName);
  const [email, setEmail] = useState(member.email);
  const [phone, setPhone] = useState(member.phone);
  const [birthday, setBirthday] = useState(
    member.birthday ? new Date(member.birthday).toISOString().split('T')[0] : ''
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  function changeLocale(newLocale: string) {
    if (newLocale === locale) return;
    // pathname includes the locale prefix, e.g. /de/profile → /en/profile
    const newPath = '/' + newLocale + pathname.slice(1 + locale.length);
    router.push(newPath);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('nickname', nickname);
      formData.append('firstName', firstName);
      formData.append('lastName', lastName);
      formData.append('email', email);
      formData.append('phone', phone);
      formData.append('birthday', birthday);
      if (avatarFile) formData.append('avatar', avatarFile);

      const res = await fetch('/api/profile', { method: 'PUT', body: formData });
      if (!res.ok) {
        const data = await res.json();
        const knownErrors = ['nicknameTaken', 'emailTaken', 'nicknameRequired'];
        toast.error(knownErrors.includes(data.error) ? t(`error.${data.error}`) : tCommon('unknownError'));
        return;
      }
      toast.success(t('success'));
    } finally {
      setSaving(false);
    }
  }

  const currentPic = avatarPreview ?? (member.pic !== 'none' ? member.pic : null);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      <div className="flex gap-0 items-start divide-x">
      <form onSubmit={handleSubmit} className="flex-1 space-y-5 pr-8">
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          <Label htmlFor="language">{t('language')}</Label>
          <select
            id="language"
            value={locale}
            onChange={(e) => changeLocale(e.target.value)}
            className="border rounded px-3 py-2 text-sm w-full"
          >
            {LOCALES.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
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

      <div className="flex flex-col gap-2 pt-1 pl-8">
        <Link
          href={`/${locale}/members/${member.id}?preview=guest`}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <Eye size={15} />
          {t('viewPublicProfile')}
        </Link>
        <Link
          href={`/${locale}/profile/password`}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <KeyRound size={15} />
          {t('changePasswordLink')}
        </Link>

        {/* Secret Santa history */}
        <div className="mt-4 rounded-lg border bg-muted/30 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Gift size={15} />
            {tSanta('historyTitle')}
          </h2>
          {santaRows.length === 0 ? (
            <p className="text-xs text-muted-foreground">{tSanta('noRoundsYet')}</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="pb-1 text-left font-medium">{tSanta('year')}</th>
                  <th className="pb-1 text-left font-medium">{tSanta('partnerLabel')}</th>
                </tr>
              </thead>
              <tbody>
                {santaRows.map((h) => {
                  const hasPic = h.receiverPic && h.receiverPic !== 'none';
                  return (
                    <tr key={h.year} className={`border-t${h.year === currentYear ? ' font-semibold' : ''}`}>
                      <td className="py-1 pr-4">{h.year}</td>
                      <td className="py-1">
                        {h.receiverNickname ? (
                          <span className="flex items-center gap-2">
                            {hasPic ? (
                              <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full border">
                                <Image src={h.receiverPic!} alt={h.receiverNickname} fill className="object-cover" />
                              </div>
                            ) : (
                              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border bg-muted text-xs font-semibold text-muted-foreground">
                                {h.receiverNickname.charAt(0).toUpperCase()}
                              </div>
                            )}
                            {h.receiverNickname}
                          </span>
                        ) : (
                          <span className="font-normal text-muted-foreground italic">{tSanta('notParticipated')}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
