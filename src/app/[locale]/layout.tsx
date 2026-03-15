import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { getCurrentMember } from '@/lib/auth';
import { buildThemeVars } from '@/lib/theme';
import { Toaster } from '@/components/ui/sonner';
import '../globals.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

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
    <html lang={locale} className={dmSans.variable}>
      <body style={themeVars as React.CSSProperties}>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
