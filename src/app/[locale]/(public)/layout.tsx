import { getLocale } from 'next-intl/server';
import AuthShell from '@/components/layout/AuthShell';

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <AuthShell maxWidth="max-w-4xl" logoHref={`/${locale}/`}>
      <div className="px-8 py-8">
        {children}
      </div>
    </AuthShell>
  );
}
