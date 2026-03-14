'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import Image from 'next/image';
import dynamic from 'next/dynamic';

const RichTextEditor = dynamic(() => import('@/components/RichTextEditor'), { ssr: false });

interface ClubSettings {
  name: string;
  pic: string;
  header: string;
  aboutUs: string;
  farbe1: string;
  farbe2: string;
  farbe3: string;
  mono: boolean;
  bg1: number;
  bg2: number;
  bgColor: string;
}

export default function SettingsClient({ club }: { club: ClubSettings }) {
  const t = useTranslations('clubSettings');
  const tCommon = useTranslations('common');

  const [aboutUs, setAboutUs] = useState(club.aboutUs);
  const [farbe1, setFarbe1] = useState(`#${club.farbe1}`);
  const [farbe2, setFarbe2] = useState(`#${club.farbe2}`);
  const [farbe3, setFarbe3] = useState(`#${club.farbe3}`);
  const [mono, setMono] = useState(club.mono);
  const [bg1, setBg1] = useState(club.bg1);
  const [bg2, setBg2] = useState(club.bg2);
  const [bgColor, setBgColor] = useState(`#${club.bgColor}`);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [headerFile, setHeaderFile] = useState<File | null>(null);
  const [currentLogo, setCurrentLogo] = useState(club.pic);
  const [currentHeader, setCurrentHeader] = useState(club.header);
  const [deleteLogo, setDeleteLogo] = useState(false);
  const [deleteHeader, setDeleteHeader] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('aboutUs', aboutUs);
      fd.append('farbe1', farbe1);
      fd.append('farbe2', farbe2);
      fd.append('farbe3', farbe3);
      fd.append('mono', String(mono));
      fd.append('bg1', String(bg1));
      fd.append('bg2', String(bg2));
      fd.append('bgColor', bgColor);
      fd.append('deleteLogo', String(deleteLogo));
      fd.append('deleteHeader', String(deleteHeader));
      if (logoFile) fd.append('logo', logoFile);
      if (headerFile) fd.append('header', headerFile);

      const res = await fetch('/api/club/settings', { method: 'PUT', body: fd });
      if (!res.ok) {
        toast.error(tCommon('unknownError'));
        return;
      }
      const updated = await res.json();
      setCurrentLogo(updated.pic);
      setCurrentHeader(updated.header);
      setDeleteLogo(false);
      setDeleteHeader(false);
      setLogoFile(null);
      setHeaderFile(null);
      toast.success(t('success'));

      // Apply new theme colors immediately
      const root = document.body;
      root.style.setProperty('--color-primary', farbe1);
      root.style.setProperty('--color-secondary', farbe2);
      root.style.setProperty('--color-accent', farbe3);
      root.style.setProperty('--color-bg', bgColor);
    } finally {
      setSaving(false);
    }
  }

  const BG_LABELS = ['1', '2', '3'];
  const INNER_BG_LABELS = ['1', '2', '3', '4'];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      <form onSubmit={handleSubmit} className="space-y-10 max-w-2xl">

        {/* About us */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{t('aboutUs')}</h2>
          <RichTextEditor value={aboutUs} onChange={setAboutUs} placeholder={t('aboutUs')} />
        </section>

        {/* Appearance: Logo & Header */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">{t('appearance')}</h2>

          <div className="space-y-2">
            <Label>{t('logo')}</Label>
            {!deleteLogo && currentLogo !== 'none' && (
              <div className="flex items-center gap-3">
                <div className="relative h-16 w-16 overflow-hidden rounded border">
                  <Image src={currentLogo} alt="logo" fill className="object-contain" />
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => { setDeleteLogo(true); setLogoFile(null); }}
                >
                  {t('deleteLogo')}
                </Button>
              </div>
            )}
            {(deleteLogo || currentLogo === 'none') && (
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => { setLogoFile(e.target.files?.[0] ?? null); setDeleteLogo(false); }}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label>{t('header')}</Label>
            {!deleteHeader && currentHeader !== 'none' && (
              <div className="space-y-2">
                <div className="relative h-16 w-full overflow-hidden rounded border">
                  <Image src={currentHeader} alt="header" fill className="object-cover" />
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => { setDeleteHeader(true); setHeaderFile(null); }}
                >
                  {t('deleteHeader')}
                </Button>
              </div>
            )}
            {(deleteHeader || currentHeader === 'none') && (
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => { setHeaderFile(e.target.files?.[0] ?? null); setDeleteHeader(false); }}
              />
            )}
          </div>
        </section>

        {/* Background presets */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">{t('background')}</h2>
          <div className="flex flex-wrap gap-2">
            {BG_LABELS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setBg1(i)}
                className={`h-12 w-16 rounded border-2 bg-muted text-xs font-medium transition-colors ${
                  bg1 === i ? 'border-[var(--color-primary)]' : 'border-transparent'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <h2 className="text-lg font-semibold">{t('innerBackground')}</h2>
          <div className="flex flex-wrap gap-2">
            {INNER_BG_LABELS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setBg2(i)}
                className={`h-12 w-16 rounded border-2 bg-muted text-xs font-medium transition-colors ${
                  bg2 === i ? 'border-[var(--color-primary)]' : 'border-transparent'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <div className="space-y-1 max-w-xs">
            <Label htmlFor="bgColor">{t('customColor')}</Label>
            <div className="flex items-center gap-2">
              <input
                id="bgColor"
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="h-9 w-14 cursor-pointer rounded border p-1"
              />
              <span className="text-sm font-mono">{bgColor}</span>
            </div>
          </div>
        </section>

        {/* Color scheme */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">{t('colors')}</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="farbe1">{t('color1')}</Label>
              <div className="flex items-center gap-2">
                <input
                  id="farbe1"
                  type="color"
                  value={farbe1}
                  onChange={(e) => setFarbe1(e.target.value)}
                  className="h-9 w-14 cursor-pointer rounded border p-1"
                />
                <span className="text-sm font-mono">{farbe1}</span>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="farbe2">{t('color2')}</Label>
              <div className="flex items-center gap-2">
                <input
                  id="farbe2"
                  type="color"
                  value={farbe2}
                  onChange={(e) => setFarbe2(e.target.value)}
                  className="h-9 w-14 cursor-pointer rounded border p-1"
                />
                <span className="text-sm font-mono">{farbe2}</span>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="farbe3">{t('accentColor')}</Label>
              <div className="flex items-center gap-2">
                <input
                  id="farbe3"
                  type="color"
                  value={farbe3}
                  onChange={(e) => setFarbe3(e.target.value)}
                  className="h-9 w-14 cursor-pointer rounded border p-1"
                />
                <span className="text-sm font-mono">{farbe3}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="mono"
              checked={mono}
              onChange={(e) => setMono(e.target.checked)}
            />
            <label htmlFor="mono" className="text-sm">{t('monoMode')}</label>
          </div>
        </section>

        <Button
          type="submit"
          disabled={saving}
          style={{ background: 'var(--color-primary)' }}
          className="text-white"
        >
          {saving ? tCommon('loading') : t('submit')}
        </Button>
      </form>
    </div>
  );
}
