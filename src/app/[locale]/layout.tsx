import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { getCurrentMember } from '@/lib/auth';
import { buildThemeVars } from '@/lib/theme';
import '../globals.css';

export const metadata: Metadata = {
  title: 'KegelNetzwerk',
  description: 'Bowling club management platform',
};

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as 'de' | 'en')) {
    notFound();
  }

  const messages = await getMessages();
  const member = await getCurrentMember();

  // Build theme CSS variables from the logged-in member's club
  const themeVars = member?.club
    ? buildThemeVars(member.club)
    : {};

  return (
    <html lang={locale}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ fontFamily: "'Open Sans', sans-serif", ...themeVars as React.CSSProperties }}>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
