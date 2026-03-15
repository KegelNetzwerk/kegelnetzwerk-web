'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { BG1_IMAGES, BG2_STYLES, getBg2Value } from '@/lib/theme';
import { Save, Trash2 } from 'lucide-react';

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

type SaveStatus = 'idle' | 'saving' | 'success' | 'error';

export default function SettingsClient({ club }: { club: ClubSettings }) {
  const t = useTranslations('clubSettings');

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
  const [status, setStatus] = useState<SaveStatus>('idle');

  function applyThemeToPage(opts: {
    farbe1: string; farbe2: string; farbe3: string;
    bg1: number; bg2: number; bgColor: string;
  }) {
    const root = document.body;
    root.style.setProperty('--kn-primary', opts.farbe1);
    root.style.setProperty('--kn-secondary', opts.farbe2);
    root.style.setProperty('--kn-accent', opts.farbe3);
    root.style.setProperty('--color-primary', opts.farbe1);
    root.style.setProperty('--color-secondary', opts.farbe2);
    root.style.setProperty('--color-accent', opts.farbe3);
    root.style.setProperty('--kn-bg1-url', `url('${BG1_IMAGES[opts.bg1] ?? BG1_IMAGES[0]}')`);
    root.style.setProperty('--kn-bg2', getBg2Value(opts.bg2, opts.bgColor.replace('#', '')));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('saving');
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
        setStatus('error');
        setTimeout(() => setStatus('idle'), 3000);
        return;
      }
      const updated = await res.json();
      setCurrentLogo(updated.pic);
      setCurrentHeader(updated.header);
      setDeleteLogo(false);
      setDeleteHeader(false);
      setLogoFile(null);
      setHeaderFile(null);

      applyThemeToPage({ farbe1, farbe2, farbe3, bg1, bg2, bgColor });
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  }

  const BG2_LABELS = [t('bg2Option0'), t('bg2Option1'), t('bg2Option2'), t('bg2Option3')];

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
                  <Trash2 size={13} />
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
                  <Trash2 size={13} />
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

        {/* Outer background (bg1) */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{t('background')}</h2>
          <p className="text-sm text-gray-500">{t('backgroundHint')}</p>
          <div className="flex flex-wrap gap-3">
            {BG1_IMAGES.map((src, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setBg1(i)}
                className="overflow-hidden rounded-lg transition-all"
                style={{
                  width: 130,
                  height: 80,
                  position: 'relative',
                  outline: bg1 === i ? '3px solid var(--kn-primary, #005982)' : '2px solid transparent',
                  outlineOffset: 2,
                  boxShadow: bg1 === i ? '0 0 0 1px rgba(0,0,0,0.15)' : 'none',
                }}
                title={`${t('background')} ${i + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`Background ${i + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                <span
                  style={{
                    position: 'absolute', bottom: 4, right: 6,
                    fontSize: 11, fontWeight: 700,
                    color: '#fff',
                    textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                  }}
                >
                  {i + 1}
                </span>
                {bg1 === i && (
                  <span
                    style={{
                      position: 'absolute', top: 4, left: 4,
                      background: 'var(--kn-primary, #005982)',
                      color: '#fff', fontSize: 10, fontWeight: 700,
                      borderRadius: 4, padding: '1px 5px',
                    }}
                  >
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Inner background (bg2) */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{t('innerBackground')}</h2>
          <p className="text-sm text-gray-500">{t('innerBackgroundHint')}</p>
          <div className="flex flex-wrap gap-3">
            {BG2_LABELS.map((label, i) => {
              const previewBg = i === 3 ? bgColor : BG2_STYLES[i];
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setBg2(i)}
                  style={{
                    width: 96,
                    height: 64,
                    borderRadius: 8,
                    background: previewBg,
                    outline: bg2 === i ? '3px solid var(--kn-primary, #005982)' : '2px solid #ddd',
                    outlineOffset: 2,
                    position: 'relative',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'outline 0.15s',
                  }}
                  title={label}
                >
                  <span style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                    paddingBottom: 5, fontSize: 10, fontWeight: 600,
                    color: 'rgba(255,255,255,0.85)',
                    textShadow: '0 1px 2px rgba(0,0,0,0.7)',
                    background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 60%)',
                  }}>
                    {label}
                  </span>
                  {bg2 === i && (
                    <span style={{
                      position: 'absolute', top: 4, left: 4,
                      background: 'var(--kn-primary, #005982)',
                      color: '#fff', fontSize: 10, fontWeight: 700,
                      borderRadius: 4, padding: '1px 5px',
                    }}>
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Custom color for bg2=3 */}
          {bg2 === 3 && (
            <div className="space-y-1 max-w-xs mt-2">
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
          )}
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

        {/* Submit + status */}
        <div className="flex items-center gap-4">
          <Button
            type="submit"
            disabled={status === 'saving'}
            style={{ background: 'var(--kn-primary, #005982)' }}
            className="text-white min-w-28"
          >
            <Save size={15} />
            {status === 'saving' ? t('saving') : t('submit')}
          </Button>

          {status === 'success' && (
            <span
              className="flex items-center gap-1.5 text-sm font-medium"
              style={{ color: '#16a34a' }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" fill="#16a34a" />
                <path d="M4.5 8l2.5 2.5 4.5-5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t('successDetail')}
            </span>
          )}

          {status === 'error' && (
            <span
              className="flex items-center gap-1.5 text-sm font-medium"
              style={{ color: '#dc2626' }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" fill="#dc2626" />
                <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              {t('errorDetail')}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
